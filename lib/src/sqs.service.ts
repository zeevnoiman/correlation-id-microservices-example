import {
  CreateQueueCommand,
  CreateQueueCommandInput,
  CreateQueueCommandOutput, GetQueueAttributesCommand, GetQueueAttributesCommandInput, GetQueueAttributesCommandOutput,
  GetQueueUrlCommand,
  GetQueueUrlCommandOutput,
  ListQueuesCommand,
  ListQueuesCommandOutput,
  PurgeQueueCommand,
  SendMessageCommand,
  SendMessageCommandInput, SetQueueAttributesCommand, SetQueueAttributesCommandInput,
  SQSClient,
} from '@aws-sdk/client-sqs'
import {SqsConsumer} from "./sqsConsumer.service";


class SQSService {
  private sqs: SQSClient;
  private consumersMappings: {[queueName: string]: SqsConsumer} = {};

  constructor() {
    this.sqs = new SQSClient({
      region: 'local',
      credentials: {
         accessKeyId: 'test',
         secretAccessKey: 'test'
      },
      endpoint: 'http://localhost:9324',
    });
  }

  public async produceToOneQueue(queueName: string, data: string, isFifo?: boolean, messageGroupId?: string, deduplicationId?: string): Promise<void> {
    try {
      const queueUrl: string | undefined = await this.getQueueOrCreateIfNeeded(queueName, isFifo);
      if (!queueUrl) {
        throw new Error('Error occurred while getting or creating queue, queueUrl is undefined')
      }
      const sendMessageCommandInput: SendMessageCommandInput = this.getSendMessageCommandInputObject(queueName, data, queueUrl, isFifo, messageGroupId, deduplicationId);

      await this.sqs.send(new SendMessageCommand(sendMessageCommandInput));
    } catch (e) {
      throw e
    }
  }

  private getSendMessageCommandInputObject = (queueName: string, data: string, queueUrl: string, isFifo?: boolean, messageGroupId?: string, deduplicationId?: string): SendMessageCommandInput => {
    const sendMessageCommandInput: SendMessageCommandInput  = {
      MessageBody: data,
      QueueUrl: queueUrl,
    };

    if(isFifo) {
      return {
        ...sendMessageCommandInput,
        MessageDeduplicationId: deduplicationId || new Date().getTime().toString(),
        MessageGroupId: messageGroupId || queueName,
      }
    }

    return sendMessageCommandInput;
  }

  public async consume(queueName: string, callback: (data: string) => Promise<void>, isFifo?: boolean): Promise<void> {
    try {
      const queueUrl: string | undefined = await this.getQueueOrCreateIfNeeded(queueName, isFifo);
      if (!queueUrl) {
        throw new Error('Error occurred while getting or creating queue, queueUrl is undefined');
      }

      this.consumersMappings[queueName] = new SqsConsumer({queueUrl, handleMessage: callback, sqsClient: this.sqs, terminateVisibilityTimeout: true});
      await this.consumersMappings[queueName].consume();
    } catch (e) {
        throw e
    }
  }

  public stopConsuming(queueName: string): void {
    try {
      if (!this.consumersMappings[queueName]) {
        throw new Error(`Queue ${queueName} does not exist`);
      }
      this.consumersMappings[queueName].stop();
    } catch (e) {
      throw e
    }

  }

  public async cleanQueue(queueUrl: string): Promise<void> {
    try {
      const params = {
        QueueUrl: queueUrl
      };

      await this.sqs.send(new PurgeQueueCommand(params))
    } catch (e) {
      console.log(`Error occurred while cleaning queue`, e)
    }
  }

  private async getQueueOrCreateIfNeeded(queueName: string, isFifo?: boolean): Promise<string | undefined> {
    const queueNameWithEnv: string = `${queueName}`;
    try {
      return await this.getQueueURL(queueNameWithEnv, isFifo);
    } catch (err) {
      return await this.createQueue(queueNameWithEnv, isFifo);
    }
  }

  private async createQueue(queueName: string, isFifo: boolean = false): Promise<string | undefined> {
    try {
      if (isFifo && !queueName.endsWith('.fifo')) {
        throw new Error(`Queue name ${queueName} must end with .fifo suffix since it is a fifo queue`)
      }

      const deadLetterQueueArn: string | undefined = await this.createDeadLetterQueue(queueName, isFifo);


      const params: CreateQueueCommandInput = {
        QueueName: queueName,
        Attributes: {
          FifoQueue: isFifo ? 'true' : 'false',
          ContentBasedDeduplication: 'true',
        },
      };

      if (deadLetterQueueArn) {
        params.Attributes!.RedrivePolicy = this.getRedrivePolicy(deadLetterQueueArn);
      }

      const commandOutput: CreateQueueCommandOutput = await this.sqs.send(new CreateQueueCommand(params));
      return commandOutput.QueueUrl;
    } catch (e) {
      throw e
    }

  }

  private async createDeadLetterQueue(queueName: string, isFifo: boolean): Promise<string | undefined> {
    try {
      const deadLetterQueueName: string = `dead_letter_${queueName}`;
      const deadLetterQueueAttributes: CreateQueueCommandInput = {
        QueueName: deadLetterQueueName,
        Attributes: {
          FifoQueue: isFifo ? 'true' : 'false',
          ContentBasedDeduplication: 'true'
        },
      };

      const commandOutput: CreateQueueCommandOutput = await this.sqs.send(new CreateQueueCommand(deadLetterQueueAttributes));
      const params: GetQueueAttributesCommandInput = {
        QueueUrl: commandOutput.QueueUrl,
        AttributeNames: [
          'QueueArn'
        ]
      }
      const arnAttribute: GetQueueAttributesCommandOutput = await this.sqs.send(new GetQueueAttributesCommand(params));
      return arnAttribute.Attributes?.QueueArn;
    } catch (e) {
      throw e
    }
  }

  private async getAllQueuesUrls(): Promise<string[] | undefined> {
    try {
      const commandOutput: ListQueuesCommandOutput = await this.sqs.send(new ListQueuesCommand({}));
      return commandOutput.QueueUrls;
    } catch (e) {
      console.log(`Error occurred while listing all queues: ${e}`, {e})
    }
  }

  private async getQueueURL(queueName: string, isFifo: boolean = false): Promise<string | undefined> {
    try {
      const commandOutput: GetQueueUrlCommandOutput = await this.sqs.send(new GetQueueUrlCommand({QueueName: queueName}));
      if (commandOutput.QueueUrl) {
        await this.createDeadLetterQueueIfNeeded(commandOutput.QueueUrl, queueName, isFifo);
      }
      return commandOutput.QueueUrl
    } catch (e) {
      throw e;
    }
  }

  private async createDeadLetterQueueIfNeeded(queueUrl: string, queueName: string, isFifo: boolean): Promise<void> {
    try {
      const params: GetQueueAttributesCommandInput = {
        QueueUrl: queueUrl,
        AttributeNames: [
          'RedrivePolicy'
        ]
      }
      const arnAttribute: GetQueueAttributesCommandOutput = await this.sqs.send(new GetQueueAttributesCommand(params))
      if (!arnAttribute.Attributes?.RedrivePolicy) {
        await this.setDeadLetterQueueToExistingQueue(queueUrl, queueName, isFifo);
      }
    } catch (e) {
      throw e
    }
  }

  private async setDeadLetterQueueToExistingQueue(queueUrl: string, queueName: string, isFifo: boolean): Promise<void> {
    try {
      const deadLetterQueueArn: string | undefined = await this.createDeadLetterQueue(queueName, isFifo);

      if (deadLetterQueueArn) {
        const params: SetQueueAttributesCommandInput = {
          QueueUrl: queueUrl,
          Attributes: {
            RedrivePolicy: this.getRedrivePolicy(deadLetterQueueArn)
          }
        }
        await this.sqs.send(new SetQueueAttributesCommand(params));
      }
    } catch (e) {
      throw e
    }
  }

  private getRedrivePolicy(deadLetterQueueArn): string {
    return JSON.stringify({
      deadLetterTargetArn: deadLetterQueueArn,
      maxReceiveCount: '3'
    })
  }
}

export {SQSService}

// This service is based on https://github.com/bbc/sqs-consumer/tree/6517effaf3bede2bab7c0e619eb6cb3b78148ab5 library.
// Any bug or things to improve I suggest taking a look there first. (Created on 22/12/2021)
import {
  Message,
  SQSClient,
  ChangeMessageVisibilityCommand,
  ChangeMessageVisibilityCommandInput,
  ChangeMessageVisibilityCommandOutput,
  DeleteMessageCommand,
  DeleteMessageCommandInput,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
  ReceiveMessageCommandOutput
} from "@aws-sdk/client-sqs";

interface ITimeoutResponse {
  timeout: NodeJS.Timeout;
  pending: Promise<void>;
}

const enum consumerState {
  running,
  stopped
}

export interface IConsumerOptions {
  queueUrl: string;
  sqsClient: SQSClient;
  handleMessage: (message: string) => Promise<void>;
  attributeNames: string[];
  messageAttributeNames: string[];
  consumerState: consumerState;
  visibilityTimeout?: number;
  waitTimeSeconds: number;
  authenticationErrorTimeout: number;
  pollingWaitTimeMs: number;
  terminateVisibilityTimeout: boolean;
  heartbeatIntervalMs?: number;
  region?: string;
  handleMessageTimeout?: number;
}

export class SqsConsumer {

  private options: IConsumerOptions;

  constructor(options: Partial<IConsumerOptions>) {
    this.assertOptions(options);

    this.options = {
      queueUrl: options.queueUrl as string,
      handleMessageTimeout: options.handleMessageTimeout,
      attributeNames: options.attributeNames || [],
      messageAttributeNames: options.messageAttributeNames || [],
      consumerState: consumerState.stopped,
      visibilityTimeout: options.visibilityTimeout,
      terminateVisibilityTimeout: options.terminateVisibilityTimeout || false,
      heartbeatIntervalMs: options.heartbeatIntervalMs,
      waitTimeSeconds: options.waitTimeSeconds || 20,
      authenticationErrorTimeout: options.authenticationErrorTimeout || 10000,
      pollingWaitTimeMs: options.pollingWaitTimeMs || 0,
      sqsClient: options.sqsClient as SQSClient,
      handleMessage: options.handleMessage as (message: string) => Promise<void>,
    };
  }

  public consume = async (): Promise<void> => {
    try {
      if (this.options.consumerState === consumerState.stopped) {
        this.options.consumerState = consumerState.running;
        return this.poll();
      }
    } catch (e) {
      throw e
    }
  }

  public stop = (): void => {
    this.options.consumerState = consumerState.stopped;
  }

  private handleSqsResponse = async (response: ReceiveMessageCommandOutput): Promise<void> => {
    try {
      if (response) {
        if (this.doesResponseHasMessages(response)) {
          await Promise.all(response.Messages!.map(this.processMessage));
          return;
        }
      }
    } catch (e) {
      throw e
     }
  }

  private processMessage = async (message: Message): Promise<void> => {
    let heartbeat;
    try {
      if (this.options.heartbeatIntervalMs) {
        heartbeat = this.startHeartbeat( () => this.changeVisibilityTimeout(message, this.options.visibilityTimeout as number), this.options.heartbeatIntervalMs);
      }
      await this.executeCallbackHandler(message);
      await this.deleteMessage(message);
      clearInterval(heartbeat);
    } catch (err) {
      clearInterval(heartbeat);
      if (this.options.terminateVisibilityTimeout) {
        await this.changeVisibilityTimeout(message, 0);
      }
    }
  }

  private getMessage = async (params: ReceiveMessageCommandInput): Promise<ReceiveMessageCommandOutput> => {
    try {
      return await this.options.sqsClient.send(new ReceiveMessageCommand(params))
    } catch (err) {
      throw err
     }
  }

  private deleteMessage = async (message: Message): Promise<void> => {
    try {
      const deleteParams: DeleteMessageCommandInput = {
        QueueUrl: this.options.queueUrl,
        ReceiptHandle: message.ReceiptHandle
      };
      await this.options.sqsClient.send(new DeleteMessageCommand(deleteParams))
    } catch (err) {
      throw err
    }
  }

  private executeCallbackHandler = async (message: Message): Promise<void> => {
    let timeout;
    let pending;
    try {
      if (!message.Body) {
        return;
      }
      if (this.options.handleMessageTimeout) {
        [timeout, pending] = this.createMessageProcessingTimeout(this.options.handleMessageTimeout);
        await Promise.race([
          this.options.handleMessage(message.Body),
          pending
        ]);
      } else {
        await this.options.handleMessage(message.Body);
      }
      clearTimeout(timeout);
    } catch (err) {
      clearTimeout(timeout);
      throw err
    }
  }

  private changeVisibilityTimeout = async (message: Message, timeout: number): Promise<ChangeMessageVisibilityCommandOutput | undefined> => {
    try {
      const params: ChangeMessageVisibilityCommandInput = {
        QueueUrl: this.options.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
        VisibilityTimeout: timeout
      }
      return await this.options.sqsClient.send(new ChangeMessageVisibilityCommand(params)
        );
    } catch (err) {
      throw err
    }
  }

  private poll = async (): Promise<void> => {
    try {
      if (this.options.consumerState === consumerState.stopped) {
        return;
      }

      const receiveParams: ReceiveMessageCommandInput = {
        QueueUrl: this.options.queueUrl,
        AttributeNames: this.options.attributeNames,
        MessageAttributeNames: this.options.messageAttributeNames,
        WaitTimeSeconds: this.options.waitTimeSeconds,
        VisibilityTimeout: this.options.visibilityTimeout
      };

      const responseMessage: ReceiveMessageCommandOutput = await this.getMessage(receiveParams)
      await this.handleSqsResponse(responseMessage);
      setTimeout(this.poll, this.options.pollingWaitTimeMs);

    } catch(err) {
      if (this.isConnectionError(err)) {
        setTimeout(this.poll, this.options.authenticationErrorTimeout)
        return;
      }
      throw err
    }
  }

  private startHeartbeat = (heartbeatFn: () => void, heartbeatIntervalMs: number): NodeJS.Timeout => {
    return setInterval(heartbeatFn, heartbeatIntervalMs);
  }

  private doesResponseHasMessages = (response: ReceiveMessageCommandOutput): boolean => {
    return !!(response.Messages && response.Messages.length > 0);
  }

  private createMessageProcessingTimeout = (duration: number): ITimeoutResponse[] => {
    let timeout;
    const pending = new Promise((resolve, reject) => {
      timeout = setTimeout((): void => {
        reject(new Error(`${this.options.queueUrl} consume process has reached its time limit`));
      }, duration);
    });
    return [timeout, pending];
  }

  private isConnectionError = (err: any): boolean => {
    if (err instanceof Error){
      return (err.name === 'UnauthorizedException' || err.name === 'ResourceNotFoundException' || err.name === 'TooManyRequestsException');
    }
   return false
  }

  private assertOptions = (options: Partial<IConsumerOptions>): void => {
    const requiredOptions = [
      'queueUrl',
      'handleMessage',
      'sqsClient',
    ];

    requiredOptions.forEach((requiredOption: string) => {
      if (!options[requiredOption]) {
        throw new Error(`Missing SQS consumer option [ ${requiredOption} ] in queue ${options.queueUrl}.`);
      }
    });

    if (options.heartbeatIntervalMs && !options.visibilityTimeout) {
      throw new Error(`VisibilityTimeout must be set if heartbeatInterval was set in queue ${options.queueUrl}.`);
    }

    if (options.heartbeatIntervalMs && options.visibilityTimeout && !(options.heartbeatIntervalMs < options.visibilityTimeout)) {
      throw new Error(`HeartbeatInterval must be less than visibilityTimeout in queue ${options.queueUrl}.`);
    }
  }
}

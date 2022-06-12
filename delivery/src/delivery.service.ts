import {SQSService} from "../../lib/src/sqs.service";
import {logger} from "../../lib/src/logger";


const sqsService = new SQSService(logger)

export const startConsumingDeliveryQueue = async () => {
  await sqsService.consume('delivery.fifo', async (data) => {
    logger(data)
  })
}

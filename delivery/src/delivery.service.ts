import {SQSService} from "../../lib/src/sqs.service";


const sqsService = new SQSService()

export const startConsumingDeliveryQueue = async () => {
  await sqsService.consume('delivery.fifo', async (data) => {
    console.log(data)
  })
}

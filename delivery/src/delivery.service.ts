import {SQSService} from "../../lib/src/sqs.service";
import {logger} from "../../lib/src/logger";

let userGlobal;
let productGlobal;
const sqsService = new SQSService(logger)
export const startConsumingDeliveryQueue = async () => {
  await sqsService.consume('delivery.fifo', async (data) => {
    const {user, product} = JSON.parse(data)
    userGlobal = user
    productGlobal = product
    logger(data)
  })
}


export const startIntervalOfProductsReturned = () => {
  setInterval(async () => {
    if (!userGlobal || !productGlobal ) {
      return
    }
    logger(`${JSON.stringify(userGlobal)} returned ${JSON.stringify(productGlobal)}`)
    await sqsService.produceToOneQueue('returnedPurchase.fifo', JSON.stringify({
      user: userGlobal,
      product: productGlobal
    }))

    userGlobal = undefined
    productGlobal = undefined
  }, 3000)
}
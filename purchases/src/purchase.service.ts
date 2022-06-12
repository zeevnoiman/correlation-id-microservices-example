import {sqsService} from "./index";
import {logger} from "../../lib/src/logger";

export const startConsumingReturnedPurchaseQueue = async () => {
  await sqsService.consume('returnedPurchase.fifo', async (data) => {
    logger(data)
  })
}
import axios from 'axios'
import {IProduct} from "./models/IProduct";
import {IUser} from "./models/IUser";
import {SQSService} from "../../lib/src/sqs.service";
import {get} from "../../lib/src/axios.config";
import {logger} from "../../lib/src/logger";

export const buyController = async (userToken: string, product: IProduct) => {
  try {
    const user: IUser = await get('http://localhost:4446/authenticate', {
      token: userToken
    })

    const sqsService = new SQSService(logger)
    logger(user)
    await sqsService.produceToOneQueue('delivery.fifo', JSON.stringify({
      user: user,
      product
    }))
  } catch (e) {
    logger(e)
    throw e
  }
}
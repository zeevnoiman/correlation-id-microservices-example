import axios from 'axios'
import {IProduct} from "./models/IProduct";
import {IUser} from "./models/IUser";
import {SQSService} from "../../lib/src/sqs.service";

export const buyController = async (userToken: string, product: IProduct) => {
  try {
    const response = await axios.get('http://localhost:4446/authenticate', {
      headers: {
        token: userToken
      }
    })

    const sqsService = new SQSService()
    console.log(response.data)
    await sqsService.produceToOneQueue('delivery.fifo', JSON.stringify({
      user: response.data,
      product
    }))
  } catch (e) {
    console.log(e)
    throw e
  }
}
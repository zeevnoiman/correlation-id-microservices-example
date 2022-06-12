import express from 'express';
import cors from 'cors'
import {purchaseRouter} from "./purchaseRouter";
import {apiRequested} from "../../lib/src/apiMiddlewares";
import {SQSService} from "../../lib/src/sqs.service";
import {logger} from "../../lib/src/logger";
import {startConsumingReturnedPurchaseQueue} from "./purchase.service";

const app: express.Application = express();

export const sqsService = new SQSService(logger)

app.use(cors());
app.use(express.json());
app.use(apiRequested)

app.get('/', (req, res) => {
  res.send('ok')
})

app.use('/purchase', purchaseRouter)

startConsumingReturnedPurchaseQueue()
app.listen('4447', () => {
  console.log('Purchase is listening on port 4447')
})


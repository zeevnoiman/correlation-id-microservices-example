import express from 'express';
import cors from 'cors'
import {startConsumingDeliveryQueue, startIntervalOfProductsReturned} from "./delivery.service";
import {apiRequested} from "../../lib/src/apiMiddlewares";

const app: express.Application = express();

app.use(cors());
app.use(express.json());
app.use(apiRequested)

app.get('/', (req, res) => {
  res.send('ok')
})


startConsumingDeliveryQueue()
  .catch(e => {
    console.log(e)
  })

startIntervalOfProductsReturned()

app.listen('4445', () => {
  console.log('Delivery is listening on port 4445')
})
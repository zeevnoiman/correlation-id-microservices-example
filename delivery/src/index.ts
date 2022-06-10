import express from 'express';
import cors from 'cors'
import {startConsumingDeliveryQueue} from "./delivery.service";

const app: express.Application = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('ok')
})

startConsumingDeliveryQueue()
  .catch(e => {
    console.log(e)
  })
app.listen('4445', () => {
  console.log('Delivery is listening on port 4445')
})
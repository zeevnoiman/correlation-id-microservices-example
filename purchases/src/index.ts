import express from 'express';
import cors from 'cors'
import {purchaseRouter} from "./purchaseRouter";
import {apiRequested} from "../../lib/src/apiMiddlewares";

const app: express.Application = express();

app.use(cors());
app.use(express.json());
app.use(apiRequested)

app.get('/', (req, res) => {
  res.send('ok')
})

app.use('/purchase', purchaseRouter)

app.listen('4447', () => {
  console.log('Purchase is listening on port 4447')
})


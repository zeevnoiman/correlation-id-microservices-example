import express from 'express';
import cors from 'cors'
import {purchaseRouter} from "./purchaseRouter";

const app: express.Application = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('ok')
})

app.use('/purchase', purchaseRouter)

app.listen('4447', () => {
  console.log('Purchase is listening on port 4447')
})


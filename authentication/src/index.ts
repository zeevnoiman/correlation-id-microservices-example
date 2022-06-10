import express from 'express';
import cors from 'cors'
import {apiRequested} from "../../lib/src/apiMiddlewares";
import {logger} from "../../lib/src/logger";

const app: express.Application = express();

app.use(cors());
app.use(express.json());
app.use(apiRequested)

app.get('/', (req, res) => {
  res.send('ok')
})

app.get('/authenticate', (req, res) => {
  const token = req.headers['token']
  if (token !== '12345') {
    res.status(404).send('Token does not exist')
    return
  };
  const user = {
    name: 'moshe',
    address: 'chocolate street',
    phone: '05555555',
    token
  }
  logger(user)
  res.send(user)
})

app.listen('4446', () => {
  console.log('Authentication is listening on port 4446')
})
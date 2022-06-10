import express from 'express';
import cors from 'cors'

const app: express.Application = express();

app.use(cors());
app.use(express.json());

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
  console.log(user)
  res.send(user)
})

app.listen('4446', () => {
  console.log('Authentication is listening on port 4446')
})
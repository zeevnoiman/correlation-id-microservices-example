import express from 'express';
import cors from 'cors'

const app: express.Application = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('ok')
})

app.listen('4444', () => {
  console.log('Purchase is listening on port 4444')
})


import express, {Router} from "express";
import {IProduct} from "./models/IProduct";
import {buyController} from "./purchase.controller";

const purchaseRouter: Router = express.Router();

purchaseRouter.post('/buy', async (req, res) => {
  try {
    const userToken: string = req.headers['token'] as string
    const product: IProduct = req.body
    await buyController(userToken, product)
    res.send('succeeded')
  } catch (e) {
    res.status(404).send('error')
  }
})

export {purchaseRouter}
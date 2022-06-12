import {NextFunction, Request} from "express";
import {createCorrelationId} from "./asyncHooks";
import {logger} from "./logger";

export const apiRequested = (req: Request, res, next: NextFunction) => {
  const correlationId: string | undefined = req.headers['correlation-id'] as string
  createCorrelationId(correlationId)
  logger(`Api requested ${req.originalUrl}`)
  next()
}
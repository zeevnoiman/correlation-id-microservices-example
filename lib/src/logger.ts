import {getCorrelationId} from "./asyncHooks";

export const logger = (message) => {
  console.log(JSON.stringify(message) + '-----' + getCorrelationId())
}
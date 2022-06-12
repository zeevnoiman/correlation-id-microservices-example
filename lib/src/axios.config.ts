import axios from "axios";
import {createCorrelationId, getCorrelationId} from "./asyncHooks";

export const get = async (url, headersInput) => {
  const headers = {
    ...headersInput,
    'correlation-id': getCorrelationId() || createCorrelationId()
  }
  const response = await axios.get(url, {headers})
  return response.data
}
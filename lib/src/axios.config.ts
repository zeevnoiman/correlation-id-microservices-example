import axios from "axios";
import {getCorrelationId} from "./asyncHooks";

export const get = async (url, headersInput) => {
  const headers = {
    ...headersInput,
    'correlation-id': getCorrelationId()
  }
  const response = await axios.get(url, {headers})
  return response.data
}
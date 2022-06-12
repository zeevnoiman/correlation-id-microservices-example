import * as asyncHooks from 'async_hooks'
import { randomUUID } from 'crypto'

const correlationIdsMap = new Map()

function init(asyncId, type, triggerAsyncId) {
  if (correlationIdsMap.has(triggerAsyncId)) {
    correlationIdsMap.set(asyncId, correlationIdsMap.get(triggerAsyncId))
  }
}

function destroy(asyncId) {
  if (correlationIdsMap.has(asyncId)) {
    correlationIdsMap.delete(asyncId)
  }
}

const asyncHook = asyncHooks.createHook({init, destroy})
asyncHook.enable()

export const createCorrelationId = (correlationIdInput?: string): string => {
  const correlationId: string = correlationIdInput || randomUUID()
  correlationIdsMap.set(asyncHooks.executionAsyncId(), correlationId)
  return correlationId
}

export const getCorrelationId = (): string | undefined => {
  return correlationIdsMap.get(asyncHooks.executionAsyncId())
}
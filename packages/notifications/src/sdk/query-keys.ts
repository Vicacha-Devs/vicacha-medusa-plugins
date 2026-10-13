export const NOTIFICATIONS_QUERY_KEY = "notifications" as const

type QueryInvalidationListener = (invalidatedKeyPrefix: readonly unknown[]) => void

const invalidationListeners = new Set<QueryInvalidationListener>()

/**
 * Hierarchical query key factory for `medusa-plugin-notifications`.
 * Follows the same factory conventions as `boldQueryKeys` in `vicacha-medusa-plugins`.
 */
export const notificationsQueryKeys = {
  all: [NOTIFICATIONS_QUERY_KEY] as const,

  studio: () => [...notificationsQueryKeys.all, "studio"] as const,

  templatesAll: () => [...notificationsQueryKeys.all, "templates"] as const,
  templates: (params?: Record<string, unknown>) =>
    params
      ? ([...notificationsQueryKeys.templatesAll(), params] as const)
      : notificationsQueryKeys.templatesAll(),
  template: (id: string) =>
    [...notificationsQueryKeys.templatesAll(), "detail", id] as const,

  mappingsAll: () => [...notificationsQueryKeys.all, "mappings"] as const,
  mappings: (params?: Record<string, unknown>) =>
    params
      ? ([...notificationsQueryKeys.mappingsAll(), params] as const)
      : notificationsQueryKeys.mappingsAll(),

  channels: () => [...notificationsQueryKeys.all, "channels"] as const,

  logsAll: () => [...notificationsQueryKeys.all, "logs"] as const,
  logs: (params?: Record<string, unknown>) =>
    params
      ? ([...notificationsQueryKeys.logsAll(), params] as const)
      : notificationsQueryKeys.logsAll(),
  orderLogs: (orderId: string) =>
    [...notificationsQueryKeys.logsAll(), "order", orderId] as const,

  broadcasts: () => [...notificationsQueryKeys.all, "broadcasts"] as const,

  sandbox: (params?: Record<string, unknown>) =>
    params
      ? ([...notificationsQueryKeys.all, "sandbox", params] as const)
      : ([...notificationsQueryKeys.all, "sandbox"] as const),
}

export function matchesNotificationsQueryKeyPrefix(
  candidateKey: readonly unknown[],
  prefixKey: readonly unknown[]
): boolean {
  if (prefixKey.length > candidateKey.length) {
    return false
  }
  for (let i = 0; i < prefixKey.length; i++) {
    const a = candidateKey[i]
    const b = prefixKey[i]
    if (a === b) continue
    if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
      if (JSON.stringify(a) === JSON.stringify(b)) continue
    }
    return false
  }
  return true
}

export function invalidateNotificationsQueries(
  keyPrefix: readonly unknown[] = notificationsQueryKeys.all
): void {
  for (const listener of invalidationListeners) {
    listener(keyPrefix)
  }
}

export function subscribeNotificationsQueryInvalidation(
  listener: QueryInvalidationListener
): () => void {
  invalidationListeners.add(listener)
  return () => {
    invalidationListeners.delete(listener)
  }
}

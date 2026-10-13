export const DOCUMENTS_QUERY_KEY = "documents" as const

type QueryInvalidationListener = (invalidatedKeyPrefix: readonly unknown[]) => void

const invalidationListeners = new Set<QueryInvalidationListener>()

/**
 * Hierarchical query key factory for `medusa-plugin-documents`.
 * Follows the same factory conventions as `boldQueryKeys` in `vicacha-medusa-plugins`.
 */
export const documentsQueryKeys = {
  all: [DOCUMENTS_QUERY_KEY] as const,

  lists: () => [...documentsQueryKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) =>
    params ? ([...documentsQueryKeys.lists(), params] as const) : documentsQueryKeys.lists(),

  details: () => [...documentsQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...documentsQueryKeys.details(), id] as const,

  orders: () => [...documentsQueryKeys.all, "order"] as const,
  order: (orderId: string) => [...documentsQueryKeys.orders(), orderId] as const,
  orderSigningUrl: (orderId: string) =>
    [...documentsQueryKeys.order(orderId), "signing-url"] as const,

  settingsAll: () => [...documentsQueryKeys.all, "settings"] as const,
  settings: (regionId?: string | null) =>
    [...documentsQueryKeys.settingsAll(), regionId || "global"] as const,

  templatesAll: () => [...documentsQueryKeys.all, "templates"] as const,
  templates: (params?: Record<string, unknown>) =>
    params
      ? ([...documentsQueryKeys.templatesAll(), params] as const)
      : documentsQueryKeys.templatesAll(),
  template: (id: string) => [...documentsQueryKeys.templatesAll(), "detail", id] as const,

  regions: () => [...documentsQueryKeys.all, "regions"] as const,
}

/**
 * Checks whether `candidateKey` matches `prefixKey` (prefix match on tuple elements).
 */
export function matchesQueryKeyPrefix(
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

/**
 * Notifies all active query hooks matching `keyPrefix` to refetch.
 */
export function invalidateDocumentsQueries(
  keyPrefix: readonly unknown[] = documentsQueryKeys.all
): void {
  for (const listener of invalidationListeners) {
    listener(keyPrefix)
  }
}

/**
 * Subscribes a hook listener to query key invalidation events.
 */
export function subscribeDocumentsQueryInvalidation(
  listener: QueryInvalidationListener
): () => void {
  invalidationListeners.add(listener)
  return () => {
    invalidationListeners.delete(listener)
  }
}

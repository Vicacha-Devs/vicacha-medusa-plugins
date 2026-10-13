export const TYPESENSE_QUERY_KEY = "typesense" as const

type QueryInvalidationListener = (invalidatedKeyPrefix: readonly unknown[]) => void

const invalidationListeners = new Set<QueryInvalidationListener>()

/**
 * Hierarchical query key factory for `medusa-plugin-typesense`.
 * Follows the same factory conventions as `boldQueryKeys` in `vicacha-medusa-plugins`.
 */
export const typesenseQueryKeys = {
  all: [TYPESENSE_QUERY_KEY] as const,

  health: () => [...typesenseQueryKeys.all, "health"] as const,

  collections: () => [...typesenseQueryKeys.all, "collections"] as const,

  entities: () => [...typesenseQueryKeys.all, "entities"] as const,

  synonymsAll: () => [...typesenseQueryKeys.all, "synonyms"] as const,
  synonyms: (entity: string) =>
    [...typesenseQueryKeys.synonymsAll(), entity] as const,

  curationsAll: () => [...typesenseQueryKeys.all, "curations"] as const,
  curations: (entity: string) =>
    [...typesenseQueryKeys.curationsAll(), entity] as const,

  stopwords: () => [...typesenseQueryKeys.all, "stopwords"] as const,

  analytics: () => [...typesenseQueryKeys.all, "analytics"] as const,

  documentsAll: () => [...typesenseQueryKeys.all, "documents"] as const,
  document: (entity: string, id: string) =>
    [...typesenseQueryKeys.documentsAll(), entity, id] as const,

  storeSearches: () => [...typesenseQueryKeys.all, "store-search"] as const,
  storeSearch: (params?: Record<string, unknown>) =>
    params
      ? ([...typesenseQueryKeys.storeSearches(), params] as const)
      : typesenseQueryKeys.storeSearches(),

  scopedTokens: () => [...typesenseQueryKeys.all, "scoped-token"] as const,
  scopedToken: (params?: Record<string, unknown>) =>
    params
      ? ([...typesenseQueryKeys.scopedTokens(), params] as const)
      : typesenseQueryKeys.scopedTokens(),
}

export function matchesTypesenseQueryKeyPrefix(
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

export function invalidateTypesenseQueries(
  keyPrefix: readonly unknown[] = typesenseQueryKeys.all
): void {
  for (const listener of invalidationListeners) {
    listener(keyPrefix)
  }
}

export function subscribeTypesenseQueryInvalidation(
  listener: QueryInvalidationListener
): () => void {
  invalidationListeners.add(listener)
  return () => {
    invalidationListeners.delete(listener)
  }
}

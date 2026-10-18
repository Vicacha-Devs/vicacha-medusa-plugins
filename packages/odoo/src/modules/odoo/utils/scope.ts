import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type QueryGraphArgs = {
  entity: string
  fields: string[]
  filters?: Record<string, unknown>
  pagination?: { take?: number; skip?: number }
}

export interface QueryGraph {
  graph: (args: QueryGraphArgs) => Promise<{ data: Array<Record<string, unknown>> }>
}

/**
 * Resolves a registration from `scopeOverride` (or `fallback`), accepting
 * either a Medusa container or a plain record. Returns null when missing.
 */
export const resolveFromScope = <T = unknown>(
  fallback: unknown,
  serviceKey: string,
  scopeOverride?: unknown
): T | null => {
  const scope = (scopeOverride ?? fallback) as
    | { resolve?: (k: string) => unknown }
    | Record<string, unknown>
    | undefined
  if (!scope) return null
  try {
    if (typeof (scope as { resolve?: unknown }).resolve === "function") {
      return (scope as { resolve: (k: string) => T }).resolve(serviceKey)
    }
    if (serviceKey in (scope as Record<string, unknown>)) {
      return (scope as Record<string, T>)[serviceKey] ?? null
    }
  } catch {
    return null
  }
  return null
}

export const resolveQueryGraph = (
  fallback: unknown,
  scopeOverride?: unknown
): QueryGraph | null => {
  const query = resolveFromScope<Partial<QueryGraph>>(
    fallback,
    ContainerRegistrationKeys.QUERY,
    scopeOverride
  )
  return query && typeof query.graph === "function" ? (query as QueryGraph) : null
}

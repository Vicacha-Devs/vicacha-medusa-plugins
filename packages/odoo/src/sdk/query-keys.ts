type InvalidationListener = (prefix: readonly unknown[]) => void

const listeners = new Set<InvalidationListener>()

export const odooQueryKeys = {
  all: ["odoo"] as const,
  status: () => [...odooQueryKeys.all, "status"] as const,
  config: () => [...odooQueryKeys.all, "config"] as const,
  section: (section: string) =>
    [...odooQueryKeys.all, "section", section] as const,
  options: () => [...odooQueryKeys.all, "options"] as const,
  mappings: (filters?: Record<string, unknown>) =>
    [...odooQueryKeys.all, "mappings", filters ?? {}] as const,
  logs: (filters?: Record<string, unknown>) =>
    [...odooQueryKeys.all, "logs", filters ?? {}] as const,
  failures: (filters?: Record<string, unknown>) =>
    [...odooQueryKeys.all, "failures", filters ?? {}] as const,
  conflicts: (filters?: Record<string, unknown>) =>
    [...odooQueryKeys.all, "conflicts", filters ?? {}] as const,
  posTransactions: (filters?: Record<string, unknown>) =>
    [...odooQueryKeys.all, "pos-transactions", filters ?? {}] as const,
  metrics: () => [...odooQueryKeys.all, "metrics"] as const,
}

export function matchesOdooQueryKeyPrefix(
  queryKey: readonly unknown[],
  prefix: readonly unknown[]
): boolean {
  if (prefix.length > queryKey.length) return false
  for (let i = 0; i < prefix.length; i++) {
    if (JSON.stringify(queryKey[i]) !== JSON.stringify(prefix[i])) {
      return false
    }
  }
  return true
}

export function invalidateOdooQueries(
  prefix: readonly unknown[] = odooQueryKeys.all
): void {
  for (const listener of listeners) {
    listener(prefix)
  }
}

export function subscribeOdooQueryInvalidation(
  listener: InvalidationListener
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

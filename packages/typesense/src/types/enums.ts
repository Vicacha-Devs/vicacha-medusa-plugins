export const EBuiltInEntity = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  COLLECTIONS: "collections",
} as const
export type EBuiltInEntity =
  (typeof EBuiltInEntity)[keyof typeof EBuiltInEntity]

export const ESearchMode = {
  KEYWORD: "keyword",
  SEMANTIC: "semantic",
  HYBRID: "hybrid",
  CONVERSATIONAL: "conversational",
} as const
export type ESearchMode = (typeof ESearchMode)[keyof typeof ESearchMode]

export const ESyncAction = {
  FULL_REINDEX: "full_reindex",
  ZERO_DOWNTIME_SWAP: "zero_downtime_swap",
  INCREMENTAL_UPSERT: "incremental_upsert",
  INCREMENTAL_DELETE: "incremental_delete",
  RECONCILE: "reconcile",
} as const
export type ESyncAction = (typeof ESyncAction)[keyof typeof ESyncAction]

export const ESyncStatus = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const
export type ESyncStatus = (typeof ESyncStatus)[keyof typeof ESyncStatus]

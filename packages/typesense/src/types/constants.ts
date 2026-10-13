export const TYPESENSE_MODULE = "typesense"

export const BUILT_IN_ENTITIES = [
  "products",
  "categories",
  "collections",
] as const

export const SEARCH_MODES = [
  "keyword",
  "semantic",
  "hybrid",
  "conversational",
] as const

export const SYNC_ACTIONS = [
  "full_reindex",
  "zero_downtime_swap",
  "incremental_upsert",
  "incremental_delete",
  "reconcile",
] as const

export const SYNC_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const

export const EMBEDDER_PROVIDERS = [
  "ts/all-MiniLM-L6-v2",
  "ts/e5-small",
  "ts/multilingual-e5-small",
  "openai/text-embedding-3-small",
  "openai/text-embedding-3-large",
  "openai/text-embedding-ada-002",
  "gcp/textembedding-gecko",
  "custom",
] as const

export const TYPESENSE_TAB_KEYS = [
  "overview",
  "entities",
  "merchandising",
  "playground",
  "analytics",
] as const

export const SUPPORTED_UI_LOCALES = [
  { code: "en", label: "English (EN)" },
  { code: "es", label: "Español (ES)" },
  { code: "de", label: "Deutsch (DE)" },
  { code: "fr", label: "Français (FR)" },
  { code: "pt", label: "Português (PT)" },
  { code: "it", label: "Italiano (IT)" },
  { code: "nl", label: "Nederlands (NL)" },
  { code: "pl", label: "Polski (PL)" },
  { code: "tr", label: "Türkçe (TR)" },
  { code: "ar", label: "العربية (AR)" },
] as const

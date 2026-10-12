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

export type TypesenseTabKey =
  | "overview"
  | "entities"
  | "merchandising"
  | "playground"
  | "analytics"

export interface TypesenseNodeInfo {
  host: string
  port: number
  protocol: string
}

export interface CollectionOverviewItem {
  entity: string
  enabled: boolean
  isCustom: boolean
  aliasName: string
  physicalCollection: string | null
  numDocuments: number
  numFields: number
  hasVectorEmbedder: boolean
  embedderModel: string | null
  synonymsCount: number
  curationsCount: number
}

export interface SyncJobItem {
  id: string
  entity: string
  collection_name: string
  alias_name: string | null
  locale: string
  action: string
  status: string
  documents_processed: number
  documents_failed: number
  duration_ms: number | null
  triggered_by: string
  error_message: string | null
  created_at: string
}

export interface SynonymItem {
  id: string
  root?: string
  synonyms: string[]
}

export interface CurationItem {
  id: string
  rule?: {
    query: string
    match: "exact" | "contains"
  }
  includes?: Array<{ id: string; position: number }>
  excludes?: Array<{ id: string }>
  metadata?: Record<string, any>
}

export interface StopwordSetItem {
  id: string
  stopwords: string[]
  locale?: string
}

export interface PlaygroundFacetCount {
  value: string
  count: number
}

export interface PlaygroundFacetGroup {
  field_name: string
  counts?: PlaygroundFacetCount[]
}

export interface PlaygroundHit {
  document?: Record<string, any>
  highlights?: Array<{ field?: string; snippet?: string }>
  curated?: boolean
}

export interface PlaygroundResponse {
  found: number
  search_time_ms: number
  collection: string
  facets?: PlaygroundFacetGroup[]
  hits?: PlaygroundHit[]
  conversation?: {
    answer?: string
    conversation_id?: string
  }
}

export interface PopularQueryMetric {
  query: string
  count: number
  avgResults: number
  clicks: number
}

export interface NoHitQueryMetric {
  query: string
  count: number
}

export interface AnalyticsSummary {
  totalSearches: number
  noHitRate: number
  clickThroughRate: number
  conversionRate: number
  averageLatencyMs: number
  popularQueries?: PopularQueryMetric[]
  noHitQueries?: NoHitQueryMetric[]
}

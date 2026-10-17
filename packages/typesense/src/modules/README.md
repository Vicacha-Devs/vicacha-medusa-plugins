# Modules

Standalone Medusa module (`typesense`) implementing zero-downtime collection alias rebuilds, vector/hybrid AI search, merchandising (synonyms, curations, stopwords), custom entity indexing, and search analytics persistence.

```
modules/
└── typesense/
    ├── index.ts                              Module("typesense", { service: TypesenseModuleService })
    ├── service.ts                            TypesenseModuleService (extends MedusaService)
    ├── types.ts                              All TypeScript interfaces, DTOs & constants
    ├── migrations/
    │   └── Migration20260401000000.ts        Creates mpt_sync_job, mpt_entity_config, and mpt_search_analytics
    ├── models/
    │   ├── index.ts                          Barrel exporting SyncJob, EntityConfig, SearchAnalyticsEvent
    │   ├── sync-job.ts                       mpt_sync_job DML model
    │   ├── entity-config.ts                  mpt_entity_config DML model
    │   └── search-analytics.ts               mpt_search_analytics DML model
    └── utils/
        ├── schemas.ts                        Built-in schemas (products, categories, collections) & buildCollectionSchema
        ├── transformers.ts                   Product, Category, Collection & Custom Entity document transformers
        └── filter-compiler.ts                compileTypesenseFilter, escapeTypesenseFilterValue & combineTypesenseFilters
```

---

## Service Registration

- **Module token:** `TYPESENSE_MODULE = "typesense"`
- **Service class:** `TypesenseModuleService`

---

## Data Models (`models/`)

| Model | Table Name | ID Prefix | Purpose |
| --- | --- | --- | --- |
| `SyncJob` | `mpt_sync_job` | `tsjob_` | Tracks full zero-downtime alias rebuilds and incremental sync batches (`entity`, `locale`, `operation`, `status`, `triggered_by`, `total_records`, `synced_records`, `deleted_records`, `failed_records`, `target_collection`, `alias_name`, `duration_ms`, `error_message`). |
| `EntityConfig` | `mpt_entity_config` | `tsent_` | Persists runtime custom entity index configurations (`entity_name`, `graph_entity`, `graph_fields`, `schema_fields`, `query_by`, `query_by_weights`, `facet_by`, `default_sorting_field`, `embedder_config`, `storefront_filter_constraint`, `is_custom`, `enabled`). |
| `SearchAnalyticsEvent` | `mpt_search_analytics` | `tsana_` | Records search telemetry (`query`, `normalized_query`, `entity`, `locale`, `mode`, `event_type` (`search \| click \| conversion`), `hits_count`, `processing_time_ms`, `clicked_document_id`, `sales_channel_id`, `customer_id`). |

---

## Key Service Capabilities (`service.ts`)

- **Cluster & Collection Management:** `checkHealth`, `getClusterOverview`, `ensureEntityCollection`, `zeroDowntimeReindexEntity`, `pruneOldVersionedCollections`
- **Document Indexing:** `upsertEntityDocuments`, `deleteEntityDocuments`, `getDocumentById`, `transformRecordsForEntity`
- **Search & AI Discovery:** `searchEntity` (Keyword, Semantic, Hybrid `alpha`, Disjunctive & Range Facets), `multiSearchEntities`, `conversationalSearch`, `generateScopedSearchKey`
- **Merchandising:** `listSynonyms`, `upsertSynonym`, `deleteSynonym`, `listCurations`, `upsertCuration`, `deleteCuration`, `listStopwords`, `upsertStopwords`, `deleteStopwords`
- **Custom Entities & Analytics:** `listResolvedEntityConfigs`, `upsertCustomEntityConfig`, `removeCustomEntityConfig`, `recordAnalyticsEvent`, `getAnalyticsSummary`

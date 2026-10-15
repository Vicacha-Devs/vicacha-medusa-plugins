import { createHmac } from "node:crypto"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import Typesense from "typesense"
import {
  TypesenseEntityConfig,
  TypesenseSearchAnalytics,
  TypesenseSyncJob,
} from "./models"
import {
  BUILT_IN_ENTITIES,
  type SearchMode,
  type SyncAction,
  type TypesenseCurationInput,
  type TypesenseEntityDefinition,
  type TypesenseFacetDistribution,
  type TypesenseNodeConfig,
  type TypesensePluginOptions,
  type TypesenseScopedKeyInput,
  type TypesenseSearchHit,
  type TypesenseSearchParams,
  type TypesenseSearchResponse,
  type TypesenseStopwordSetInput,
  type TypesenseSynonymInput,
} from "./types"
import {
  buildTypesenseCollectionSchema,
  getBuiltInEntityDefaults,
} from "./utils/schemas"
import { transformEntityRecord } from "./utils/transformers"
import {
  assertSafeTypesenseField,
  buildStorefrontSecurityFilter,
  combineTypesenseFilters,
  compileFilterObjectToTypesense,
  compileRangeFacetStrings,
} from "./utils/filter-compiler"

type InjectedDependencies = {
  logger?: {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
    debug?: (...args: any[]) => void
  }
}

export class TypesenseModuleService extends MedusaService({
  TypesenseSyncJob,
  TypesenseEntityConfig,
  TypesenseSearchAnalytics,
}) {
  protected options_: TypesensePluginOptions
  protected logger_?: InjectedDependencies["logger"]
  protected client_: any | null = null
  protected runtimeEntities_: Map<string, TypesenseEntityDefinition> = new Map()

  constructor(
    container: InjectedDependencies = {},
    options: TypesensePluginOptions = {}
  ) {
    super(...arguments)
    this.logger_ = container?.logger
    this.options_ = this.normalizeOptions(options)
    this.initializeEntityRegistry()
  }

  protected normalizeOptions(
    raw: TypesensePluginOptions = {}
  ): TypesensePluginOptions {
    const nodes: TypesenseNodeConfig[] = []
    if (Array.isArray(raw.nodes) && raw.nodes.length > 0) {
      nodes.push(...raw.nodes)
    } else {
      const hostUrl =
        raw.host || process.env.TYPESENSE_HOST || "http://127.0.0.1:8108"
      if (hostUrl.startsWith("http://") || hostUrl.startsWith("https://")) {
        try {
          const parsed = new URL(hostUrl)
          const protocol =
            parsed.protocol === "https:" ? "https" : ("http" as const)
          const port = parsed.port
            ? Number(parsed.port)
            : protocol === "https"
              ? 443
              : 8108
          nodes.push({
            host: parsed.hostname || "127.0.0.1",
            port,
            protocol,
            ...(parsed.pathname && parsed.pathname !== "/"
              ? { path: parsed.pathname }
              : {}),
          })
        } catch {
          nodes.push({
            host: "127.0.0.1",
            port: Number(process.env.TYPESENSE_PORT || 8108),
            protocol:
              process.env.TYPESENSE_PROTOCOL === "https" ? "https" : "http",
          })
        }
      } else {
        nodes.push({
          host: hostUrl,
          port: Number(process.env.TYPESENSE_PORT || 8108),
          protocol:
            process.env.TYPESENSE_PROTOCOL === "https" ? "https" : "http",
        })
      }
    }

    const defaultLocale = raw.defaultLocale || "en"
    const locales =
      Array.isArray(raw.locales) && raw.locales.length > 0
        ? raw.locales
        : [defaultLocale]

    return {
      ...raw,
      nodes,
      apiKey: raw.apiKey || process.env.TYPESENSE_API_KEY || "",
      searchOnlyApiKey:
        raw.searchOnlyApiKey ||
        process.env.TYPESENSE_SEARCH_ONLY_API_KEY ||
        "",
      connectionTimeoutSeconds: raw.connectionTimeoutSeconds ?? 10,
      numRetries: raw.numRetries ?? 3,
      retryIntervalSeconds: raw.retryIntervalSeconds ?? 0.5,
      collectionPrefix: (
        raw.collectionPrefix ||
        process.env.TYPESENSE_COLLECTION_PREFIX ||
        "medusa"
      ).replace(/[^a-zA-Z0-9_-]/g, "_"),
      batchSize: Math.max(1, Math.min(raw.batchSize ?? 250, 2000)),
      autoIndex: raw.autoIndex !== false,
      zeroDowntimeSwap: raw.zeroDowntimeSwap !== false,
      keepOldCollectionsCount: Math.max(0, raw.keepOldCollectionsCount ?? 1),
      defaultLocale,
      locales,
      scopedKeyTtlSeconds: Math.max(60, raw.scopedKeyTtlSeconds ?? 3600),
      enableAnalytics: raw.enableAnalytics !== false,
    }
  }

  protected initializeEntityRegistry(): void {
    for (const entity of BUILT_IN_ENTITIES) {
      const defaults = getBuiltInEntityDefaults(entity)
      const override = this.options_.entities?.[entity] || {}
      this.runtimeEntities_.set(entity, {
        ...defaults,
        ...override,
        entity,
      })
    }

    if (
      this.options_.customEntities &&
      typeof this.options_.customEntities === "object"
    ) {
      for (const [customKey, customDef] of Object.entries(
        this.options_.customEntities
      )) {
        if (!customKey) continue
        const defaults = getBuiltInEntityDefaults(customKey)
        this.runtimeEntities_.set(customKey, {
          ...defaults,
          ...customDef,
          entity: customKey,
        })
      }
    }
  }

  /**
   * Injects a custom or mock Typesense client instance (useful for testing or custom transports).
   */
  public async setClient(client: any): Promise<void> {
    this.client_ = client
  }

  /**
   * Returns the configured Typesense Client instance.
   */
  protected getClient(): any {
    if (this.client_) {
      return this.client_
    }

    const apiKey = this.options_.apiKey || process.env.TYPESENSE_API_KEY || ""
    const ClientConstructor =
      (Typesense as any).Client || (Typesense as any).default?.Client
    this.client_ = new ClientConstructor({
      nodes: this.options_.nodes!,
      ...(this.options_.nearestNode
        ? { nearestNode: this.options_.nearestNode }
        : {}),
      apiKey: apiKey || "missing-typesense-api-key",
      connectionTimeoutSeconds: this.options_.connectionTimeoutSeconds ?? 10,
      numRetries: this.options_.numRetries ?? 3,
      retryIntervalSeconds: this.options_.retryIntervalSeconds ?? 0.5,
    })

    return this.client_
  }

  public async getPluginOptions(): Promise<Omit<
    TypesensePluginOptions,
    "apiKey" | "searchOnlyApiKey"
  > & {
    hasApiKey: boolean
    hasSearchOnlyApiKey: boolean
  }> {
    const { apiKey, searchOnlyApiKey, ...rest } = this.options_
    return {
      ...rest,
      hasApiKey: Boolean(apiKey),
      hasSearchOnlyApiKey: Boolean(searchOnlyApiKey),
    }
  }

  public async isAutoIndexEnabled(): Promise<boolean> {
    return this.options_.autoIndex !== false
  }

  protected getAliasName(entity: string, locale?: string): string {
    const safeEntity = String(entity || "products")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
    const prefix = this.options_.collectionPrefix || "medusa"
    const locales = this.options_.locales || ["en"]
    const resolvedLocale = (
      locale ||
      this.options_.defaultLocale ||
      "en"
    ).toLowerCase()

    if (
      locales.length > 1 ||
      (locale && locale !== (this.options_.defaultLocale || "en"))
    ) {
      const safeLocale = resolvedLocale.replace(/[^a-z0-9_-]/g, "_")
      return `${prefix}_${safeEntity}_${safeLocale}`
    }

    return `${prefix}_${safeEntity}`
  }

  protected getNewPhysicalCollectionName(
    entity: string,
    locale?: string
  ): string {
    const alias = this.getAliasName(entity, locale)
    const timestamp = Date.now()
    return `${alias}_v_${timestamp}`
  }

  /**
   * Synchronizes DB-persisted entity configurations (`mpt_entity_config`) with the runtime registry.
   */
  public async getAllEntityDefinitions(): Promise<TypesenseEntityDefinition[]> {
    try {
      const dbConfigs = await this.listTypesenseEntityConfigs({})
      for (const row of dbConfigs) {
        if (!row?.entity) continue
        const existing =
          this.runtimeEntities_.get(row.entity) ||
          getBuiltInEntityDefaults(row.entity)
        this.runtimeEntities_.set(row.entity, {
          ...existing,
          entity: row.entity,
          enabled: row.enabled !== false,
          graphEntity: row.graph_entity || existing.graphEntity,
          graphFields: Array.isArray(row.graph_fields)
            ? (row.graph_fields as string[])
            : existing.graphFields,
          queryBy: Array.isArray(row.query_by)
            ? (row.query_by as string[])
            : existing.queryBy,
          queryByWeights: Array.isArray(row.query_by_weights)
            ? (row.query_by_weights as number[])
            : existing.queryByWeights,
          facetBy: Array.isArray(row.facet_by)
            ? (row.facet_by as string[])
            : existing.facetBy,
          defaultSortBy: row.default_sort_by || existing.defaultSortBy,
          enableNestedFields:
            row.enable_nested_fields ?? existing.enableNestedFields,
          embedder:
            row.embedder_config !== undefined && row.embedder_config !== null
              ? (row.embedder_config as any)
              : existing.embedder,
          locales: Array.isArray(row.locales)
            ? (row.locales as string[])
            : existing.locales,
          stopwordsSetId: row.stopwords_set_id ?? existing.stopwordsSetId,
          events:
            row.events_config && typeof row.events_config === "object"
              ? (row.events_config as any)
              : existing.events,
          schemaFields: Array.isArray(row.schema_fields)
            ? (row.schema_fields as any)
            : existing.schemaFields,
          storefrontFilterConstraint:
            row.storefront_filter_constraint ??
            existing.storefrontFilterConstraint,
        })
      }
    } catch {
      // Table may not be migrated yet in standalone unit tests
    }

    return Array.from(this.runtimeEntities_.values())
  }

  public async getEntityDefinition(
    entity: string
  ): Promise<TypesenseEntityDefinition> {
    await this.getAllEntityDefinitions()
    const existing = this.runtimeEntities_.get(entity)
    if (existing) {
      return existing
    }
    const fallback = getBuiltInEntityDefaults(entity)
    this.runtimeEntities_.set(entity, fallback)
    return fallback
  }

  public async upsertEntityConfig(
    input: Partial<TypesenseEntityDefinition> & { entity: string }
  ): Promise<TypesenseEntityDefinition> {
    const safeEntity = input.entity
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
    const current = await this.getEntityDefinition(safeEntity)
    const isCustom = !BUILT_IN_ENTITIES.includes(safeEntity as any)

    const merged: TypesenseEntityDefinition = {
      ...current,
      ...input,
      entity: safeEntity,
    }
    this.runtimeEntities_.set(safeEntity, merged)

    try {
      const existingRows = await this.listTypesenseEntityConfigs({
        entity: safeEntity,
      })
      const payload = {
        entity: safeEntity,
        is_custom: isCustom,
        enabled: merged.enabled !== false,
        graph_entity: merged.graphEntity || null,
        graph_fields: (merged.graphFields || null) as any,
        query_by: (merged.queryBy || null) as any,
        query_by_weights: (merged.queryByWeights || null) as any,
        facet_by: (merged.facetBy || null) as any,
        default_sort_by: merged.defaultSortBy || null,
        enable_nested_fields: merged.enableNestedFields !== false,
        embedder_config: (merged.embedder || null) as any,
        locales: (merged.locales || null) as any,
        stopwords_set_id: merged.stopwordsSetId || null,
        events_config: (merged.events || null) as any,
        schema_fields: (merged.schemaFields || null) as any,
        storefront_filter_constraint:
          merged.storefrontFilterConstraint || null,
      }

      if (existingRows.length > 0) {
        await this.updateTypesenseEntityConfigs({
          id: existingRows[0].id,
          ...payload,
        })
      } else {
        await this.createTypesenseEntityConfigs(payload)
      }
    } catch {
      // Ignore if DB is unavailable in unit tests
    }

    return merged
  }

  public async removeCustomEntityConfig(entity: string): Promise<boolean> {
    if (BUILT_IN_ENTITIES.includes(entity as any)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot delete built-in entity "${entity}". Disable it instead.`
      )
    }
    this.runtimeEntities_.delete(entity)
    try {
      const rows = await this.listTypesenseEntityConfigs({ entity })
      if (rows.length > 0) {
        await this.deleteTypesenseEntityConfigs(rows.map((r: any) => r.id))
      }
    } catch {
      // Ignore
    }
    return true
  }

  /**
   * Resolves the physical collection name backing an alias, or returns the alias itself if it is a direct collection.
   */
  public async resolvePhysicalCollectionName(
    entity: string,
    locale?: string
  ): Promise<{ aliasName: string; physicalName: string; isAlias: boolean }> {
    const aliasName = this.getAliasName(entity, locale)
    const client = this.getClient()

    try {
      const aliasInfo = await client.aliases(aliasName).retrieve()
      if (aliasInfo?.collection_name) {
        return {
          aliasName,
          physicalName: aliasInfo.collection_name,
          isAlias: true,
        }
      }
    } catch {
      // Alias does not exist yet
    }

    return {
      aliasName,
      physicalName: aliasName,
      isAlias: false,
    }
  }

  /**
   * Ensures a collection (and alias) exists in Typesense for the given entity and locale.
   */
  public async ensureCollectionReady(
    entity: string,
    locale?: string
  ): Promise<{ aliasName: string; physicalName: string }> {
    const client = this.getClient()
    const definition = await this.getEntityDefinition(entity)
    const resolved = await this.resolvePhysicalCollectionName(entity, locale)

    try {
      await client.collections(resolved.physicalName).retrieve()
      return {
        aliasName: resolved.aliasName,
        physicalName: resolved.physicalName,
      }
    } catch {
      // Need to create collection
    }

    const physicalName =
      this.options_.zeroDowntimeSwap !== false
        ? this.getNewPhysicalCollectionName(entity, locale)
        : resolved.aliasName

    const schema = buildTypesenseCollectionSchema({
      collectionName: physicalName,
      definition,
      globalEmbedder: this.options_.embedder,
      locale: locale || this.options_.defaultLocale,
    })

    await client.collections().create(schema)

    if (physicalName !== resolved.aliasName) {
      await client.aliases().upsert(resolved.aliasName, {
        collection_name: physicalName,
      })
    }

    return {
      aliasName: resolved.aliasName,
      physicalName,
    }
  }

  /**
   * Copies all synonyms and curations/overrides from an old physical collection to a newly built physical collection.
   */
  protected async copyMerchandisingRules(
    sourceCollection: string,
    targetCollection: string
  ): Promise<void> {
    if (!sourceCollection || sourceCollection === targetCollection) {
      return
    }
    const client = this.getClient()

    try {
      const synRes = await client
        .collections(sourceCollection)
        .synonyms()
        .retrieve()
      const synonyms = Array.isArray(synRes?.synonyms) ? synRes.synonyms : []
      for (const syn of synonyms) {
        if (!syn?.id) continue
        const { id, ...body } = syn
        await client
          .collections(targetCollection)
          .synonyms()
          .upsert(id, body)
      }
    } catch {
      // Ignore if source collection has no synonyms
    }

    try {
      const ovrRes = await client
        .collections(sourceCollection)
        .overrides()
        .retrieve()
      const overrides = Array.isArray(ovrRes?.overrides)
        ? ovrRes.overrides
        : []
      for (const ovr of overrides) {
        if (!ovr?.id) continue
        const { id, ...body } = ovr
        await client
          .collections(targetCollection)
          .overrides()
          .upsert(id, body)
      }
    } catch {
      // Ignore if source collection has no overrides
    }
  }

  /**
   * Performs a full reindex of an entity with zero-downtime collection alias swapping.
   */
  public async reindexEntityZeroDowntime(params: {
    entity: string
    records: Record<string, any>[]
    locale?: string
    triggeredBy?: string
  }): Promise<{
    entity: string
    aliasName: string
    collectionName: string
    documentsProcessed: number
    documentsFailed: number
    durationMs: number
  }> {
    const startTime = Date.now()
    const { entity, records, locale, triggeredBy = "manual" } = params
    const client = this.getClient()
    const definition = await this.getEntityDefinition(entity)
    const aliasName = this.getAliasName(entity, locale)
    const useAliasSwap = this.options_.zeroDowntimeSwap !== false

    const previousResolved = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )
    const targetCollectionName = useAliasSwap
      ? this.getNewPhysicalCollectionName(entity, locale)
      : aliasName

    const syncJob = await this.safeCreateSyncJob({
      entity,
      collection_name: targetCollectionName,
      alias_name: aliasName,
      locale: locale || this.options_.defaultLocale || "en",
      action: useAliasSwap ? "zero_downtime_swap" : "full_reindex",
      status: "running",
      triggered_by: triggeredBy,
      started_at: new Date(),
    })

    let documentsProcessed = 0
    let documentsFailed = 0

    try {
      if (!useAliasSwap) {
        try {
          await client.collections(aliasName).delete()
        } catch {
          // Collection did not exist
        }
      }

      const schema = buildTypesenseCollectionSchema({
        collectionName: targetCollectionName,
        definition,
        globalEmbedder: this.options_.embedder,
        locale: locale || this.options_.defaultLocale,
      })

      await client.collections().create(schema)

      if (useAliasSwap && previousResolved.isAlias) {
        await this.copyMerchandisingRules(
          previousResolved.physicalName,
          targetCollectionName
        )
      }

      const docs: Record<string, any>[] = []
      for (const raw of records) {
        const doc = await transformEntityRecord(entity, raw, {
          locale: locale || this.options_.defaultLocale,
          customTransformer: definition.transformer,
        })
        if (doc) {
          docs.push(doc)
        }
      }

      const batchSize = this.options_.batchSize || 250
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize)
        const importResults = await client
          .collections(targetCollectionName)
          .documents()
          .import(batch, { action: "upsert" })

        if (Array.isArray(importResults)) {
          for (const res of importResults) {
            if (res?.success === false) {
              documentsFailed += 1
            } else {
              documentsProcessed += 1
            }
          }
        } else {
          documentsProcessed += batch.length
        }
      }

      if (useAliasSwap) {
        await client.aliases().upsert(aliasName, {
          collection_name: targetCollectionName,
        })
        await this.pruneOldPhysicalCollections(aliasName, targetCollectionName)
      }

      const durationMs = Date.now() - startTime
      await this.safeCompleteSyncJob(syncJob?.id, {
        status: "completed",
        documents_processed: documentsProcessed,
        documents_failed: documentsFailed,
        duration_ms: durationMs,
        completed_at: new Date(),
      })

      return {
        entity,
        aliasName,
        collectionName: targetCollectionName,
        documentsProcessed,
        documentsFailed,
        durationMs,
      }
    } catch (error: any) {
      if (useAliasSwap && targetCollectionName !== aliasName) {
        try {
          await client.collections(targetCollectionName).delete()
        } catch {
          // Ignore cleanup failure
        }
      }
      const durationMs = Date.now() - startTime
      await this.safeCompleteSyncJob(syncJob?.id, {
        status: "failed",
        documents_processed: documentsProcessed,
        documents_failed: documentsFailed,
        duration_ms: durationMs,
        error_message: error?.message || "Reindex failed",
        completed_at: new Date(),
      })
      throw error
    }
  }

  protected async pruneOldPhysicalCollections(
    aliasName: string,
    activeCollectionName: string
  ): Promise<void> {
    const client = this.getClient()
    const keepCount = this.options_.keepOldCollectionsCount ?? 1
    try {
      const allCollections = await client.collections().retrieve()
      if (!Array.isArray(allCollections)) return

      const prefix = `${aliasName}_v_`
      const versioned = allCollections
        .map((c: any) => String(c?.name || ""))
        .filter((name: string) => name.startsWith(prefix) && name !== activeCollectionName)
        .sort()
        .reverse()

      const toDelete = versioned.slice(keepCount)
      for (const oldName of toDelete) {
        try {
          await client.collections(oldName).delete()
        } catch {
          // Ignore individual deletion error
        }
      }
    } catch {
      // Ignore if collections listing fails
    }
  }

  /**
   * Incrementally transforms and upserts one or more entity records into Typesense.
   */
  public async upsertEntityRecords(params: {
    entity: string
    records: Record<string, any>[]
    locale?: string
    triggeredBy?: string
  }): Promise<{ documentsProcessed: number; documentsFailed: number }> {
    const { entity, records, locale, triggeredBy = "event" } = params
    if (!Array.isArray(records) || records.length === 0) {
      return { documentsProcessed: 0, documentsFailed: 0 }
    }

    const startTime = Date.now()
    const definition = await this.getEntityDefinition(entity)
    if (definition.enabled === false) {
      return { documentsProcessed: 0, documentsFailed: 0 }
    }

    const { aliasName, physicalName } = await this.ensureCollectionReady(
      entity,
      locale
    )
    const client = this.getClient()

    const docs: Record<string, any>[] = []
    for (const raw of records) {
      const doc = await transformEntityRecord(entity, raw, {
        locale: locale || this.options_.defaultLocale,
        customTransformer: definition.transformer,
      })
      if (doc) {
        docs.push(doc)
      }
    }

    if (docs.length === 0) {
      return { documentsProcessed: 0, documentsFailed: 0 }
    }

    let documentsProcessed = 0
    let documentsFailed = 0
    const batchSize = this.options_.batchSize || 250

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize)
      const importResults = await client
        .collections(physicalName)
        .documents()
        .import(batch, { action: "upsert" })

      if (Array.isArray(importResults)) {
        for (const r of importResults) {
          if (r?.success === false) {
            documentsFailed += 1
          } else {
            documentsProcessed += 1
          }
        }
      } else {
        documentsProcessed += batch.length
      }
    }

    const syncJob = await this.safeCreateSyncJob({
      entity,
      collection_name: physicalName,
      alias_name: aliasName,
      locale: locale || this.options_.defaultLocale || "en",
      action: "incremental_upsert",
      status: "completed",
      documents_processed: documentsProcessed,
      documents_failed: documentsFailed,
      duration_ms: Date.now() - startTime,
      triggered_by: triggeredBy,
      started_at: new Date(startTime),
      completed_at: new Date(),
    })
    void syncJob

    return { documentsProcessed, documentsFailed }
  }

  /**
   * Deletes one or more document IDs from an entity's Typesense collection.
   */
  public async deleteEntityDocumentIds(params: {
    entity: string
    ids: string[]
    locale?: string
    triggeredBy?: string
  }): Promise<{ deletedCount: number }> {
    const { entity, ids, locale, triggeredBy = "event" } = params
    const validIds = (ids || []).map((id) => String(id).trim()).filter(Boolean)
    if (validIds.length === 0) {
      return { deletedCount: 0 }
    }

    const startTime = Date.now()
    const client = this.getClient()
    const { aliasName, physicalName } = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )

    let deletedCount = 0
    for (const id of validIds) {
      try {
        await client.collections(physicalName).documents(id).delete()
        deletedCount += 1
      } catch {
        // Document may already be absent
      }
    }

    await this.safeCreateSyncJob({
      entity,
      collection_name: physicalName,
      alias_name: aliasName,
      locale: locale || this.options_.defaultLocale || "en",
      action: "incremental_delete",
      status: "completed",
      documents_processed: deletedCount,
      documents_failed: 0,
      duration_ms: Date.now() - startTime,
      triggered_by: triggeredBy,
      started_at: new Date(startTime),
      completed_at: new Date(),
    })

    return { deletedCount }
  }

  /**
   * Retrieves a single indexed document from Typesense by entity and ID.
   */
  public async retrieveIndexedDocument(
    entity: string,
    id: string,
    locale?: string
  ): Promise<Record<string, any> | null> {
    const client = this.getClient()
    const { physicalName } = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )
    try {
      return await client.collections(physicalName).documents(id).retrieve()
    } catch {
      return null
    }
  }

  /**
   * Executes a full-text, faceted, disjunctive, semantic/vector, hybrid, or conversational search in Typesense.
   */
  public async search<T = Record<string, any>>(
    params: TypesenseSearchParams
  ): Promise<TypesenseSearchResponse<T>> {
    const startTime = Date.now()
    const entity = params.entity || "products"
    const definition = await this.getEntityDefinition(entity)
    const locale = params.locale || this.options_.defaultLocale || "en"
    const { aliasName, physicalName } = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )
    const client = this.getClient()

    const mode: SearchMode = params.mode || "keyword"
    const rawQuery = typeof params.q === "string" ? params.q.trim() : "*"
    const q = rawQuery.length > 0 ? rawQuery : "*"

    const limit = Math.max(1, Math.min(params.limit ?? 20, 250))
    const page =
      params.offset !== undefined
        ? Math.floor(Math.max(0, params.offset) / limit) + 1
        : Math.max(1, params.page ?? 1)
    const offset =
      params.offset !== undefined
        ? Math.max(0, params.offset)
        : (page - 1) * limit

    const queryByFields =
      params.queryBy && params.queryBy.length > 0
        ? params.queryBy.map(assertSafeTypesenseField)
        : definition.queryBy.length > 0
          ? definition.queryBy
          : ["title", "name"]

    const queryByWeights =
      params.queryByWeights &&
      params.queryByWeights.length === queryByFields.length
        ? params.queryByWeights
        : definition.queryByWeights &&
            definition.queryByWeights.length === queryByFields.length
          ? definition.queryByWeights
          : undefined

    const baseFacets =
      params.facets !== undefined
        ? params.facets.map(assertSafeTypesenseField)
        : definition.facetBy || []
    const rangeFacetStrings = compileRangeFacetStrings(params.rangeFacets)
    const allFacets = [...baseFacets, ...rangeFacetStrings]

    const securityFilter = params.enforceStorefrontVisibility
      ? buildStorefrontSecurityFilter({
          entity,
          storefrontFilterConstraint: definition.storefrontFilterConstraint,
          salesChannelIds: params.salesChannelIds,
        })
      : ""

    const compiledObjectFilter = compileFilterObjectToTypesense(params.filters)
    const combinedFilterBy = combineTypesenseFilters(
      securityFilter,
      compiledObjectFilter,
      params.filterBy
    )

    const tsSearchParams: Record<string, any> = {
      q,
      query_by: queryByFields.join(","),
      per_page: limit,
      page,
      num_typos: params.numTypos ?? 2,
      prefix: params.prefix !== false,
      ...(queryByWeights ? { query_by_weights: queryByWeights.join(",") } : {}),
      ...(allFacets.length > 0 ? { facet_by: allFacets.join(",") } : {}),
      ...(params.maxFacetValues
        ? { max_facet_values: params.maxFacetValues }
        : { max_facet_values: 50 }),
      ...(combinedFilterBy ? { filter_by: combinedFilterBy } : {}),
      ...(params.sortBy
        ? { sort_by: params.sortBy }
        : q === "*" && definition.defaultSortBy
          ? { sort_by: definition.defaultSortBy }
          : {}),
      ...(params.groupBy
        ? {
            group_by: assertSafeTypesenseField(params.groupBy),
            group_limit: params.groupLimit ?? 3,
          }
        : {}),
      ...(params.highlightFields && params.highlightFields.length > 0
        ? {
            highlight_fields: params.highlightFields
              .map(assertSafeTypesenseField)
              .join(","),
          }
        : {}),
      highlight_start_tag: params.highlightStartTag || "<mark>",
      highlight_end_tag: params.highlightEndTag || "</mark>",
      ...(params.pinnedHits ? { pinned_hits: params.pinnedHits } : {}),
      ...(params.hiddenHits ? { hidden_hits: params.hiddenHits } : {}),
      ...(params.enableOverrides !== undefined
        ? { enable_overrides: params.enableOverrides }
        : {}),
      ...(params.enableSynonyms !== undefined
        ? { enable_synonyms: params.enableSynonyms }
        : {}),
      ...(params.stopwords || definition.stopwordsSetId
        ? { stopwords: params.stopwords || definition.stopwordsSetId }
        : {}),
      ...(params.rawParams || {}),
    }

    // Vector / Semantic / Hybrid Search configuration
    if (mode === "semantic" || mode === "hybrid") {
      const vectorField = assertSafeTypesenseField(
        params.vectorField ||
          definition.embedder?.field_name ||
          this.options_.embedder?.field_name ||
          "embedding"
      )
      const alpha =
        mode === "semantic"
          ? 1.0
          : Math.max(0, Math.min(1, params.alpha ?? 0.3))
      const vectorValues =
        Array.isArray(params.vector) && params.vector.length > 0
          ? params.vector.map((n) => Number(n)).join(",")
          : ""

      tsSearchParams.vector_query = `${vectorField}:([${vectorValues}], alpha: ${alpha})`
      tsSearchParams.exclude_fields = [
        ...(tsSearchParams.exclude_fields
          ? String(tsSearchParams.exclude_fields).split(",")
          : []),
        vectorField,
      ].join(",")
    }

    // Conversational Search (RAG) configuration
    if (mode === "conversational" || params.conversationModelId) {
      const modelId =
        params.conversationModelId ||
        this.options_.conversationalModel?.id ||
        "default-rag-model"
      tsSearchParams.conversation = true
      tsSearchParams.conversation_model_id = modelId
      if (params.conversationId) {
        tsSearchParams.conversation_id = params.conversationId
      }
    }

    // Disjunctive faceting support via multi_search batching
    const filterKeys =
      params.filters && typeof params.filters === "object"
        ? Object.keys(params.filters).filter(
            (k) => !k.startsWith("$") && baseFacets.includes(k)
          )
        : []

    let primaryResult: any
    const disjunctiveFacetMap = new Map<string, TypesenseFacetDistribution>()

    if (params.disjunctiveFacets && filterKeys.length > 0) {
      const searches: Record<string, any>[] = [
        {
          collection: physicalName,
          ...tsSearchParams,
        },
      ]

      for (const disjunctiveKey of filterKeys) {
        const siblingFilters = { ...(params.filters || {}) }
        delete siblingFilters[disjunctiveKey]
        const siblingCompiled = compileFilterObjectToTypesense(siblingFilters)
        const siblingFilterBy = combineTypesenseFilters(
          securityFilter,
          siblingCompiled,
          params.filterBy
        )

        searches.push({
          collection: physicalName,
          q,
          query_by: tsSearchParams.query_by,
          ...(tsSearchParams.vector_query
            ? { vector_query: tsSearchParams.vector_query }
            : {}),
          facet_by: disjunctiveKey,
          max_facet_values: tsSearchParams.max_facet_values,
          per_page: 0,
          page: 1,
          ...(siblingFilterBy ? { filter_by: siblingFilterBy } : {}),
        })
      }

      const multiResponse = await client.multiSearch.perform({ searches })
      const results = Array.isArray(multiResponse?.results)
        ? multiResponse.results
        : []
      primaryResult = results[0] || {}

      for (let i = 0; i < filterKeys.length; i++) {
        const subResult = results[i + 1]
        const facetCounts = Array.isArray(subResult?.facet_counts)
          ? subResult.facet_counts
          : []
        const matchingFacet = facetCounts.find(
          (fc: any) => fc?.field_name === filterKeys[i]
        )
        if (matchingFacet) {
          disjunctiveFacetMap.set(filterKeys[i], {
            field_name: matchingFacet.field_name,
            counts: Array.isArray(matchingFacet.counts)
              ? matchingFacet.counts
              : [],
            stats: matchingFacet.stats,
          })
        }
      }
    } else {
      primaryResult = await client
        .collections(physicalName)
        .documents()
        .search(tsSearchParams)
    }

    // Normalize hits (including grouped_hits if groupBy was used)
    const rawHits: any[] = Array.isArray(primaryResult?.hits)
      ? primaryResult.hits
      : Array.isArray(primaryResult?.grouped_hits)
        ? primaryResult.grouped_hits.flatMap((g: any) => g?.hits || [])
        : []

    const hits: TypesenseSearchHit<T>[] = rawHits.map((h: any) => ({
      document: h.document as T,
      highlights: Array.isArray(h.highlights) ? h.highlights : [],
      text_match: h.text_match,
      vector_distance: h.vector_distance,
      hybrid_search_info: h.hybrid_search_info,
      curated: h.curated,
    }))

    const rawFacets: any[] = Array.isArray(primaryResult?.facet_counts)
      ? primaryResult.facet_counts
      : []

    const seenFacetFields = new Set<string>()
    const facets: TypesenseFacetDistribution[] = rawFacets.map((rf: any) => {
      seenFacetFields.add(rf.field_name)
      const disjunctiveOverride = disjunctiveFacetMap.get(rf.field_name)
      if (disjunctiveOverride) {
        return disjunctiveOverride
      }
      return {
        field_name: rf.field_name,
        counts: Array.isArray(rf.counts) ? rf.counts : [],
        stats: rf.stats,
      }
    })

    for (const [fieldName, disjFacet] of disjunctiveFacetMap.entries()) {
      if (!seenFacetFields.has(fieldName)) {
        facets.push(disjFacet)
      }
    }

    const searchTimeMs =
      typeof primaryResult?.search_time_ms === "number"
        ? primaryResult.search_time_ms
        : Date.now() - startTime

    const response: TypesenseSearchResponse<T> = {
      entity,
      collection: aliasName,
      mode,
      query: q,
      hits,
      documents: hits.map((h) => h.document),
      found: typeof primaryResult?.found === "number" ? primaryResult.found : hits.length,
      out_of:
        typeof primaryResult?.out_of === "number"
          ? primaryResult.out_of
          : hits.length,
      page: typeof primaryResult?.page === "number" ? primaryResult.page : page,
      limit,
      offset,
      search_time_ms: searchTimeMs,
      facets,
      ...(primaryResult?.conversation
        ? { conversation: primaryResult.conversation }
        : {}),
    }

    if (
      this.options_.enableAnalytics !== false &&
      params.trackAnalytics !== false &&
      q !== "*"
    ) {
      void this.safeRecordSearchQuery({
        entity,
        query: q,
        mode,
        locale,
        results_count: response.found,
        latency_ms: searchTimeMs,
        sales_channel_id: params.salesChannelIds?.[0] || null,
        filters_snapshot: params.filters || null,
      })
    }

    return response
  }

  /**
   * Executes federated multi-entity search across multiple entities in parallel or via multi_search.
   */
  public async federatedSearch(params: {
    queries: TypesenseSearchParams[]
    salesChannelIds?: string[]
    enforceStorefrontVisibility?: boolean
  }): Promise<{
    results: TypesenseSearchResponse[]
    total_time_ms: number
  }> {
    const startTime = Date.now()
    const results = await Promise.all(
      (params.queries || []).map((q) =>
        this.search({
          ...q,
          salesChannelIds: q.salesChannelIds ?? params.salesChannelIds,
          enforceStorefrontVisibility:
            q.enforceStorefrontVisibility ?? params.enforceStorefrontVisibility,
        })
      )
    )
    return {
      results,
      total_time_ms: Date.now() - startTime,
    }
  }

  // ===========================================================================
  // Merchandising: Synonyms, Curations (Overrides), Stopwords & Conversations
  // ===========================================================================

  public async listSynonyms(
    entity: string,
    locale?: string
  ): Promise<TypesenseSynonymInput[]> {
    const client = this.getClient()
    const { physicalName } = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )
    try {
      const res = await client.collections(physicalName).synonyms().retrieve()
      return Array.isArray(res?.synonyms) ? res.synonyms : []
    } catch {
      return []
    }
  }

  public async upsertSynonym(
    entity: string,
    input: TypesenseSynonymInput,
    locale?: string
  ): Promise<TypesenseSynonymInput> {
    const client = this.getClient()
    const { physicalName } = await this.ensureCollectionReady(entity, locale)
    const { id, ...body } = input
    const payload: Record<string, any> = {
      synonyms: input.synonyms,
      ...(input.root ? { root: input.root } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
      ...(input.symbols_to_index
        ? { symbols_to_index: input.symbols_to_index }
        : {}),
    }
    return await client.collections(physicalName).synonyms().upsert(id, payload)
  }

  public async deleteSynonym(
    entity: string,
    synonymId: string,
    locale?: string
  ): Promise<{ id: string }> {
    const client = this.getClient()
    const { physicalName } = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )
    return await client
      .collections(physicalName)
      .synonyms(synonymId)
      .delete()
  }

  public async listCurations(
    entity: string,
    locale?: string
  ): Promise<TypesenseCurationInput[]> {
    const client = this.getClient()
    const { physicalName } = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )
    try {
      const res = await client.collections(physicalName).overrides().retrieve()
      return Array.isArray(res?.overrides) ? res.overrides : []
    } catch {
      return []
    }
  }

  public async upsertCuration(
    entity: string,
    input: TypesenseCurationInput,
    locale?: string
  ): Promise<TypesenseCurationInput> {
    const client = this.getClient()
    const { physicalName } = await this.ensureCollectionReady(entity, locale)
    const { id, ...body } = input
    return await client.collections(physicalName).overrides().upsert(id, body)
  }

  public async deleteCuration(
    entity: string,
    curationId: string,
    locale?: string
  ): Promise<{ id: string }> {
    const client = this.getClient()
    const { physicalName } = await this.resolvePhysicalCollectionName(
      entity,
      locale
    )
    return await client
      .collections(physicalName)
      .overrides(curationId)
      .delete()
  }

  public async listStopwordSets(): Promise<TypesenseStopwordSetInput[]> {
    const client = this.getClient()
    try {
      const res = await client.stopwords().retrieve()
      return Array.isArray(res?.stopwords) ? res.stopwords : []
    } catch {
      return []
    }
  }

  public async upsertStopwordSet(
    input: TypesenseStopwordSetInput
  ): Promise<TypesenseStopwordSetInput> {
    const client = this.getClient()
    const { id, ...body } = input
    return await client.stopwords().upsert(id, body)
  }

  public async deleteStopwordSet(id: string): Promise<{ id: string }> {
    const client = this.getClient()
    return await client.stopwords(id).delete()
  }

  public async listConversationModels(): Promise<Record<string, any>[]> {
    const client = this.getClient()
    try {
      const res = await client.conversations().models().retrieve()
      return Array.isArray(res) ? res : []
    } catch {
      return []
    }
  }

  public async upsertConversationModel(
    input: Record<string, any>
  ): Promise<Record<string, any>> {
    const client = this.getClient()
    if (input.id) {
      try {
        await client.conversations().models(input.id).retrieve()
        return await client.conversations().models(input.id).update(input)
      } catch {
        return await client.conversations().models().create(input)
      }
    }
    return await client.conversations().models().create(input)
  }

  // ===========================================================================
  // Scoped Search-Only API Keys for Storefront InstantSearch
  // ===========================================================================

  /**
   * Generates a cryptographically signed Typesense Scoped Search API Key
   * with embedded security filters (`status:=published`, `sales_channel_ids`, TTL expiration).
   */
  public async generateScopedSearchToken(
    input: TypesenseScopedKeyInput = {}
  ): Promise<{
    scopedApiKey: string
    collections: string[]
    filterBy: string
    expiresAt: number
    host: TypesenseNodeConfig
  }> {
    const parentKey =
      this.options_.searchOnlyApiKey ||
      process.env.TYPESENSE_SEARCH_ONLY_API_KEY ||
      this.options_.apiKey ||
      ""

    if (!parentKey) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Cannot generate scoped search key: searchOnlyApiKey or apiKey must be configured"
      )
    }

    const entities =
      input.entities && input.entities.length > 0
        ? input.entities
        : ["products", "categories", "collections"]
    const locale = input.locale || this.options_.defaultLocale || "en"
    const collections = entities.map((e) => this.getAliasName(e, locale))

    const securityFilter = buildStorefrontSecurityFilter({
      entity: entities[0] || "products",
      salesChannelIds: input.salesChannelIds,
    })
    const filterBy = combineTypesenseFilters(
      securityFilter,
      input.additionalFilterBy
    )

    const ttl = input.expiresInSeconds || this.options_.scopedKeyTtlSeconds || 3600
    const expiresAt = Math.floor(Date.now() / 1000) + ttl

    const keyParams: Record<string, any> = {
      expires_at: expiresAt,
      ...(filterBy ? { filter_by: filterBy } : {}),
      ...(input.limitMultiSearches
        ? { limit_multi_searches: input.limitMultiSearches }
        : {}),
    }

    let scopedApiKey: string
    const client = this.getClient()
    if (typeof client?.keys === "function" && typeof client.keys().generateScopedSearchKey === "function") {
      scopedApiKey = client.keys().generateScopedSearchKey(parentKey, keyParams)
    } else {
      const paramsJson = JSON.stringify(keyParams)
      const digest = createHmac("sha256", parentKey)
        .update(paramsJson)
        .digest("base64")
      const rawScoped = `${digest}${parentKey.slice(0, 4)}${paramsJson}`
      scopedApiKey = Buffer.from(rawScoped, "utf-8").toString("base64")
    }

    return {
      scopedApiKey,
      collections,
      filterBy,
      expiresAt,
      host: this.options_.nodes?.[0] || {
        host: "127.0.0.1",
        port: 8108,
        protocol: "http",
      },
    }
  }

  // ===========================================================================
  // Cluster Health, Overview & Analytics
  // ===========================================================================

  public async getClusterOverview(): Promise<{
    healthy: boolean
    node: TypesenseNodeConfig
    collections: Array<{
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
      createdAt: number | null
    }>
    recentSyncJobs: any[]
  }> {
    const client = this.getClient()
    let healthy = false
    try {
      const healthRes = await client.health.retrieve()
      healthy = Boolean(healthRes?.ok)
    } catch {
      healthy = false
    }

    let physicalMap = new Map<string, any>()
    let aliasMap = new Map<string, string>()
    try {
      const allColls = await client.collections().retrieve()
      if (Array.isArray(allColls)) {
        for (const c of allColls) {
          if (c?.name) physicalMap.set(c.name, c)
        }
      }
      const allAliases = await client.aliases().retrieve()
      if (Array.isArray(allAliases?.aliases)) {
        for (const a of allAliases.aliases) {
          if (a?.name && a?.collection_name) {
            aliasMap.set(a.name, a.collection_name)
          }
        }
      }
    } catch {
      // Cluster unreachable or uninitialized
    }

    const definitions = await this.getAllEntityDefinitions()
    const collections = []

    for (const def of definitions) {
      const aliasName = this.getAliasName(def.entity)
      const physicalName =
        aliasMap.get(aliasName) ||
        (physicalMap.has(aliasName) ? aliasName : null)
      const collMeta = physicalName ? physicalMap.get(physicalName) : null

      let synonymsCount = 0
      let curationsCount = 0
      if (physicalName && healthy) {
        const [syns, curations] = await Promise.all([
          this.listSynonyms(def.entity),
          this.listCurations(def.entity),
        ])
        synonymsCount = syns.length
        curationsCount = curations.length
      }

      const activeEmbedder =
        def.embedder !== undefined ? def.embedder : this.options_.embedder

      collections.push({
        entity: def.entity,
        enabled: def.enabled !== false,
        isCustom: !BUILT_IN_ENTITIES.includes(def.entity as any),
        aliasName,
        physicalCollection: physicalName,
        numDocuments: collMeta?.num_documents ?? 0,
        numFields: Array.isArray(collMeta?.fields)
          ? collMeta.fields.length
          : def.schemaFields?.length ?? 0,
        hasVectorEmbedder: Boolean(activeEmbedder?.enabled),
        embedderModel: activeEmbedder?.enabled
          ? activeEmbedder.model_name
          : null,
        synonymsCount,
        curationsCount,
        createdAt: collMeta?.created_at ?? null,
      })
    }

    let recentSyncJobs: any[] = []
    try {
      recentSyncJobs = await this.listTypesenseSyncJobs(
        {},
        {
          take: 25,
          order: { created_at: "DESC" },
        }
      )
    } catch {
      recentSyncJobs = []
    }

    return {
      healthy,
      node: this.options_.nodes?.[0] || {
        host: "127.0.0.1",
        port: 8108,
        protocol: "http",
      },
      collections,
      recentSyncJobs,
    }
  }

  public async recordSearchInteraction(params: {
    entity?: string
    query: string
    clickedDocumentId?: string
    clickPosition?: number
    converted?: boolean
  }): Promise<boolean> {
    const normalized = String(params.query || "")
      .trim()
      .toLowerCase()
    if (!normalized) return false

    try {
      const existing = await this.listTypesenseSearchAnalytics(
        {
          entity: params.entity || "products",
          normalized_query: normalized,
        },
        {
          take: 1,
          order: { created_at: "DESC" },
        }
      )

      if (existing.length > 0) {
        await this.updateTypesenseSearchAnalytics({
          id: existing[0].id,
          ...(params.clickedDocumentId
            ? { clicked_document_id: params.clickedDocumentId }
            : {}),
          ...(params.clickPosition !== undefined
            ? { click_position: params.clickPosition }
            : {}),
          ...(params.converted !== undefined
            ? { converted: params.converted }
            : {}),
        })
      } else {
        await this.createTypesenseSearchAnalytics({
          entity: params.entity || "products",
          query: params.query.trim(),
          normalized_query: normalized,
          mode: "keyword",
          locale: this.options_.defaultLocale || "en",
          results_count: 1,
          is_no_hit: false,
          latency_ms: 0,
          clicked_document_id: params.clickedDocumentId || null,
          click_position: params.clickPosition ?? null,
          converted: Boolean(params.converted),
        })
      }
      return true
    } catch {
      return false
    }
  }

  public async getAnalyticsSummary(params?: {
    entity?: string
    limit?: number
  }): Promise<{
    totalSearches: number
    noHitSearches: number
    noHitRate: number
    clickThroughRate: number
    conversionRate: number
    averageLatencyMs: number
    popularQueries: Array<{
      query: string
      count: number
      avgResults: number
      clicks: number
      conversions: number
    }>
    noHitQueries: Array<{
      query: string
      count: number
    }>
  }> {
    const limit = params?.limit || 15
    try {
      const filters: Record<string, any> = {}
      if (params?.entity) {
        filters.entity = params.entity
      }
      const rows = await this.listTypesenseSearchAnalytics(filters, {
        take: 1000,
        order: { created_at: "DESC" },
      })

      if (!rows || rows.length === 0) {
        return {
          totalSearches: 0,
          noHitSearches: 0,
          noHitRate: 0,
          clickThroughRate: 0,
          conversionRate: 0,
          averageLatencyMs: 0,
          popularQueries: [],
          noHitQueries: [],
        }
      }

      let noHitSearches = 0
      let clickedCount = 0
      let convertedCount = 0
      let totalLatency = 0

      const queryMap = new Map<
        string,
        {
          query: string
          count: number
          totalResults: number
          clicks: number
          conversions: number
          isNoHit: boolean
        }
      >()

      for (const r of rows) {
        const key = String(r.normalized_query || r.query || "").toLowerCase()
        if (!key) continue

        if (r.is_no_hit || r.results_count === 0) {
          noHitSearches += 1
        }
        if (r.clicked_document_id) {
          clickedCount += 1
        }
        if (r.converted) {
          convertedCount += 1
        }
        totalLatency += Number(r.latency_ms || 0)

        const entry = queryMap.get(key) || {
          query: r.query || key,
          count: 0,
          totalResults: 0,
          clicks: 0,
          conversions: 0,
          isNoHit: false,
        }
        entry.count += 1
        entry.totalResults += Number(r.results_count || 0)
        if (r.clicked_document_id) entry.clicks += 1
        if (r.converted) entry.conversions += 1
        if (r.is_no_hit || r.results_count === 0) entry.isNoHit = true
        queryMap.set(key, entry)
      }

      const totalSearches = rows.length
      const allAggregated = Array.from(queryMap.values())

      const popularQueries = allAggregated
        .filter((q) => !q.isNoHit)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((q) => ({
          query: q.query,
          count: q.count,
          avgResults: Math.round(q.totalResults / q.count),
          clicks: q.clicks,
          conversions: q.conversions,
        }))

      const noHitQueries = allAggregated
        .filter((q) => q.isNoHit)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((q) => ({
          query: q.query,
          count: q.count,
        }))

      return {
        totalSearches,
        noHitSearches,
        noHitRate: Number(((noHitSearches / totalSearches) * 100).toFixed(1)),
        clickThroughRate: Number(
          ((clickedCount / totalSearches) * 100).toFixed(1)
        ),
        conversionRate: Number(
          ((convertedCount / totalSearches) * 100).toFixed(1)
        ),
        averageLatencyMs: Math.round(totalLatency / totalSearches),
        popularQueries,
        noHitQueries,
      }
    } catch {
      return {
        totalSearches: 0,
        noHitSearches: 0,
        noHitRate: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        averageLatencyMs: 0,
        popularQueries: [],
        noHitQueries: [],
      }
    }
  }

  // ===========================================================================
  // Internal DB Helpers (fail-open if DB table is not migrated in isolated unit tests)
  // ===========================================================================

  protected async safeCreateSyncJob(data: {
    entity: string
    collection_name: string
    alias_name?: string | null
    locale?: string
    action: SyncAction
    status: "pending" | "running" | "completed" | "failed"
    documents_processed?: number
    documents_failed?: number
    duration_ms?: number | null
    triggered_by?: string
    error_message?: string | null
    started_at?: Date | null
    completed_at?: Date | null
    metadata?: Record<string, any> | null
  }): Promise<any | null> {
    try {
      return await this.createTypesenseSyncJobs(data as any)
    } catch {
      return null
    }
  }

  protected async safeCompleteSyncJob(
    id: string | undefined,
    updates: Record<string, any>
  ): Promise<void> {
    if (!id) return
    try {
      await this.updateTypesenseSyncJobs({
        id,
        ...updates,
      })
    } catch {
      // Ignore
    }
  }

  protected async safeRecordSearchQuery(data: {
    entity: string
    query: string
    mode: SearchMode
    locale: string
    results_count: number
    latency_ms: number
    sales_channel_id?: string | null
    filters_snapshot?: Record<string, any> | null
  }): Promise<void> {
    try {
      const normalized = data.query.trim().toLowerCase()
      await this.createTypesenseSearchAnalytics({
        entity: data.entity,
        query: data.query.trim(),
        normalized_query: normalized,
        mode: data.mode,
        locale: data.locale,
        results_count: data.results_count,
        is_no_hit: data.results_count === 0,
        latency_ms: data.latency_ms,
        sales_channel_id: data.sales_channel_id || null,
        filters_snapshot: (data.filters_snapshot || null) as any,
      })
    } catch {
      // Ignore analytics write errors
    }
  }
}

export default TypesenseModuleService

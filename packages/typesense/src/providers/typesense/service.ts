import type { Logger, SearchTypes } from "@medusajs/framework/types"
import {
  AbstractSearchProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import Typesense from "typesense"
import type {
  TypesenseNodeConfig,
  TypesenseSearchProviderOptions,
} from "../../types"
import {
  compileFilterObjectToTypesense,
  escapeTypesenseFilterValue,
} from "../../modules/typesense/utils/filter-compiler"

export const TYPESENSE_PROVIDER_IDENTIFIER = "typesense"

type ProviderDependencies = {
  logger?: Logger
}

function mapMedusaFieldTypeToTypesense(
  field: SearchTypes.SearchFieldDefinition
): string {
  const isArray = Boolean(field.array)
  switch (field.type) {
    case "keyword":
    case "text":
      return isArray ? "string[]" : "string"
    case "integer":
      return isArray ? "int64[]" : "int64"
    case "float":
      return isArray ? "float[]" : "float"
    case "date":
      return isArray ? "int64[]" : "int64"
    case "boolean":
      return isArray ? "bool[]" : "bool"
    case "geo":
      return isArray ? "geopoint[]" : "geopoint"
    case "object":
      return isArray ? "object[]" : "object"
    case "vector":
      return "float[]"
    default:
      return isArray ? "string[]" : "string"
  }
}

function flattenIndexFieldsToTypesenseSchema(
  fieldsMap: Record<string, SearchTypes.SearchFieldDefinition>,
  prefix = ""
): Array<Record<string, any>> {
  const schemaFields: Array<Record<string, any>> = []

  for (const [key, def] of Object.entries(fieldsMap || {})) {
    const fullName = prefix ? `${prefix}.${key}` : key
    if (fullName === "id") {
      continue
    }

    const tsType = mapMedusaFieldTypeToTypesense(def)
    const providerFieldOpts =
      (def.provider_options?.typesense as Record<string, any>) || {}

    const isSearchable = Boolean(def.searchable)
    const isFilterable = Boolean(def.filterable)
    const isSortable = Boolean(def.sortable)
    const isFacetable = Boolean(def.facetable)

    const schemaEntry: Record<string, any> = {
      name: fullName,
      type: tsType,
      optional: true,
      facet: isFacetable || isFilterable,
      sort: isSortable,
      index: isSearchable || isFilterable || isFacetable || isSortable,
      ...(def.type === "text" ? { stem: true } : {}),
      ...(def.type === "vector" && def.dimensions
        ? { num_dim: def.dimensions }
        : {}),
      ...providerFieldOpts,
    }

    schemaFields.push(schemaEntry)

    if (def.type === "object" && def.fields) {
      schemaFields.push(
        ...flattenIndexFieldsToTypesenseSchema(def.fields, fullName)
      )
    }
  }

  if (!schemaFields.some((f) => f.name === ".*")) {
    schemaFields.push({
      name: ".*",
      type: "auto",
      optional: true,
    })
  }

  return schemaFields
}

function encodeDocumentDates(
  doc: Record<string, any>,
  fieldsMap: Record<string, SearchTypes.SearchFieldDefinition>
): Record<string, any> {
  const result: Record<string, any> = { ...doc }
  for (const [key, def] of Object.entries(fieldsMap || {})) {
    const val = result[key]
    if (val === undefined || val === null) continue
    if (def.type === "date") {
      if (val instanceof Date) {
        result[key] = Math.floor(val.getTime() / 1000)
      } else if (typeof val === "string") {
        const parsed = Date.parse(val)
        if (!Number.isNaN(parsed)) {
          result[key] = Math.floor(parsed / 1000)
        }
      }
    }
  }
  return result
}

export class TypesenseSearchProviderService extends AbstractSearchProviderService {
  static override identifier = TYPESENSE_PROVIDER_IDENTIFIER

  protected readonly logger_?: Logger
  protected readonly options_: TypesenseSearchProviderOptions
  protected client_: any

  constructor(
    { logger }: ProviderDependencies = {},
    options: TypesenseSearchProviderOptions = {}
  ) {
    super()
    this.logger_ = logger
    this.options_ = options
    this.client_ = this.createClient(options)
  }

  protected createClient(options: TypesenseSearchProviderOptions): any {
    const merged = { ...(options.config || {}), ...options }
    const nodes: TypesenseNodeConfig[] = []
    if (Array.isArray(merged.nodes) && merged.nodes.length > 0) {
      nodes.push(...merged.nodes)
    } else {
      const hostUrl =
        merged.host || process.env.TYPESENSE_HOST || "http://127.0.0.1:8108"
      if (hostUrl.startsWith("http://") || hostUrl.startsWith("https://")) {
        const parsed = new URL(hostUrl)
        const protocol = parsed.protocol === "https:" ? "https" : "http"
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
      } else {
        nodes.push({
          host: hostUrl,
          port: Number(process.env.TYPESENSE_PORT || 8108),
          protocol:
            process.env.TYPESENSE_PROTOCOL === "https" ? "https" : "http",
        })
      }
    }

    const apiKey =
      merged.apiKey ||
      process.env.TYPESENSE_API_KEY ||
      "missing-typesense-api-key"

    const ClientConstructor =
      (Typesense as any).Client || (Typesense as any).default?.Client
    return new ClientConstructor({
      nodes,
      ...(merged.nearestNode ? { nearestNode: merged.nearestNode } : {}),
      apiKey,
      connectionTimeoutSeconds: merged.connectionTimeoutSeconds ?? 10,
      numRetries: merged.numRetries ?? 3,
      retryIntervalSeconds: merged.retryIntervalSeconds ?? 0.5,
    })
  }

  public setClient(client: any): void {
    this.client_ = client
  }

  override async upsertIndex({
    index,
  }: {
    index: SearchTypes.ResolvedSearchIndexDefinition
  }): Promise<SearchTypes.SearchTask> {
    const physicalName = index.physical_name
    const fields = flattenIndexFieldsToTypesenseSchema(index.fields)
    const providerIndexOpts =
      (index.settings?.provider_options?.typesense as Record<string, any>) || {}

    const schema: Record<string, any> = {
      name: physicalName,
      enable_nested_fields: true,
      fields,
      ...providerIndexOpts,
    }

    try {
      await this.client_.collections(physicalName).delete()
    } catch {
      // Collection did not exist
    }

    await this.client_.collections().create(schema)
    return {
      index: physicalName,
      status: "succeeded",
    }
  }

  override async deleteIndex({
    index,
  }: {
    index: string
  }): Promise<SearchTypes.SearchTask> {
    try {
      await this.client_.collections(index).delete()
    } catch {
      // Ignore if already deleted
    }
    return {
      index,
      status: "succeeded",
    }
  }

  override async listIndexes(): Promise<SearchTypes.SearchIndexInfo[]> {
    const collections = await this.client_.collections().retrieve()
    if (!Array.isArray(collections)) {
      return []
    }
    return collections.map((c: any) => ({
      name: String(c.name),
      provider: TYPESENSE_PROVIDER_IDENTIFIER,
      document_count: Number(c.num_documents ?? 0),
    }))
  }

  override async upsertDocuments({
    index,
    definition,
    documents,
  }: {
    index: string
    definition: SearchTypes.ResolvedSearchIndexDefinition
    documents: SearchTypes.SearchDocument[]
  }): Promise<SearchTypes.SearchTask> {
    if (!Array.isArray(documents) || documents.length === 0) {
      return { index, status: "succeeded" }
    }

    const primaryKey = definition.primary_key || "id"
    const normalizedDocs = documents.map((doc: any) => {
      const encoded = encodeDocumentDates(doc, definition.fields)
      return {
        ...encoded,
        id: String(doc[primaryKey] ?? doc.id),
      }
    })

    await this.client_
      .collections(index)
      .documents()
      .import(normalizedDocs, { action: "upsert" })

    return {
      index,
      status: "succeeded",
    }
  }

  override async deleteDocuments({
    index,
    filters,
  }: SearchTypes.SearchDeleteDocumentsInput): Promise<SearchTypes.SearchTask> {
    const rawFilters = (filters || {}) as Record<string, any>
    const idFilter = rawFilters.id
    if (
      typeof idFilter === "string" &&
      Object.keys(rawFilters).length === 1
    ) {
      try {
        await this.client_.collections(index).documents(idFilter).delete()
      } catch {
        // Ignore if not found
      }
      return { index, status: "succeeded" }
    }

    if (
      Array.isArray(idFilter) &&
      Object.keys(rawFilters).length === 1
    ) {
      const escaped = idFilter.map((v) => escapeTypesenseFilterValue(String(v)))
      if (escaped.length > 0) {
        await this.client_
          .collections(index)
          .documents()
          .delete({ filter_by: `id:=[${escaped.join(",")}]` })
      }
      return { index, status: "succeeded" }
    }

    const compiled = compileFilterObjectToTypesense(rawFilters)
    if (compiled) {
      await this.client_
        .collections(index)
        .documents()
        .delete({ filter_by: compiled })
    }

    return { index, status: "succeeded" }
  }

  override async clearIndex({
    index,
  }: {
    index: string
  }): Promise<SearchTypes.SearchTask> {
    await this.client_
      .collections(index)
      .documents()
      .delete({ filter_by: "id:!=``" })
    return { index, status: "succeeded" }
  }

  protected buildTypesenseQueryParams(
    input: SearchTypes.ProviderSearchQuery
  ): {
    collection: string
    params: Record<string, any>
    skip: number
    take: number
    facetRequests: SearchTypes.SearchFacetRequest[]
  } {
    const definition = input.index
    const searchableFields: Array<{ name: string; weight: number }> = []

    const walkSearchable = (
      map: Record<string, SearchTypes.SearchFieldDefinition>,
      prefix = ""
    ) => {
      for (const [k, f] of Object.entries(map || {})) {
        const path = prefix ? `${prefix}.${k}` : k
        if (f.searchable) {
          const weight =
            typeof f.searchable === "object" &&
            typeof f.searchable.weight === "number"
              ? f.searchable.weight
              : 1
          searchableFields.push({ name: path, weight })
        }
        if (f.type === "object" && f.fields) {
          walkSearchable(f.fields, path)
        }
      }
    }
    walkSearchable(definition.fields)

    const requestedSearchFields = input.search_options?.attributes_to_search_on
    const queryByList =
      requestedSearchFields && requestedSearchFields.length > 0
        ? requestedSearchFields
        : searchableFields.length > 0
          ? searchableFields.map((s) => s.name)
          : ["title", "name"]

    const queryByWeights =
      !requestedSearchFields && searchableFields.length > 0
        ? searchableFields.map((s) => s.weight).join(",")
        : undefined

    const skip = Math.max(0, input.pagination?.skip ?? 0)
    const take = Math.max(1, input.pagination?.take ?? 20)
    const page = Math.floor(skip / take) + 1

    const filterBy = compileFilterObjectToTypesense(
      input.filters as Record<string, any>
    )

    const sortClauses: string[] = []
    if (input.pagination?.order) {
      for (const [field, dir] of Object.entries(input.pagination.order)) {
        const direction = String(dir).toLowerCase() === "asc" ? "asc" : "desc"
        if (field === "_score") {
          sortClauses.push(`_text_match:${direction}`)
        } else {
          sortClauses.push(`${field}:${direction}`)
        }
      }
    }

    const facetRequests: SearchTypes.SearchFacetRequest[] = (
      input.search_options?.facets || []
    ).map((f) => (typeof f === "string" ? { field: f, type: "value" } : f))

    const facetByParts: string[] = []
    for (const freq of facetRequests) {
      if (freq.type === "range" && Array.isArray(freq.ranges)) {
        const rangeSpecs = freq.ranges
          .map((r, idx) => {
            const key = r.key || `range_${idx}`
            const from = r.from !== undefined ? r.from : 0
            const to = r.to !== undefined ? r.to : ""
            return `${key}:[${from}, ${to}]`
          })
          .join(", ")
        facetByParts.push(`${freq.field}(${rangeSpecs})`)
      } else {
        facetByParts.push(freq.field)
      }
    }

    const highlightOpts = input.search_options?.highlight
    const highlightFields =
      typeof highlightOpts === "object" && Array.isArray(highlightOpts.fields)
        ? highlightOpts.fields.join(",")
        : undefined

    const vectorOpts = input.search_options?.vector
    let vectorQuery: string | undefined
    if (vectorOpts) {
      const vecField = vectorOpts.field || "embedding"
      const alpha = vectorOpts.semantic_ratio ?? (input.q ? 0.5 : 1.0)
      const vecVals = Array.isArray(vectorOpts.value)
        ? vectorOpts.value.join(",")
        : ""
      vectorQuery = `${vecField}:([${vecVals}], alpha: ${alpha})`
    }

    const providerQueryOpts =
      (input.search_options?.provider_options?.typesense as Record<
        string,
        any
      >) || {}

    const params: Record<string, any> = {
      q: input.q && input.q.trim().length > 0 ? input.q.trim() : "*",
      query_by: queryByList.join(","),
      ...(queryByWeights ? { query_by_weights: queryByWeights } : {}),
      per_page: take,
      page,
      ...(filterBy ? { filter_by: filterBy } : {}),
      ...(sortClauses.length > 0 ? { sort_by: sortClauses.join(",") } : {}),
      ...(facetByParts.length > 0 ? { facet_by: facetByParts.join(",") } : {}),
      ...(Array.isArray(input.attributes_to_retrieve) &&
      input.attributes_to_retrieve.length > 0
        ? { include_fields: input.attributes_to_retrieve.join(",") }
        : {}),
      ...(highlightFields ? { highlight_fields: highlightFields } : {}),
      ...(typeof highlightOpts === "object" && highlightOpts.pre_tag
        ? { highlight_start_tag: highlightOpts.pre_tag }
        : {}),
      ...(typeof highlightOpts === "object" && highlightOpts.post_tag
        ? { highlight_end_tag: highlightOpts.post_tag }
        : {}),
      ...(input.search_options?.distinct
        ? { group_by: input.search_options.distinct, group_limit: 1 }
        : {}),
      ...(input.search_options?.typo_tolerance === false
        ? { num_typos: 0 }
        : {}),
      ...(vectorQuery ? { vector_query: vectorQuery } : {}),
      ...providerQueryOpts,
    }

    return {
      collection: definition.physical_name,
      params,
      skip,
      take,
      facetRequests,
    }
  }

  protected mapTypesenseResult(
    raw: any,
    input: SearchTypes.ProviderSearchQuery,
    meta: {
      skip: number
      take: number
      facetRequests: SearchTypes.SearchFacetRequest[]
    }
  ): SearchTypes.SearchResult {
    const primaryKey = input.index.primary_key || "id"
    const rawHits: any[] = Array.isArray(raw?.hits)
      ? raw.hits
      : Array.isArray(raw?.grouped_hits)
        ? raw.grouped_hits.flatMap((g: any) => g?.hits || [])
        : []

    const hits: SearchTypes.SearchHit[] = rawHits.map((h: any) => {
      const doc = (h.document || {}) as Record<string, unknown>
      const highlightsMap: Record<string, string[]> = {}
      if (Array.isArray(h.highlights)) {
        for (const hl of h.highlights) {
          if (hl?.field) {
            if (Array.isArray(hl.snippets)) {
              highlightsMap[hl.field] = hl.snippets
            } else if (typeof hl.snippet === "string") {
              highlightsMap[hl.field] = [hl.snippet]
            }
          }
        }
      }
      return {
        id: String(doc[primaryKey] ?? doc.id ?? ""),
        ...(input.search_options?.include_score && h.text_match !== undefined
          ? { score: Number(h.text_match) }
          : {}),
        document: doc,
        ...(Object.keys(highlightsMap).length > 0
          ? { highlights: highlightsMap }
          : {}),
      }
    })

    const facetsResult: Record<string, SearchTypes.SearchFacetResult> = {}
    const facetCounts: any[] = Array.isArray(raw?.facet_counts)
      ? raw.facet_counts
      : []

    for (const freq of meta.facetRequests) {
      const fc = facetCounts.find((c: any) => c?.field_name === freq.field)
      if (!fc) continue

      if (freq.type === "stats") {
        facetsResult[freq.field] = {
          type: "stats",
          min: Number(fc.stats?.min ?? 0),
          max: Number(fc.stats?.max ?? 0),
          ...(fc.stats?.avg !== undefined ? { avg: Number(fc.stats.avg) } : {}),
          ...(fc.stats?.sum !== undefined ? { sum: Number(fc.stats.sum) } : {}),
          count: Number(fc.stats?.total_values ?? 0),
        }
      } else if (freq.type === "range" && Array.isArray(freq.ranges)) {
        const countsArr: any[] = Array.isArray(fc.counts) ? fc.counts : []
        facetsResult[freq.field] = {
          type: "range",
          ranges: freq.ranges.map((r, idx) => {
            const key = r.key || `range_${idx}`
            const match = countsArr.find((c: any) => c?.value === key)
            return {
              key,
              ...(r.from !== undefined ? { from: r.from } : {}),
              ...(r.to !== undefined ? { to: r.to } : {}),
              count: Number(match?.count ?? 0),
            }
          }),
        }
      } else {
        const countsArr: any[] = Array.isArray(fc.counts) ? fc.counts : []
        facetsResult[freq.field] = {
          type: "value",
          values: countsArr.map((c: any) => ({
            value: String(c.value),
            count: Number(c.count ?? 0),
          })),
        }
      }
    }

    const countStrategy = input.search_options?.count ?? "estimated"
    return {
      hits,
      ...(Object.keys(facetsResult).length > 0 ? { facets: facetsResult } : {}),
      metadata: {
        skip: meta.skip,
        take: meta.take,
        count:
          countStrategy === "none" ? null : Number(raw?.found ?? hits.length),
        query: input.q,
        processing_time_ms: Number(raw?.search_time_ms ?? 0),
      },
    }
  }

  override async search(
    input: SearchTypes.ProviderSearchQuery
  ): Promise<SearchTypes.SearchResult> {
    const built = this.buildTypesenseQueryParams(input)
    const raw = await this.client_
      .collections(built.collection)
      .documents()
      .search(built.params)
    return this.mapTypesenseResult(raw, input, built)
  }

  override async searchMany(
    inputs: SearchTypes.ProviderSearchQuery[]
  ): Promise<SearchTypes.SearchResult[]> {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return []
    }
    const builtList = inputs.map((inp) => this.buildTypesenseQueryParams(inp))
    const searches = builtList.map((b) => ({
      collection: b.collection,
      ...b.params,
    }))

    const multiRes = await this.client_.multiSearch.perform({ searches })
    const results: any[] = Array.isArray(multiRes?.results)
      ? multiRes.results
      : []

    return builtList.map((b, idx) =>
      this.mapTypesenseResult(results[idx] || {}, inputs[idx], b)
    )
  }
}

export default ModuleProvider(Modules.SEARCH, {
  services: [TypesenseSearchProviderService],
})

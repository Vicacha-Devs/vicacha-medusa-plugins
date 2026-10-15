import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { TypesenseModuleService } from "../modules/typesense/service"
import { TypesenseSearchProviderService } from "../providers/typesense/service"
import {
  defineCategorySearchIndex,
  defineCollectionSearchIndex,
  defineCustomSearchIndex,
  defineProductSearchIndex,
} from "../indexes"

function createInMemoryMockTypesenseClient() {
  const collections = new Map<
    string,
    {
      schema: Record<string, any>
      documents: Map<string, Record<string, any>>
      synonyms: Map<string, Record<string, any>>
      overrides: Map<string, Record<string, any>>
    }
  >()
  const aliases = new Map<string, string>()
  const stopwords = new Map<string, Record<string, any>>()
  const lastSearchCalls: Array<Record<string, any>> = []
  const lastMultiSearchCalls: Array<Record<string, any>[]> = []

  const getOrCreateCollection = (name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        schema: { name, fields: [] },
        documents: new Map(),
        synonyms: new Map(),
        overrides: new Map(),
      })
    }
    return collections.get(name)!
  }

  const client: any = {
    lastSearchCalls,
    lastMultiSearchCalls,
    health: {
      retrieve: async () => ({ ok: true }),
    },
    collections: (name?: string) => {
      if (!name) {
        return {
          retrieve: async () =>
            Array.from(collections.values()).map((c) => ({
              ...c.schema,
              num_documents: c.documents.size,
            })),
          create: async (schema: Record<string, any>) => {
            collections.set(schema.name, {
              schema,
              documents: new Map(),
              synonyms: new Map(),
              overrides: new Map(),
            })
            return schema
          },
        }
      }

      return {
        retrieve: async () => {
          const c = collections.get(name)
          if (!c) {
            throw new Error(`Collection ${name} not found`)
          }
          return {
            ...c.schema,
            num_documents: c.documents.size,
          }
        },
        delete: async () => {
          collections.delete(name)
          return { name }
        },
        documents: (docId?: string) => {
          const coll = getOrCreateCollection(name)
          if (docId) {
            return {
              retrieve: async () => {
                const doc = coll.documents.get(docId)
                if (!doc) throw new Error("Not found")
                return doc
              },
              delete: async () => {
                coll.documents.delete(docId)
                return { id: docId }
              },
            }
          }
          return {
            import: async (docs: Record<string, any>[]) => {
              for (const d of docs) {
                coll.documents.set(String(d.id), d)
              }
              return docs.map(() => ({ success: true }))
            },
            delete: async () => {
              const count = coll.documents.size
              coll.documents.clear()
              return { num_deleted: count }
            },
            search: async (params: Record<string, any>) => {
              lastSearchCalls.push({ collection: name, ...params })
              const allDocs = Array.from(coll.documents.values())
              return {
                hits: allDocs.map((doc) => ({
                  document: doc,
                  highlights: [
                    {
                      field: "title",
                      snippet: `<mark>${doc.title || doc.name || ""}</mark>`,
                    },
                  ],
                  text_match: 100,
                })),
                found: allDocs.length,
                out_of: allDocs.length,
                page: params.page || 1,
                search_time_ms: 4,
                facet_counts: [
                  {
                    field_name: "category_names",
                    counts: [{ value: "Shoes", count: allDocs.length }],
                    stats: { min: 10, max: 100, total_values: allDocs.length },
                  },
                ],
                ...(params.conversation
                  ? {
                      conversation: {
                        answer: "Here are the top matching products.",
                        conversation_id: params.conversation_id || "conv_123",
                        query: params.q,
                      },
                    }
                  : {}),
              }
            },
          }
        },
        synonyms: (synId?: string) => {
          const coll = getOrCreateCollection(name)
          if (synId) {
            return {
              delete: async () => {
                coll.synonyms.delete(synId)
                return { id: synId }
              },
            }
          }
          return {
            retrieve: async () => ({
              synonyms: Array.from(coll.synonyms.values()),
            }),
            upsert: async (id: string, body: Record<string, any>) => {
              const entry = { id, ...body }
              coll.synonyms.set(id, entry)
              return entry
            },
          }
        },
        overrides: (ovrId?: string) => {
          const coll = getOrCreateCollection(name)
          if (ovrId) {
            return {
              delete: async () => {
                coll.overrides.delete(ovrId)
                return { id: ovrId }
              },
            }
          }
          return {
            retrieve: async () => ({
              overrides: Array.from(coll.overrides.values()),
            }),
            upsert: async (id: string, body: Record<string, any>) => {
              const entry = { id, ...body }
              coll.overrides.set(id, entry)
              return entry
            },
          }
        },
      }
    },
    aliases: (aliasName?: string) => {
      if (aliasName) {
        return {
          retrieve: async () => {
            const target = aliases.get(aliasName)
            if (!target) throw new Error("Alias not found")
            return { name: aliasName, collection_name: target }
          },
        }
      }
      return {
        retrieve: async () => ({
          aliases: Array.from(aliases.entries()).map(
            ([name, collection_name]) => ({ name, collection_name })
          ),
        }),
        upsert: async (
          name: string,
          body: { collection_name: string }
        ) => {
          aliases.set(name, body.collection_name)
          return { name, collection_name: body.collection_name }
        },
      }
    },
    stopwords: (stopId?: string) => {
      if (stopId) {
        return {
          delete: async () => {
            stopwords.delete(stopId)
            return { id: stopId }
          },
        }
      }
      return {
        retrieve: async () => ({
          stopwords: Array.from(stopwords.values()),
        }),
        upsert: async (id: string, body: Record<string, any>) => {
          const entry = { id, ...body }
          stopwords.set(id, entry)
          return entry
        },
      }
    },
    multiSearch: {
      perform: async ({ searches }: { searches: Record<string, any>[] }) => {
        lastMultiSearchCalls.push(searches)
        return {
          results: searches.map((s) => ({
            hits: [],
            found: 0,
            out_of: 0,
            page: 1,
            search_time_ms: 2,
            facet_counts: [
              {
                field_name: s.facet_by || "category_names",
                counts: [
                  { value: "Shoes", count: 5 },
                  { value: "Apparel", count: 8 },
                ],
                stats: { min: 1000, max: 5000, avg: 2500, total_values: 13 },
              },
            ],
          })),
        }
      },
    },
  }

  return client
}

describe("TypesenseModuleService & TypesenseSearchProviderService", () => {
  it("executes zero-downtime alias reindex, preserves synonyms/curations across swaps, and searches in hybrid/disjunctive/conversational modes", async () => {
    const service = new TypesenseModuleService(
      {},
      {
        host: "http://127.0.0.1:8108",
        apiKey: "test-admin-key",
        searchOnlyApiKey: "test-search-only-key",
        collectionPrefix: "medusa",
        zeroDowntimeSwap: true,
        customEntities: {
          brands: {
            graphEntity: "brand",
            queryBy: ["name", "description"],
          },
        },
      }
    )

    const mockClient = createInMemoryMockTypesenseClient()
    await service.setClient(mockClient)

    // 1. Initial zero-downtime reindex of products
    const firstReindex = await service.reindexEntityZeroDowntime({
      entity: "products",
      records: [
        {
          id: "prod_1",
          title: "Trail Runner Pro",
          handle: "trail-runner-pro",
          status: "published",
          categories: [{ id: "cat_1", name: "Shoes", handle: "shoes" }],
          variants: [
            {
              id: "var_1",
              sku: "TRP-01",
              inventory_quantity: 10,
              prices: [{ amount: 9900, currency_code: "usd" }],
            },
          ],
        },
      ],
    })

    assert.equal(firstReindex.aliasName, "medusa_products")
    assert.ok(firstReindex.collectionName.startsWith("medusa_products_v_"))
    assert.equal(firstReindex.documentsProcessed, 1)

    // 2. Add a synonym and curation rule to products
    await service.upsertSynonym("products", {
      id: "syn-trail",
      synonyms: ["trail", "hiking", "outdoor"],
    })
    await service.upsertCuration("products", {
      id: "cur-featured",
      rule: { query: "runner", match: "contains" },
      includes: [{ id: "prod_1", position: 1 }],
    })

    // 3. Perform a second zero-downtime reindex and verify synonyms/curations are copied to the new physical collection
    await new Promise((r) => setTimeout(r, 5))
    const secondReindex = await service.reindexEntityZeroDowntime({
      entity: "products",
      records: [
        {
          id: "prod_1",
          title: "Trail Runner Pro",
          handle: "trail-runner-pro",
          status: "published",
        },
        {
          id: "prod_2",
          title: "Alpine Jacket",
          handle: "alpine-jacket",
          status: "published",
        },
      ],
    })

    assert.notEqual(
      secondReindex.collectionName,
      firstReindex.collectionName
    )
    const copiedSynonyms = await service.listSynonyms("products")
    assert.equal(copiedSynonyms.length, 1)
    assert.equal(copiedSynonyms[0].id, "syn-trail")

    const copiedCurations = await service.listCurations("products")
    assert.equal(copiedCurations.length, 1)
    assert.equal(copiedCurations[0].id, "cur-featured")

    // 4. Test Hybrid Vector Search + Storefront Security Filter
    const hybridRes = await service.search({
      entity: "products",
      q: "waterproof trail shoe",
      mode: "hybrid",
      alpha: 0.35,
      salesChannelIds: ["sc_main"],
      enforceStorefrontVisibility: true,
    })

    assert.equal(hybridRes.found, 2)
    const lastSearch =
      mockClient.lastSearchCalls[mockClient.lastSearchCalls.length - 1]
    assert.equal(lastSearch.vector_query, "embedding:([], alpha: 0.35)")
    assert.equal(
      lastSearch.filter_by,
      "(status:=published) && (sales_channel_ids:=[`sc_main`])"
    )

    // 5. Test Disjunctive Faceting via multiSearch
    const disjunctiveRes = await service.search({
      entity: "products",
      q: "shoe",
      filters: { category_names: "Shoes" },
      facets: ["category_names", "in_stock"],
      disjunctiveFacets: true,
    })

    assert.ok(mockClient.lastMultiSearchCalls.length > 0)
    const catFacet = disjunctiveRes.facets.find(
      (f) => f.field_name === "category_names"
    )
    assert.ok(catFacet)
    assert.equal(catFacet.counts.length, 2)

    // 6. Test Custom Entity Indexing ('brands')
    const brandSync = await service.upsertEntityRecords({
      entity: "brands",
      records: [
        { id: "brand_1", name: "NordicPeak", slug: "nordic-peak" },
      ],
    })
    assert.equal(brandSync.documentsProcessed, 1)
    const brandDoc = await service.retrieveIndexedDocument("brands", "brand_1")
    assert.ok(brandDoc)
    assert.equal(brandDoc.name, "NordicPeak")

    // 7. Test Scoped Search-Only API Key generation
    const tokenRes = await service.generateScopedSearchToken({
      salesChannelIds: ["sc_storefront"],
      entities: ["products", "brands"],
      expiresInSeconds: 1800,
    })
    assert.ok(tokenRes.scopedApiKey.length > 20)
    assert.deepEqual(tokenRes.collections, [
      "medusa_products",
      "medusa_brands",
    ])
    assert.ok(tokenRes.filterBy.includes("status:=published"))
    assert.ok(tokenRes.filterBy.includes("sc_storefront"))
  })

  it("implements Medusa 2.21 AbstractSearchProviderService and index factories", async () => {
    const provider = new TypesenseSearchProviderService(
      {},
      {
        host: "http://127.0.0.1:8108",
        apiKey: "test-key",
      }
    )
    const mockClient = createInMemoryMockTypesenseClient()
    provider.setClient(mockClient)

    const prodIndexDef = defineProductSearchIndex()
    const catIndexDef = defineCategorySearchIndex()
    const colIndexDef = defineCollectionSearchIndex()
    const customIndexDef = defineCustomSearchIndex({
      name: "brands",
      entity: "brand",
    })

    assert.equal(prodIndexDef.name, "products")
    assert.equal(catIndexDef.name, "categories")
    assert.equal(colIndexDef.name, "collections")
    assert.equal(customIndexDef.name, "brands")

    const resolvedIndex: any = {
      ...prodIndexDef,
      primary_key: "id",
      provider: "typesense",
      settings: {},
      definition_hash: "hash_1",
      physical_name: "medusa_products_v1",
      fields: (prodIndexDef.fields as any).toFields
        ? (prodIndexDef.fields as any).toFields()
        : prodIndexDef.fields,
    }

    const upsertIdxTask = await provider.upsertIndex({ index: resolvedIndex })
    assert.equal(upsertIdxTask.status, "succeeded")

    const upsertDocsTask = await provider.upsertDocuments({
      index: "medusa_products_v1",
      definition: resolvedIndex,
      documents: [{ id: "prod_10", title: "Canvas Backpack" }],
    })
    assert.equal(upsertDocsTask.status, "succeeded")

    const indexes = await provider.listIndexes()
    assert.equal(indexes.length, 1)
    assert.equal(indexes[0].document_count, 1)

    const searchResult = await provider.search({
      index: resolvedIndex,
      attributes_to_retrieve: ["id", "title"],
      q: "backpack",
      pagination: { skip: 0, take: 10, order: { _score: "DESC" } },
      search_options: {
        include_score: true,
        facets: [{ field: "category_names", type: "value" }],
      },
    })

    assert.equal(searchResult.hits.length, 1)
    assert.equal(searchResult.hits[0].id, "prod_10")
    assert.ok(searchResult.facets?.category_names)
  })
})

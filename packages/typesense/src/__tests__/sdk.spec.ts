import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  TypesenseApiClient,
  typesenseQueryKeys,
  invalidateTypesenseQueries,
  matchesTypesenseQueryKeyPrefix,
  subscribeTypesenseQueryInvalidation,
} from "../sdk"

describe("TypesenseApiClient SDK & Query Keys", () => {
  it("constructs hierarchical query keys and triggers invalidation listeners", () => {
    assert.deepEqual(typesenseQueryKeys.all, ["typesense"])
    assert.deepEqual(typesenseQueryKeys.document("products", "prod_01"), [
      "typesense",
      "documents",
      "products",
      "prod_01",
    ])
    assert.equal(
      matchesTypesenseQueryKeyPrefix(
        typesenseQueryKeys.document("products", "prod_01"),
        typesenseQueryKeys.documentsAll()
      ),
      true
    )

    const events: Array<readonly unknown[]> = []
    const unsub = subscribeTypesenseQueryInvalidation((prefix) => {
      events.push(prefix)
    })
    invalidateTypesenseQueries(typesenseQueryKeys.collections())
    unsub()

    assert.equal(events.length, 1)
    assert.deepEqual(events[0], ["typesense", "collections"])
  })

  it("routes simple store searches via GET and filtered/vector searches via POST", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = []
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method,
        body: init?.body ? String(init.body) : undefined,
      })
      return new Response(
        JSON.stringify({
          found: 1,
          out_of: 1,
          page: 1,
          search_time_ms: 4,
          hits: [],
          documents: [{ id: "prod_01", title: "Cotton Hoodie" }],
          facets: {},
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const storeClient = new TypesenseApiClient(
      "/store",
      "https://api.store.test",
      {
        fetchImpl: mockFetch,
        publishableApiKey: "pk_store_123",
      }
    )

    await storeClient.search({ entity: "product", q: "hoodie", mode: "hybrid" })
    assert.equal(calls[0].method, "GET")
    assert.equal(
      calls[0].url,
      "https://api.store.test/store/typesense/search?entity=product&q=hoodie&mode=hybrid"
    )

    await storeClient.search({
      entity: "product",
      q: "hoodie",
      filters: { in_stock: true },
    })
    assert.equal(calls[1].method, "POST")
    assert.equal(calls[1].url, "https://api.store.test/store/typesense/search")
    assert.ok(calls[1].body?.includes('"in_stock":true'))
  })

  it("handles Admin endpoints and propagates structured API errors", async () => {
    const mockFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/health")) {
        return new Response(
          JSON.stringify({ status: "ok", healthy: true, latency_ms: 3 }),
          { status: 200 }
        )
      }
      return new Response(
        JSON.stringify({ message: "Collection sync failed" }),
        { status: 500 }
      )
    }) as typeof fetch

    const adminClient = new TypesenseApiClient("/admin", "", {
      fetchImpl: mockFetch,
    })

    const health = await adminClient.getHealth()
    assert.equal(health.healthy, true)

    await assert.rejects(
      () => adminClient.syncAllCollections(),
      /Collection sync failed/
    )
  })

  it("exports unified constants, enums, and error maps from src/types", async () => {
    const typesMod = await import("../types")
    assert.equal(typesMod.TYPESENSE_MODULE, "typesense")
    assert.equal(typesMod.EBuiltInEntity.PRODUCTS, "products")
    assert.equal(typesMod.ESearchMode.HYBRID, "hybrid")
    assert.equal(typesMod.ESyncAction.ZERO_DOWNTIME_SWAP, "zero_downtime_swap")
    assert.ok(typesMod.TYPESENSE_ERROR_MAP.CLUSTER_UNREACHABLE)
    assert.equal(
      typesMod.TYPESENSE_ERROR_MAP.CLUSTER_UNREACHABLE.retryable,
      true
    )
  })
})


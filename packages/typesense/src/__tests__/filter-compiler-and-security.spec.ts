import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  assertSafeTypesenseField,
  buildStorefrontSecurityFilter,
  combineTypesenseFilters,
  compileFilterObjectToTypesense,
  compileRangeFacetStrings,
  escapeTypesenseFilterValue,
} from "../modules/typesense/utils/filter-compiler"
import {
  AdminCurationSchema,
  AdminSynonymSchema,
  AdminUpsertEntityConfigSchema,
  StoreSearchParamsSchema,
} from "../api/middlewares"

describe("Filter Compiler, Security Controls & Zod Validation", () => {
  it("escapes literal filter values and rejects malicious field names", () => {
    assert.equal(
      escapeTypesenseFilterValue("running` || status:=`draft"),
      "`running || status:=draft`"
    )
    assert.equal(escapeTypesenseFilterValue(42), "42")
    assert.equal(escapeTypesenseFilterValue(true), "true")

    assert.throws(() => {
      assertSafeTypesenseField("title:=foo || status")
    }, /Invalid Typesense field name/)
  })

  it("compiles complex structured filter objects with operators and logical combinators", () => {
    const compiled = compileFilterObjectToTypesense({
      in_stock: true,
      category_handles: ["shoes", "apparel"],
      min_price: { $gte: 1000, $lte: 5000 },
      $or: [{ material: "Cotton" }, { material: "Wool" }],
    })

    assert.equal(
      compiled,
      "in_stock:=true && category_handles:=[`shoes`,`apparel`] && min_price:>=1000 && min_price:<=5000 && (material:=`Cotton` || material:=`Wool`)"
    )
  })

  it("wraps combined filters in parentheses so storefront security filters cannot be bypassed by OR clauses", () => {
    const secFilter = buildStorefrontSecurityFilter({
      entity: "products",
      salesChannelIds: ["sc_public"],
    })
    const userFilter = "category_names:=`Sale` || status:=`draft`"
    const combined = combineTypesenseFilters(secFilter, userFilter)

    assert.equal(
      combined,
      "((status:=published) && (sales_channel_ids:=[`sc_public`])) && (category_names:=`Sale` || status:=`draft`)"
    )
  })

  it("compiles range facet specifications into Typesense facet_by syntax", () => {
    const ranges = compileRangeFacetStrings([
      {
        field: "min_price",
        ranges: [
          { label: "under_50", from: 0, to: 5000 },
          { label: "over_50", from: 5000, to: 100000 },
        ],
      },
    ])

    assert.deepEqual(ranges, [
      "min_price(under_50:[0, 5000], over_50:[5000, 100000])",
    ])
  })

  it("validates Store and Admin payloads with Zod schemas", () => {
    const validStore = StoreSearchParamsSchema.safeParse({
      q: "sneakers",
      mode: "hybrid",
      alpha: "0.4",
      disjunctive_facets: "true",
      limit: "24",
    })
    assert.equal(validStore.success, true)
    if (validStore.success) {
      assert.equal(validStore.data.mode, "hybrid")
      assert.equal(validStore.data.alpha, 0.4)
      assert.equal(validStore.data.disjunctive_facets, true)
      assert.equal(validStore.data.limit, 24)
    }

    const invalidEntity = StoreSearchParamsSchema.safeParse({
      entity: "../etc/passwd",
    })
    assert.equal(invalidEntity.success, false)

    const validSynonym = AdminSynonymSchema.safeParse({
      id: "syn-shoes",
      synonyms: ["shoes", "sneakers", "trainers"],
    })
    assert.equal(validSynonym.success, true)

    const validCuration = AdminCurationSchema.safeParse({
      id: "cur-hero",
      rule: { query: "winter", match: "contains" },
      includes: [{ id: "prod_1", position: 1 }],
      excludes: [{ id: "prod_99" }],
    })
    assert.equal(validCuration.success, true)

    const validCustomEntity = AdminUpsertEntityConfigSchema.safeParse({
      entity: "brands",
      graph_entity: "brand",
      query_by: ["name", "description"],
      embedder: {
        enabled: true,
        model_name: "ts/all-MiniLM-L6-v2",
      },
    })
    assert.equal(validCustomEntity.success, true)
  })

  it("verifies all 10 Admin UI i18n JSON locale dictionaries have identical keys and non-empty strings", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const jsonDir = path.resolve(process.cwd(), "src/admin/i18n/json")
    const locales = ["en", "es", "de", "fr", "pt", "it", "nl", "pl", "tr", "ar"]

    function collectLeafKeys(obj: Record<string, any>, prefix = ""): string[] {
      const keys: string[] = []
      for (const [k, v] of Object.entries(obj)) {
        const nextKey = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === "object" && !Array.isArray(v)) {
          keys.push(...collectLeafKeys(v, nextKey))
        } else {
          assert.equal(typeof v, "string", `Expected string at ${nextKey}`)
          assert.ok(v.trim().length > 0, `Empty translation at ${nextKey}`)
          keys.push(nextKey)
        }
      }
      return keys.sort()
    }

    const enData = JSON.parse(
      fs.readFileSync(path.join(jsonDir, "en.json"), "utf8")
    )
    const expectedKeys = collectLeafKeys(enData)
    assert.ok(expectedKeys.length > 80)

    for (const loc of locales) {
      const data = JSON.parse(
        fs.readFileSync(path.join(jsonDir, `${loc}.json`), "utf8")
      )
      const locKeys = collectLeafKeys(data)
      assert.deepEqual(
        locKeys,
        expectedKeys,
        `Key mismatch in ${loc}.json`
      )
    }
  })
})

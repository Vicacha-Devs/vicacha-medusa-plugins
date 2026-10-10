import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  transformCategoryToDocument,
  transformCollectionToDocument,
  transformCustomEntityToDocument,
  transformProductToDocument,
  toUnixTimestamp,
} from "../modules/typesense/utils/transformers"
import {
  buildTypesenseCollectionSchema,
  getBuiltInEntityDefaults,
} from "../modules/typesense/utils/schemas"

describe("Document Transformers & Schema Builder", () => {
  it("transforms a Medusa v2 product with variants, prices, options, categories, and sales channels", () => {
    const rawProduct = {
      id: "prod_01",
      title: "Merino Wool Runner",
      subtitle: "Lightweight breathable sneaker",
      description: "Crafted with superfine merino wool.",
      handle: "merino-wool-runner",
      status: "published",
      thumbnail: "https://example.com/shoe.jpg",
      is_giftcard: false,
      discountable: true,
      weight: 320,
      origin_country: "PT",
      material: "Merino Wool",
      created_at: "2026-01-15T10:00:00.000Z",
      updated_at: "2026-02-01T12:00:00.000Z",
      type: { id: "ptyp_01", value: "Footwear" },
      collection: {
        id: "pcol_01",
        title: "Spring Arrivals",
        handle: "spring-arrivals",
      },
      categories: [
        { id: "pcat_1", name: "Shoes", handle: "shoes" },
        { id: "pcat_2", name: "Running", handle: "running" },
      ],
      tags: [
        { id: "ptag_1", value: "eco" },
        { id: "ptag_2", value: "featured" },
      ],
      sales_channels: [{ id: "sc_web" }, { id: "sc_mobile" }],
      options: [
        {
          id: "opt_size",
          title: "Size",
          values: [{ value: "42" }, { value: "43" }],
        },
        {
          id: "opt_color",
          title: "Color",
          values: [{ value: "Navy" }],
        },
      ],
      variants: [
        {
          id: "var_1",
          title: "42 / Navy",
          sku: "MWR-42-NVY",
          barcode: "1234567890123",
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: 12,
          prices: [
            { amount: 12500, currency_code: "usd" },
            { amount: 11500, currency_code: "eur" },
          ],
        },
        {
          id: "var_2",
          title: "43 / Navy",
          sku: "MWR-43-NVY",
          barcode: "1234567890124",
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: 5,
          prices: [
            { amount: 13500, currency_code: "usd" },
            { amount: 12000, currency_code: "eur" },
          ],
        },
      ],
      metadata: { brand: "NordicStep" },
    }

    const doc = transformProductToDocument(rawProduct, { locale: "en" })
    assert.ok(doc)
    assert.equal(doc.id, "prod_01")
    assert.equal(doc.title, "Merino Wool Runner")
    assert.equal(doc.type_value, "Footwear")
    assert.equal(doc.collection_title, "Spring Arrivals")
    assert.deepEqual(doc.category_names, ["Shoes", "Running"])
    assert.deepEqual(doc.tags, ["eco", "featured"])
    assert.deepEqual(doc.sales_channel_ids, ["sc_web", "sc_mobile"])
    assert.deepEqual(doc.variant_skus, ["MWR-42-NVY", "MWR-43-NVY"])
    assert.ok(doc.options_kv.includes("Size:42"))
    assert.ok(doc.options_kv.includes("Color:Navy"))
    assert.equal(doc.min_price, 11500)
    assert.equal(doc.max_price, 13500)
    assert.equal(doc.prices.usd, 12500)
    assert.equal(doc.prices.eur, 11500)
    assert.equal(doc.in_stock, true)
    assert.equal(doc.inventory_quantity, 17)
    assert.equal(doc.created_at_ts, toUnixTimestamp("2026-01-15T10:00:00.000Z"))
  })

  it("applies locale translations when transforming a localized product", () => {
    const rawProduct = {
      id: "prod_es_1",
      title: "Cotton Shirt",
      description: "Soft organic cotton",
      handle: "cotton-shirt",
      translations: {
        es: {
          title: "Camisa de Algodón",
          description: "Algodón orgánico suave",
        },
      },
    }

    const esDoc = transformProductToDocument(rawProduct, { locale: "es" })
    assert.ok(esDoc)
    assert.equal(esDoc.title, "Camisa de Algodón")
    assert.equal(esDoc.description, "Algodón orgánico suave")
    assert.equal(esDoc.locale, "es")
  })

  it("transforms category and collection records accurately", () => {
    const catDoc = transformCategoryToDocument({
      id: "pcat_running",
      name: "Running Shoes",
      handle: "running-shoes",
      is_active: true,
      is_internal: false,
      rank: 2,
      parent_category: {
        id: "pcat_shoes",
        name: "Shoes",
        handle: "shoes",
      },
      category_children: [{ id: "pcat_trail" }],
      products: [{ id: "prod_1" }, { id: "prod_2" }],
    })

    assert.ok(catDoc)
    assert.equal(catDoc.id, "pcat_running")
    assert.equal(catDoc.parent_category_name, "Shoes")
    assert.deepEqual(catDoc.breadcrumb_names, ["Shoes", "Running Shoes"])
    assert.deepEqual(catDoc.child_category_ids, ["pcat_trail"])
    assert.equal(catDoc.product_count, 2)

    const colDoc = transformCollectionToDocument({
      id: "pcol_summer",
      title: "Summer Collection",
      handle: "summer-collection",
      products: [{ id: "prod_1" }],
    })
    assert.ok(colDoc)
    assert.equal(colDoc.title, "Summer Collection")
    assert.equal(colDoc.product_count, 1)
  })

  it("transforms custom entities (e.g. brands, vendors) and converts *_at dates to unix timestamps", () => {
    const brandDoc = transformCustomEntityToDocument(
      {
        id: "brand_01",
        name: "Acme Athletics",
        slug: "acme-athletics",
        country: "US",
        founded_at: "2020-05-01T00:00:00.000Z",
        is_active: true,
      },
      { locale: "en", entity: "brands" }
    )

    assert.ok(brandDoc)
    assert.equal(brandDoc.id, "brand_01")
    assert.equal(brandDoc.name, "Acme Athletics")
    assert.equal(brandDoc.founded_at_ts, toUnixTimestamp("2020-05-01T00:00:00.000Z"))
  })

  it("builds Typesense collection schema with auto-embedding field and locale tokenization", () => {
    const def = getBuiltInEntityDefaults("products")
    const schema = buildTypesenseCollectionSchema({
      collectionName: "medusa_products_es_v_1",
      definition: def,
      globalEmbedder: {
        enabled: true,
        model_name: "ts/all-MiniLM-L6-v2",
        field_name: "embedding",
        embed_from: ["title", "description", "category_names"],
      },
      locale: "es-ES",
    })

    assert.equal(schema.name, "medusa_products_es_v_1")
    assert.equal(schema.enable_nested_fields, true)

    const titleField = schema.fields.find((f: any) => f.name === "title")
    assert.ok(titleField)
    assert.equal(titleField.locale, "es")

    const embeddingField = schema.fields.find((f: any) => f.name === "embedding")
    assert.ok(embeddingField)
    assert.equal(embeddingField.type, "float[]")
    assert.deepEqual(embeddingField.embed.from, [
      "title",
      "description",
      "category_names",
    ])
    assert.equal(
      embeddingField.embed.model_config.model_name,
      "ts/all-MiniLM-L6-v2"
    )
  })
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  adminI18n,
  applyAttributeTemplateWorkflow,
  bulkAssignVariantMediaByOptionWorkflow,
  buildUnifiedProductMedia,
  convertUnit,
  createEmptyTree,
  escapeCsvCell,
  escapeHtml,
  importImageAltsWorkflow,
  normalizeToSI,
  parseVideoMediaItem,
  PRODUCT_EXT_MODULE,
  PRODUCT_EXT_MODULE_KEY,
  ProductExtModuleService,
  ProductExtService,
  resolveTree,
  setProductAttributesWorkflow,
  slugifyAttributeKey,
  SUPPORTED_UI_LOCALES,
  upsertProductExtWorkflow,
  upsertVariantExtWorkflow,
  validateExternalMediaUrl,
  validateTreeDocV1,
} from "../index"
import type { TreeDocV1 } from "../types"

function createTestContainer(serviceInstance?: ProductExtModuleService) {
  const svc = serviceInstance ?? new ProductExtModuleService()
  return {
    service: svc,
    container: {
      resolve(key: string) {
        if (key === PRODUCT_EXT_MODULE || key === PRODUCT_EXT_MODULE_KEY) {
          return svc
        }
        throw new Error(`Unknown container key: ${key}`)
      },
    },
  }
}

describe("medusa-plugin-product-ext", () => {
  describe("1. Backward Compatibility with @bambiste/medusa-product-ext", () => {
    it("exports PRODUCT_EXT_MODULE='ProductExt' and ProductExtService alias", () => {
      assert.equal(PRODUCT_EXT_MODULE, "ProductExt")
      assert.equal(PRODUCT_EXT_MODULE_KEY, "product_ext")
      assert.equal(ProductExtService, ProductExtModuleService)
    })

    it("upserts and retrieves ProductExtension and VariantExtension using legacy video URL arrays", async () => {
      const service = new ProductExtModuleService()

      const prodExt = await service.upsertByProductId({
        product_id: "prod_legacy_01",
        videos: [
          "https://cdn.example.com/videos/hero.mp4",
          "https://youtu.be/dQw4w9WgXcQ",
        ],
        tagline: "Built for endurance",
      })

      assert.equal(prodExt.product_id, "prod_legacy_01")
      assert.equal(prodExt.tagline, "Built for endurance")
      assert.deepEqual(prodExt.videos, [
        "https://cdn.example.com/videos/hero.mp4",
        "https://youtu.be/dQw4w9WgXcQ",
      ])
      assert.equal(prodExt.media_items.length, 2)
      assert.equal(prodExt.media_items[0].provider, "file")
      assert.equal(prodExt.media_items[1].provider, "youtube")

      const varExt = await service.upsertByVariantId({
        variant_id: "var_legacy_01",
        product_id: "prod_legacy_01",
        videos: ["https://cdn.example.com/videos/variant-spin.webm"],
      })

      assert.equal(varExt.variant_id, "var_legacy_01")
      assert.deepEqual(varExt.videos, [
        "https://cdn.example.com/videos/variant-spin.webm",
      ])

      const storefrontPayload = await service.getStorefrontProductPayload({
        product_id: "prod_legacy_01",
        variant_ids: ["var_legacy_01", "var_missing_02"],
      })

      assert.equal(storefrontPayload.product_id, "prod_legacy_01")
      assert.equal(storefrontPayload.tagline, "Built for endurance")
      assert.equal(storefrontPayload.videos.length, 2)
      assert.ok(storefrontPayload.variants)
      assert.deepEqual(storefrontPayload.variants.var_legacy_01.videos, [
        "https://cdn.example.com/videos/variant-spin.webm",
      ])
      assert.deepEqual(storefrontPayload.variants.var_missing_02.videos, [])
    })
  })

  describe("2. Rich Media, Multi-Provider Video Parser & Unified Gallery Interleaving", () => {
    it("parses YouTube, Vimeo, Mux, Cloudflare Stream, and direct file videos", () => {
      const yt = parseVideoMediaItem(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        0
      )
      assert.equal(yt.provider, "youtube")
      assert.equal(yt.embed_id, "dQw4w9WgXcQ")
      assert.equal(
        yt.embed_url,
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
      )
      assert.equal(
        yt.poster_url,
        "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
      )

      const vimeo = parseVideoMediaItem("https://vimeo.com/123456789", 1)
      assert.equal(vimeo.provider, "vimeo")
      assert.equal(vimeo.embed_id, "123456789")
      assert.equal(vimeo.embed_url, "https://player.vimeo.com/video/123456789")

      const mux = parseVideoMediaItem(
        "https://stream.mux.com/playbackId123.m3u8",
        2
      )
      assert.equal(mux.provider, "mux")
      assert.equal(mux.embed_id, "playbackId123")
      assert.equal(mux.mime_type, "application/vnd.apple.mpegurl")

      const cf = parseVideoMediaItem(
        "https://watch.cloudflarestream.com/cfStreamId99",
        3
      )
      assert.equal(cf.provider, "cloudflare_stream")
      assert.equal(
        cf.embed_url,
        "https://iframe.videodelivery.net/cfStreamId99"
      )

      const localFile = parseVideoMediaItem("/static/product-spin.mp4", 4)
      assert.equal(localFile.provider, "file")
      assert.equal(localFile.mime_type, "video/mp4")
    })

    it("interleaves core images, alt metadata, videos, and 3D models by position", () => {
      const gallery = buildUnifiedProductMedia({
        coreImages: [
          { id: "img_1", url: "https://cdn.example.com/1.jpg", rank: 0 },
          { id: "img_2", url: "https://cdn.example.com/2.jpg", rank: 2 },
        ],
        imageAlts: [
          {
            image_id: "img_1",
            image_url: "https://cdn.example.com/1.jpg",
            alt: "Front angle in studio lighting",
            title: "Front View",
          },
        ],
        mediaItems: [
          parseVideoMediaItem(
            {
              url: "https://cdn.example.com/walkthrough.mp4",
              title: "Walkthrough Video",
              position: 5,
            },
            0
          ),
        ],
        models3d: [
          {
            id: "m3d_1",
            glb_url: "https://cdn.example.com/shoe.glb",
            usdz_url: "https://cdn.example.com/shoe.usdz",
            title: "3D Shoe View",
            position: 15,
          },
        ],
      })

      assert.equal(gallery.length, 4)
      assert.equal(gallery[0].kind, "image")
      assert.equal(gallery[0].alt, "Front angle in studio lighting")
      assert.equal(gallery[1].kind, "video")
      assert.equal(gallery[1].position, 5)
      assert.equal(gallery[2].kind, "model_3d")
      assert.equal(gallery[2].position, 15)
      assert.equal(gallery[3].kind, "image")
      assert.equal(gallery[3].position, 20)
    })
  })

  describe("3. Base-Option Variant Gallery Bulk Assignment & Compensation", () => {
    it("assigns gallery media to all variants matching Option=Value and rolls back on compensation", async () => {
      const { service, container } = createTestContainer()

      // Seed an existing variant extension for var_navy_s to verify update rollback
      await service.upsertByVariantId({
        variant_id: "var_navy_s",
        product_id: "prod_jacket",
        thumbnail: "https://cdn.example.com/old-navy-thumb.jpg",
        images: ["https://cdn.example.com/old-navy-1.jpg"],
      })

      const wf = bulkAssignVariantMediaByOptionWorkflow(
        container as unknown as Parameters<
          typeof bulkAssignVariantMediaByOptionWorkflow
        >[0]
      )
      const execution = await wf.run({
        input: {
          product_id: "prod_jacket",
          option_title: "Color",
          option_value: "Navy",
          variants: [
            {
              variant_id: "var_navy_s",
              options: { Color: "Navy", Size: "S" },
            },
            {
              variant_id: "var_navy_m",
              options: { Color: "Navy", Size: "M" },
            },
            {
              variant_id: "var_red_s",
              options: { Color: "Red", Size: "S" },
            },
          ],
          thumbnail: "https://cdn.example.com/new-navy-thumb.jpg",
          images: [
            "https://cdn.example.com/new-navy-1.jpg",
            "https://cdn.example.com/new-navy-2.jpg",
          ],
          swatch_color: "#1B365D",
        },
      })

      assert.equal(execution.result.length, 2)
      const navyS = await service.getByVariantId("var_navy_s")
      const navyM = await service.getByVariantId("var_navy_m")
      const redS = await service.getByVariantId("var_red_s")

      assert.equal(
        navyS?.thumbnail,
        "https://cdn.example.com/new-navy-thumb.jpg"
      )
      assert.equal(navyS?.images.length, 2)
      assert.equal(navyS?.swatch_color, "#1B365D")
      assert.equal(navyM?.option_signature, "Color:Navy")
      assert.equal(redS, null)

      // Trigger compensation rollback
      if ("compensate" in execution && typeof execution.compensate === "function") {
        await execution.compensate()
      }

      const rolledBackNavyS = await service.getByVariantId("var_navy_s")
      const rolledBackNavyM = await service.getByVariantId("var_navy_m")
      assert.equal(
        rolledBackNavyS?.thumbnail,
        "https://cdn.example.com/old-navy-thumb.jpg"
      )
      assert.equal(rolledBackNavyS?.images.length, 1)
      assert.equal(rolledBackNavyM, null)
    })
  })

  describe("4. Custom Attributes, Unicode Transliteration, Category Inheritance & SI Unit Filtering", () => {
    it("transliterates Cyrillic and accented labels into snake_case keys", () => {
      assert.equal(slugifyAttributeKey("Вес рамы (кг)"), "ves_ramy_kg")
      assert.equal(
        slugifyAttributeKey("Épaisseur du Tissu!"),
        "epaisseur_du_tissu"
      )
    })

    it("inherits parent category attributes and filters across SI and Imperial units", async () => {
      const { service, container } = createTestContainer()

      await service.createAttribute({
        key: "brand_origin",
        label: "Brand Origin",
        type: "text",
        is_global: true,
      })

      await service.createAttribute({
        key: "blade_length",
        label: "Blade Length",
        type: "unit",
        unit_family: "length",
        default_unit: "cm",
        allowed_units: ["mm", "cm", "m", "in"],
        category_ids: ["cat_outdoor"],
      })

      await service.createAttribute({
        key: "handle_material",
        label: "Handle Material",
        type: "select",
        options: [
          { value: "micarta", label: "Canvas Micarta" },
          { value: "g10", label: "G10 Composite" },
        ],
        category_ids: ["cat_knives_sub"],
      })

      // Child category inherits global + parent ("cat_outdoor") + own ("cat_knives_sub")
      const inherited = await service.listAttributes({
        category_id: "cat_knives_sub",
        ancestor_category_ids: ["cat_outdoor"],
      })
      assert.equal(inherited.length, 3)

      // Product A: 10 inches (= 0.254 m)
      await setProductAttributesWorkflow(
        container as unknown as Parameters<typeof setProductAttributesWorkflow>[0]
      ).run({
        input: {
          product_id: "prod_knife_imperial",
          attributes: [
            { attribute_key: "blade_length", value: 10, unit: "in" },
            { attribute_key: "handle_material", value: "micarta" },
          ],
        },
      })

      // Product B: 12 cm (= 0.12 m)
      await setProductAttributesWorkflow(
        container as unknown as Parameters<typeof setProductAttributesWorkflow>[0]
      ).run({
        input: {
          product_id: "prod_knife_metric",
          attributes: [
            { attribute_key: "blade_length", value: 12, unit: "cm" },
            { attribute_key: "handle_material", value: "g10" },
          ],
        },
      })

      // Filter for blade_length between 20 cm and 30 cm -> should match Product A (10 in = 25.4 cm)
      const matched = await service.filterProductIdsByAttributes([
        {
          attribute_key: "blade_length",
          min: 20,
          max: 30,
          unit: "cm",
        },
      ])
      assert.deepEqual(matched, ["prod_knife_imperial"])

      // Verify unit conversion helper directly
      assert.equal(normalizeToSI(10, "in", "length"), 0.254)
      assert.equal(convertUnit(25.4, "cm", "in"), 10)
    })
  })

  describe("5. Hierarchical Content Tree (tree@1 & diff@1) & Cycle Detection", () => {
    it("resolves base template tree + product diff patches and detects cycles", async () => {
      const baseTree: TreeDocV1 = {
        schema: "tree@1",
        root_id: "root",
        nodes: {
          root: { id: "root", parent_id: null, type: "root", order: 0 },
          sec_care: {
            id: "sec_care",
            parent_id: "root",
            type: "section",
            title: "Care Instructions",
            order: 1,
          },
          item_wash: {
            id: "item_wash",
            parent_id: "sec_care",
            type: "item",
            title: "Washing",
            order: 0,
            blocks: [{ type: "markdown", text: "Machine wash cold." }],
          },
          sec_hidden: {
            id: "sec_hidden",
            parent_id: "root",
            type: "section",
            title: "Internal Notes",
            order: 2,
            hidden: true,
          },
        },
      }

      const resolved = resolveTree(baseTree, {
        schema: "diff@1",
        patches: {
          item_wash: {
            title: "Hand Wash Only",
            blocks: [{ type: "markdown", text: "Hand wash in cold water." }],
          },
        },
        added_nodes: {
          item_dry: {
            id: "item_dry",
            parent_id: "sec_care",
            type: "item",
            title: "Drying",
            order: 1,
            blocks: [
              {
                type: "list",
                style: "unordered",
                items: ["Do not tumble dry", "Dry flat"],
              },
            ],
          },
        },
      })

      assert.equal(resolved.sections.length, 1)
      assert.equal(resolved.sections[0].title, "Care Instructions")
      assert.equal(resolved.sections[0].items.length, 2)
      assert.equal(resolved.sections[0].items[0].title, "Hand Wash Only")
      assert.equal(resolved.sections[0].items[1].title, "Drying")

      // Verify cycle detection throws MedusaError
      const cyclicTree = createEmptyTree("root")
      cyclicTree.nodes.sec_a = {
        id: "sec_a",
        parent_id: "sec_b",
        type: "section",
        title: "A",
      }
      cyclicTree.nodes.sec_b = {
        id: "sec_b",
        parent_id: "sec_a",
        type: "section",
        title: "B",
      }
      assert.throws(
        () => validateTreeDocV1(cyclicTree),
        /Cycle detected in content tree/
      )
    })
  })

  describe("6. Feature Badges, Multi-Storefront Overrides & CSV Alt-Text Import/Export", () => {
    it("resolves sales-channel + locale overrides with fallback and exports/imports CSV safely", async () => {
      const { service, container } = createTestContainer()

      const f1 = await service.createFeature({
        code: "waterproof",
        title: "100% Waterproof",
        subtitle: "20,000mm membrane",
      })
      const f2 = await service.createFeature({
        code: "recycled",
        title: "100% Recycled Nylon",
      })

      const tpl = await service.createTemplate({
        code: "alpine_shell",
        name: "Alpine Shell Template",
        category_ids: ["cat_alpine"],
      })

      await applyAttributeTemplateWorkflow(
        container as unknown as Parameters<
          typeof applyAttributeTemplateWorkflow
        >[0]
      ).run({
        input: {
          product_id: "prod_shell",
          template_id_or_code: tpl.code,
        },
      })

      await service.upsertByProductId({
        product_id: "prod_shell",
        tagline: "Global Base Tagline",
        feature_ids: [f2.id, f1.id],
        storefront_overrides: [
          {
            scope_key: "sc:sc_eu",
            sales_channel_id: "sc_eu",
            tagline: "EU Channel Tagline",
          },
          {
            scope_key: "sc:sc_eu:locale:fr-FR",
            sales_channel_id: "sc_eu",
            locale: "fr-FR",
            tagline: "Slogan Canal Europe FR",
          },
        ],
      })

      const frPayload = await service.getStorefrontProductPayload({
        product_id: "prod_shell",
        sales_channel_id: "sc_eu",
        locale: "fr-FR",
      })
      assert.equal(frPayload.tagline, "Slogan Canal Europe FR")
      // Preserves per-product feature order [f2, f1]
      assert.deepEqual(
        frPayload.features.map((f) => f.code),
        ["recycled", "waterproof"]
      )

      const euDefaultPayload = await service.getStorefrontProductPayload({
        product_id: "prod_shell",
        sales_channel_id: "sc_eu",
        locale: "de-DE",
      })
      assert.equal(euDefaultPayload.tagline, "EU Channel Tagline")

      const usFallbackPayload = await service.getStorefrontProductPayload({
        product_id: "prod_shell",
        sales_channel_id: "sc_us",
      })
      assert.equal(usFallbackPayload.tagline, "Global Base Tagline")

      // CSV import + export
      const csvInput = [
        "product_id,image_url,image_id,alt,title,caption,locale",
        "prod_shell,https://cdn.example.com/shell-front.jpg,img_01,Alpine Jacket Front,Front View,Storm hood,en-US",
      ].join("\n")

      await importImageAltsWorkflow(
        container as unknown as Parameters<typeof importImageAltsWorkflow>[0]
      ).run({
        input: { csv_content: csvInput },
      })

      const exportedCsv = await service.exportAllImageAltsCsv(["prod_shell"])
      assert.match(exportedCsv, /Alpine Jacket Front/)
    })
  })

  describe("7. Workflow Update Rollback & Security Guards (SSRF / XSS / CSV Injection)", () => {
    it("rolls back existing ProductExtension state when upsertProductExtWorkflow compensates", async () => {
      const { service, container } = createTestContainer()

      await service.upsertByProductId({
        product_id: "prod_rollback_test",
        tagline: "Original Tagline",
        videos: ["https://cdn.example.com/original.mp4"],
      })

      const wf = upsertProductExtWorkflow(
        container as unknown as Parameters<typeof upsertProductExtWorkflow>[0]
      )
      const exec = await wf.run({
        input: {
          product_id: "prod_rollback_test",
          tagline: "Mutated Tagline",
          videos: ["https://cdn.example.com/mutated.mp4"],
        },
      })

      assert.equal(exec.result.tagline, "Mutated Tagline")

      if ("compensate" in exec && typeof exec.compensate === "function") {
        await exec.compensate()
      }

      const restored = await service.getByProductId("prod_rollback_test")
      assert.equal(restored?.tagline, "Original Tagline")
      assert.deepEqual(restored?.videos, [
        "https://cdn.example.com/original.mp4",
      ])
    })

    it("blocks SSRF private/loopback/metadata URLs, unsafe protocols, and escapes HTML/CSV", () => {
      const blockedUrls = [
        "http://127.0.0.1:8080/internal.mp4",
        "http://localhost/admin",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.42/private.glb",
        "http://192.168.1.1/router.mp4",
        "http://[::1]/loopback.mp4",
        "javascript:alert(1)",
        "file:///etc/passwd",
        "/uploads/../../etc/passwd",
      ]

      for (const badUrl of blockedUrls) {
        assert.throws(
          () => validateExternalMediaUrl(badUrl),
          /MedusaError|restricted|protocol|invalid|valid URL/i,
          `Expected URL "${badUrl}" to be rejected`
        )
      }

      assert.equal(
        escapeHtml('<script>alert("xss")</script>'),
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      )
      assert.equal(escapeCsvCell("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0")
    })
  })

  describe("8. Admin UI Localization (10 Locales Key Parity)", () => {
    it("exports all 10 locales (ar, de, en, es, fr, it, nl, pl, pt, tr) with 100% key parity", () => {
      const bundles = adminI18n
      const locales = SUPPORTED_UI_LOCALES.map((l) => l.code)

      assert.equal(locales.length, 10)

      const flattenKeys = (
        obj: Record<string, unknown>,
        prefix = ""
      ): string[] =>
        Object.entries(obj).flatMap(([k, v]) => {
          const nextKey = prefix ? `${prefix}.${k}` : k
          if (v && typeof v === "object" && !Array.isArray(v)) {
            return flattenKeys(v as Record<string, unknown>, nextKey)
          }
          return [nextKey]
        })

      const enKeys = flattenKeys(
        bundles.en.translation as unknown as Record<string, unknown>
      ).sort()
      assert.ok(enKeys.length >= 100)

      for (const localeCode of locales) {
        const entry = bundles[localeCode]
        assert.ok(entry, `Missing locale bundle for ${localeCode}`)
        const localeKeys = flattenKeys(
          entry.translation as unknown as Record<string, unknown>
        ).sort()
        assert.deepEqual(
          localeKeys,
          enKeys,
          `Locale "${localeCode}" keys do not match "en"`
        )
      }
    })
  })
})


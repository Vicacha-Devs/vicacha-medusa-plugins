import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { MedusaError } from "@medusajs/framework/utils"
import {
  clampCoordinatePercent,
  sanitizeHttpUrl,
  sanitizeRingColor,
  slugifyStoryHandle,
} from "../modules/story/utils/security"
import { StoriesModuleService } from "../modules/story/service"
import {
  CreateStoryGroupSchema,
  CreateStoryHotspotSchema,
  CreateStorySlideSchema,
  CreateStoryStickerSchema,
  DeleteStoryHotspotSchema,
  DeleteStoryStickerSchema,
  InteractWithStoryStickerSchema,
  RecordStoryEngagementSchema,
} from "../api/validators"
import middlewares from "../api/middlewares"
import { createStoriesSdk } from "../sdk"
import { adminI18n, SUPPORTED_UI_LOCALES } from "../index"

describe("medusa-plugin-stories security utilities", () => {
  it("accepts http/https and relative store paths while rejecting javascript:/data: URLs with MedusaError", () => {
    assert.equal(
      sanitizeHttpUrl("https://cdn.example.com/reel.mp4"),
      "https://cdn.example.com/reel.mp4"
    )
    assert.equal(
      sanitizeHttpUrl("/products/classic-hoodie", "link_url", true),
      "/products/classic-hoodie"
    )

    assert.throws(
      () => sanitizeHttpUrl("javascript:alert(1)"),
      (err: unknown) =>
        err instanceof MedusaError &&
        err.type === MedusaError.Types.INVALID_DATA
    )
    assert.throws(
      () => sanitizeHttpUrl("data:text/html,<script>alert(1)</script>"),
      (err: unknown) =>
        err instanceof MedusaError &&
        err.type === MedusaError.Types.INVALID_DATA
    )
  })

  it("clamps hotspot coordinates to [0, 100] and throws MedusaError on non-finite values", () => {
    assert.equal(clampCoordinatePercent(-15), 0)
    assert.equal(clampCoordinatePercent(145), 100)
    assert.equal(clampCoordinatePercent(42.345), 42.35)

    assert.throws(
      () => clampCoordinatePercent(Number.NaN),
      (err: unknown) =>
        err instanceof MedusaError &&
        err.type === MedusaError.Types.INVALID_DATA
    )
  })

  it("validates custom CSS hex ring colors and slugifies handles", () => {
    assert.equal(sanitizeRingColor("#ff0050"), "#ff0050")
    assert.equal(
      slugifyStoryHandle("Summer Lookbook '26!"),
      "summer-lookbook-26"
    )

    assert.throws(
      () => sanitizeRingColor("expression(alert(1))"),
      (err: unknown) =>
        err instanceof MedusaError &&
        err.type === MedusaError.Types.INVALID_DATA
    )
  })
})

describe("StoriesModuleService — groups, slides, hotspots, stickers, funnel & expiration", () => {
  it("manages Story Highlight Rings and preserves @bambiste/medusa-stories listActive() compatibility", async () => {
    const service = new StoriesModuleService({}, {})

    const createdGroup = await service.createGroup({
      title: "VIP Archive Drops",
      placement: "home",
      ring_theme: "sunset",
    })
    assert.equal(createdGroup.handle, "vip-archive-drops")

    const createdSlide = await service.createSlide({
      group_id: createdGroup.id,
      title: "Limited Metallic Jacket",
      media_type: "video",
      media_url: "https://cdn.example.com/metallic.mp4",
      link_url: "/products/metallic-jacket",
      link_text: "Shop Limited Drop",
    })
    assert.equal(createdSlide.group_id, createdGroup.id)
    assert.equal(createdSlide.link_url, "/products/metallic-jacket")

    const activeStories = await service.listActive()
    assert.equal(activeStories.length, 1)
    assert.equal(activeStories[0].title, "Limited Metallic Jacket")
  })

  it("pins X/Y product hotspots, enforces max_hotspots_per_slide, and removes them cleanly", async () => {
    const service = new StoriesModuleService(
      {},
      { max_hotspots_per_slide: 2 }
    )

    const slide = await service.createSlide({
      title: "Runway Look #1",
      media_type: "image",
      media_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
    })

    const h1 = await service.addHotspot(slide.id, {
      product_id: "prod_coat",
      product_title: "Trench Coat",
      x_percent: 35.5,
      y_percent: 48.2,
      price_formatted: "$240.00",
    })
    assert.equal(h1.x_percent, 35.5)

    const h2 = await service.addHotspot(slide.id, {
      product_id: "prod_boots",
      product_title: "Chelsea Boots",
      x_percent: 52,
      y_percent: 82,
      price_formatted: "$180.00",
    })
    assert.equal(h2.product_id, "prod_boots")

    await assert.rejects(
      () =>
        service.addHotspot(slide.id, {
          product_id: "prod_bag",
          product_title: "Crossbody Bag",
          x_percent: 25,
          y_percent: 60,
        }),
      (err: unknown) =>
        err instanceof MedusaError &&
        err.type === MedusaError.Types.INVALID_DATA
    )

    const hydrated = await service.hydrateSlide(slide)
    assert.equal(hydrated.hotspots?.length, 2)

    const removed = await service.removeHotspot(h1.id, slide.id)
    assert.equal(removed.deleted, true)

    const cleaned = await service.removeHotspotsByProductId("prod_boots")
    assert.equal(cleaned.removed_count, 1)
  })

  it("handles interactive Poll stickers, sticker deletion, and records conversion funnel analytics", async () => {
    const service = new StoriesModuleService({}, {})

    const group = await service.createGroup({
      title: "Drop Polls",
      placement: "home",
    })

    const slide = await service.createSlide({
      group_id: group.id,
      title: "Flash Sale Poll",
      media_type: "image",
      media_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae",
    })

    const pollSticker = await service.addSticker(slide.id, {
      type: "poll",
      prompt: "Which colorway next?",
      options: [
        { id: "opt_obsidian", label: "Obsidian Black" },
        { id: "opt_sage", label: "Sage Green" },
      ],
    })

    const updatedSticker = await service.interactWithSticker({
      storyId: slide.id,
      stickerId: pollSticker.id,
      optionId: "opt_obsidian",
    })
    assert.equal(updatedSticker.total_interactions, 1)
    assert.equal(updatedSticker.options?.[0].votes, 1)

    await service.recordEngagementEvent({
      story_id: slide.id,
      event_type: "impression",
    })
    await service.recordEngagementEvent({
      story_id: slide.id,
      event_type: "impression",
    })
    await service.recordEngagementEvent({
      story_id: slide.id,
      event_type: "complete",
    })
    await service.recordEngagementEvent({
      story_id: slide.id,
      event_type: "hotspot_click",
      product_id: "prod_1",
    })
    await service.recordEngagementEvent({
      story_id: slide.id,
      event_type: "add_to_cart",
      product_id: "prod_1",
    })

    const report = await service.getAnalyticsOverview()
    assert.equal(report.total_impressions, 2)
    assert.equal(report.total_completions, 1)
    assert.equal(report.total_hotspot_clicks, 1)
    assert.equal(report.total_cart_conversions, 1)
    assert.equal(report.overall_completion_rate_pct, 50)
    assert.equal(report.overall_conversion_rate_pct, 50)

    const removedSticker = await service.removeSticker(pollSticker.id, slide.id)
    assert.equal(removedSticker.deleted, true)
  })

  it("auto-expires elapsed 24h ephemeral stories via expireOutdatedStories()", async () => {
    const service = new StoriesModuleService({}, {})

    const pastIso = new Date(Date.now() - 60_000).toISOString()
    const expiredSlide = await service.createSlide({
      title: "Yesterday Flash Drop",
      media_type: "image",
      media_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
      expires_at: pastIso,
      is_active: true,
    })

    const result = await service.expireOutdatedStories()
    assert.equal(result.expired_slides, 1)
    assert.deepEqual(result.expired_ids, [expiredSlide.id])
  })
})

describe("Centralized API validators & Storefront/Admin StoriesSdk", () => {
  it("exports all Zod schemas in src/api/validators.ts and registers route middlewares", () => {
    assert.ok(CreateStoryGroupSchema)
    assert.ok(CreateStorySlideSchema)
    assert.ok(CreateStoryHotspotSchema)
    assert.ok(DeleteStoryHotspotSchema)
    assert.ok(CreateStoryStickerSchema)
    assert.ok(DeleteStoryStickerSchema)
    assert.ok(RecordStoryEngagementSchema)
    assert.ok(InteractWithStoryStickerSchema)
    assert.ok(Array.isArray(middlewares.routes))
    assert.equal(middlewares.routes.length, 10)
  })

  it("executes typed StoriesSdk calls for storefront feed and admin sticker deletion", async () => {
    const calls: Array<{ url: string; method: string }> = []
    const sdk = createStoriesSdk({
      baseUrl: "https://medusa.example.com",
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({
          url: String(input),
          method: init?.method ?? "GET",
        })
        return new Response(
          JSON.stringify({
            groups: [],
            stories: [],
            id: "sstk_1",
            deleted: true,
          }),
          { status: 200 }
        )
      }) as typeof fetch,
    })

    await sdk.store.listStories({
      placement: "collection",
      collection_id: "pcol_summer",
    })
    assert.equal(calls.length, 1)
    assert.equal(
      calls[0].url,
      "https://medusa.example.com/store/stories?placement=collection&collection_id=pcol_summer"
    )
    assert.equal(calls[0].method, "GET")

    await sdk.admin.removeSticker("stry_1", "sstk_1")
    assert.equal(calls.length, 2)
    assert.equal(
      calls[1].url,
      "https://medusa.example.com/admin/stories/stry_1/stickers"
    )
    assert.equal(calls[1].method, "DELETE")
  })
})

describe("Admin UI Localization (10 Locales Key Parity)", () => {
  it("exports all 10 locales (ar, de, en, es, fr, it, nl, pl, tr, pt) with 100% key parity", () => {
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
    assert.ok(enKeys.length >= 130)

    for (const localeCode of locales) {
      const entry = bundles[localeCode]
      assert.ok(entry, `Missing locale bundle for ${localeCode}`)
      assert.ok(entry.stories, `Missing "stories" namespace for ${localeCode}`)
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

  it("exports Medusa v2 Admin routes, breadcrumbs, components, and product widget", async () => {
    const overviewRoute = await import("../admin/routes/stories/page")
    const canvasRoute = await import("../admin/routes/stories/canvas/page")
    const ringsRoute = await import("../admin/routes/stories/rings/page")
    const ringsCreateRoute = await import(
      "../admin/routes/stories/rings/@create/page"
    )
    const stickersRoute = await import("../admin/routes/stories/stickers/page")
    const analyticsRoute = await import(
      "../admin/routes/stories/analytics/page"
    )
    const adminComponents = await import("../admin/components")
    const productWidget = await import(
      "../admin/widgets/product-stories-widget"
    )

    assert.equal(overviewRoute.config.translationNs, "stories")
    assert.equal(typeof overviewRoute.handle.breadcrumb, "function")
    assert.equal(canvasRoute.config.translationNs, "stories")
    assert.equal(typeof canvasRoute.handle.breadcrumb, "function")
    assert.equal(ringsRoute.config.translationNs, "stories")
    assert.equal(typeof ringsRoute.handle.breadcrumb, "function")
    assert.equal(typeof ringsCreateRoute.default, "function")
    assert.equal(stickersRoute.config.translationNs, "stories")
    assert.equal(typeof stickersRoute.handle.breadcrumb, "function")
    assert.equal(analyticsRoute.config.translationNs, "stories")
    assert.equal(typeof analyticsRoute.handle.breadcrumb, "function")

    assert.equal(typeof adminComponents.StudioHeader, "function")
    assert.equal(typeof adminComponents.StoryRingsTab, "function")
    assert.equal(typeof adminComponents.CanvasEditorTab, "function")
    assert.equal(typeof adminComponents.StickersTab, "function")
    assert.equal(typeof adminComponents.AnalyticsTab, "function")
    assert.equal(typeof adminComponents.ProductStoriesCard, "function")
    assert.equal(productWidget.config.zone, "product.details.after")
  })
})

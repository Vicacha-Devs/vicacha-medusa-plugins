import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { StoriesModels } from "./models"
import type {
  StoriesAnalyticsOverview,
  StoriesPluginOptions,
  StoryEngagementEventType,
  StoryGroupAnalyticsSummary,
  StoryGroupDTO,
  StoryHotspotDTO,
  StoryMediaType,
  StoryPlacementZone,
  StoryRingTheme,
  StorySlideDTO,
  StoryStickerDTO,
  StoryStickerOption,
  StoryStickerType,
} from "./types"
import {
  clampCoordinatePercent,
  sanitizeHttpUrl,
  sanitizeRingColor,
  slugifyStoryHandle,
} from "./utils/security"

export class StoriesModuleService extends MedusaService(StoriesModels) {
  protected readonly options_: StoriesPluginOptions

  constructor(
    _container: Record<string, unknown> = {},
    options: StoriesPluginOptions = {}
  ) {
    super(...arguments)
    this.options_ = options ?? {}
  }

  // ─── Story Groups / Highlights Rings ───────────────────────────────────────

  async createGroup(input: {
    title: string
    handle?: string
    subtitle?: string | null
    avatar_url?: string | null
    ring_theme?: StoryRingTheme
    custom_ring_color?: string | null
    placement?: StoryPlacementZone
    target_entity_id?: string | null
    is_pinned?: boolean
    is_ephemeral?: boolean
    is_active?: boolean
    display_order?: number
    metadata?: Record<string, unknown> | null
  }): Promise<StoryGroupDTO> {
    const title = String(input.title || "").trim()
    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Story group title is required."
      )
    }

    const handle = slugifyStoryHandle(input.handle || title)
    const avatarUrl = sanitizeHttpUrl(input.avatar_url, "avatar_url")
    const customRingColor = sanitizeRingColor(input.custom_ring_color)

    const group = await this.createStoryGroups({
      title,
      handle,
      subtitle: input.subtitle?.trim() || null,
      avatar_url: avatarUrl,
      ring_theme:
        input.ring_theme ??
        this.options_.defaultRingTheme ??
        this.options_.default_ring_theme ??
        "instagram",
      custom_ring_color: customRingColor,
      placement: input.placement ?? "home",
      target_entity_id: input.target_entity_id?.trim() || null,
      is_pinned: input.is_pinned ?? true,
      is_ephemeral: input.is_ephemeral ?? false,
      is_active: input.is_active ?? true,
      display_order: input.display_order ?? 0,
      metadata: input.metadata ?? null,
    })

    return group as unknown as StoryGroupDTO
  }

  async updateGroup(
    id: string,
    patch: Partial<{
      title: string
      handle: string
      subtitle: string | null
      avatar_url: string | null
      ring_theme: StoryRingTheme
      custom_ring_color: string | null
      placement: StoryPlacementZone
      target_entity_id: string | null
      is_pinned: boolean
      is_ephemeral: boolean
      is_active: boolean
      display_order: number
      metadata: Record<string, unknown> | null
    }>
  ): Promise<StoryGroupDTO> {
    const existing = await this.listStoryGroups({ id })
    if (!existing?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Story group "${id}" not found.`
      )
    }

    const updateData: Record<string, unknown> = { id }
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim()
      if (!trimmed) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Story group title cannot be empty."
        )
      }
      updateData.title = trimmed
    }
    if (patch.handle !== undefined) {
      updateData.handle = slugifyStoryHandle(patch.handle)
    }
    if (patch.subtitle !== undefined) {
      updateData.subtitle = patch.subtitle?.trim() || null
    }
    if (patch.avatar_url !== undefined) {
      updateData.avatar_url = sanitizeHttpUrl(patch.avatar_url, "avatar_url")
    }
    if (patch.ring_theme !== undefined) {
      updateData.ring_theme = patch.ring_theme
    }
    if (patch.custom_ring_color !== undefined) {
      updateData.custom_ring_color = sanitizeRingColor(patch.custom_ring_color)
    }
    if (patch.placement !== undefined) {
      updateData.placement = patch.placement
    }
    if (patch.target_entity_id !== undefined) {
      updateData.target_entity_id = patch.target_entity_id?.trim() || null
    }
    if (patch.is_pinned !== undefined) {
      updateData.is_pinned = patch.is_pinned
    }
    if (patch.is_ephemeral !== undefined) {
      updateData.is_ephemeral = patch.is_ephemeral
    }
    if (patch.is_active !== undefined) {
      updateData.is_active = patch.is_active
    }
    if (patch.display_order !== undefined) {
      updateData.display_order = patch.display_order
    }
    if (patch.metadata !== undefined) {
      updateData.metadata = patch.metadata
    }

    const updated = await this.updateStoryGroups(updateData)
    return updated as unknown as StoryGroupDTO
  }

  async deleteGroup(id: string): Promise<{ id: string; deleted: boolean }> {
    const existing = await this.listStoryGroups({ id })
    if (!existing?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Story group "${id}" not found.`
      )
    }
    const groupSlides = await this.listStories({ group_id: id })
    for (const slide of groupSlides ?? []) {
      await this.updateStories({ id: slide.id, group_id: null })
    }
    await this.deleteStoryGroups(id)
    return { id, deleted: true }
  }

  // ─── Story Slides + Hotspots + Stickers ────────────────────────────────────

  async createSlide(input: {
    group_id?: string | null
    title: string
    caption?: string | null
    media_type?: StoryMediaType
    media_url: string
    thumbnail_url?: string | null
    duration_ms?: number
    link_url?: string | null
    link_text?: string | null
    is_active?: boolean
    display_order?: number
    starts_at?: string | Date | null
    expires_at?: string | Date | null
    hotspots?: Array<{
      product_id: string
      variant_id?: string | null
      product_title: string
      product_handle?: string | null
      product_thumbnail?: string | null
      price_formatted?: string | null
      price_amount?: number | null
      currency_code?: string | null
      x_percent: number
      y_percent: number
      label?: string | null
      badge_style?: "pill" | "card" | "dot"
    }>
    stickers?: Array<{
      type: StoryStickerType
      prompt: string
      x_percent?: number
      y_percent?: number
      options?: Array<{ id?: string; label: string; votes?: number }> | null
      coupon_code?: string | null
      countdown_until?: string | null
    }>
    metadata?: Record<string, unknown> | null
  }): Promise<StorySlideDTO> {
    const title = String(input.title || "").trim()
    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Story title is required."
      )
    }

    const mediaUrl = sanitizeHttpUrl(input.media_url, "media_url")
    if (!mediaUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Story media_url is required."
      )
    }

    const thumbnailUrl = sanitizeHttpUrl(input.thumbnail_url, "thumbnail_url")
    const linkUrl = sanitizeHttpUrl(input.link_url, "link_url")

    const defaultDuration =
      this.options_.defaultSlideDurationMs ??
      this.options_.default_slide_duration_ms ??
      5000

    const durationMs = Math.min(
      60000,
      Math.max(1000, input.duration_ms ?? defaultDuration)
    )

    const slide = await this.createStories({
      group_id: input.group_id || null,
      title,
      caption: input.caption?.trim() || null,
      media_type: input.media_type ?? "image",
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl,
      duration_ms: durationMs,
      link_url: linkUrl,
      link_text: input.link_text?.trim() || null,
      is_active: input.is_active ?? true,
      display_order: input.display_order ?? 0,
      starts_at: input.starts_at ? new Date(input.starts_at) : null,
      expires_at: input.expires_at ? new Date(input.expires_at) : null,
      views_count: 0,
      completions_count: 0,
      clicks_count: 0,
      cart_conversions_count: 0,
      metadata: input.metadata ?? null,
    })

    const createdHotspots: StoryHotspotDTO[] = []
    for (const hs of input.hotspots ?? []) {
      const createdHs = await this.addHotspot(slide.id, hs)
      createdHotspots.push(createdHs)
    }

    const createdStickers: StoryStickerDTO[] = []
    for (const stk of input.stickers ?? []) {
      const createdStk = await this.addSticker(slide.id, stk)
      createdStickers.push(createdStk)
    }

    return {
      ...(slide as unknown as StorySlideDTO),
      hotspots: createdHotspots,
      stickers: createdStickers,
    }
  }

  async updateSlide(
    id: string,
    patch: Partial<{
      group_id: string | null
      title: string
      caption: string | null
      media_type: StoryMediaType
      media_url: string
      thumbnail_url: string | null
      duration_ms: number
      link_url: string | null
      link_text: string | null
      is_active: boolean
      display_order: number
      starts_at: string | Date | null
      expires_at: string | Date | null
      metadata: Record<string, unknown> | null
    }>
  ): Promise<StorySlideDTO> {
    const existing = await this.listStories({ id })
    if (!existing?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Story "${id}" not found.`
      )
    }

    const updateData: Record<string, unknown> = { id }
    if (patch.group_id !== undefined) updateData.group_id = patch.group_id
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim()
      if (!trimmed) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Story title cannot be empty."
        )
      }
      updateData.title = trimmed
    }
    if (patch.caption !== undefined) {
      updateData.caption = patch.caption?.trim() || null
    }
    if (patch.media_type !== undefined) {
      updateData.media_type = patch.media_type
    }
    if (patch.media_url !== undefined) {
      const url = sanitizeHttpUrl(patch.media_url, "media_url")
      if (!url) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "media_url cannot be empty."
        )
      }
      updateData.media_url = url
    }
    if (patch.thumbnail_url !== undefined) {
      updateData.thumbnail_url = sanitizeHttpUrl(
        patch.thumbnail_url,
        "thumbnail_url"
      )
    }
    if (patch.duration_ms !== undefined) {
      updateData.duration_ms = Math.min(
        60000,
        Math.max(1000, patch.duration_ms)
      )
    }
    if (patch.link_url !== undefined) {
      updateData.link_url = sanitizeHttpUrl(patch.link_url, "link_url")
    }
    if (patch.link_text !== undefined) {
      updateData.link_text = patch.link_text?.trim() || null
    }
    if (patch.is_active !== undefined) {
      updateData.is_active = patch.is_active
    }
    if (patch.display_order !== undefined) {
      updateData.display_order = patch.display_order
    }
    if (patch.starts_at !== undefined) {
      updateData.starts_at = patch.starts_at ? new Date(patch.starts_at) : null
    }
    if (patch.expires_at !== undefined) {
      updateData.expires_at = patch.expires_at
        ? new Date(patch.expires_at)
        : null
    }
    if (patch.metadata !== undefined) {
      updateData.metadata = patch.metadata
    }

    const updated = await this.updateStories(updateData)
    return this.hydrateSlide(updated as unknown as StorySlideDTO)
  }

  async deleteSlide(id: string): Promise<{ id: string; deleted: boolean }> {
    const existing = await this.listStories({ id })
    if (!existing?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Story "${id}" not found.`
      )
    }
    const [hotspots, stickers, events] = await Promise.all([
      this.listStoryHotspots({ story_id: id }),
      this.listStoryStickers({ story_id: id }),
      this.listStoryEvents({ story_id: id }),
    ])
    for (const hs of hotspots ?? []) {
      await this.deleteStoryHotspots(hs.id)
    }
    for (const stk of stickers ?? []) {
      await this.deleteStoryStickers(stk.id)
    }
    for (const evt of events ?? []) {
      await this.deleteStoryEvents(evt.id)
    }
    await this.deleteStories(id)
    return { id, deleted: true }
  }

  async addHotspot(
    storyId: string,
    input: {
      product_id: string
      variant_id?: string | null
      product_title: string
      product_handle?: string | null
      product_thumbnail?: string | null
      price_formatted?: string | null
      price_amount?: number | null
      currency_code?: string | null
      x_percent: number
      y_percent: number
      label?: string | null
      badge_style?: "pill" | "card" | "dot"
    }
  ): Promise<StoryHotspotDTO> {
    if (!input.product_id || !input.product_title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Hotspot requires product_id and product_title."
      )
    }

    const existingStories = await this.listStories({ id: storyId })
    if (!existingStories?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Story "${storyId}" not found.`
      )
    }

    const maxHotspots =
      this.options_.maxHotspotsPerSlide ??
      this.options_.max_hotspots_per_slide ??
      20
    const currentHotspots = await this.listStoryHotspots({ story_id: storyId })
    if ((currentHotspots?.length ?? 0) >= maxHotspots) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Story "${storyId}" has reached the maximum of ${maxHotspots} hotspots per slide.`
      )
    }

    const x = clampCoordinatePercent(input.x_percent)
    const y = clampCoordinatePercent(input.y_percent)
    const thumb = sanitizeHttpUrl(
      input.product_thumbnail,
      "product_thumbnail"
    )

    const hotspot = await this.createStoryHotspots({
      story_id: storyId,
      product_id: input.product_id.trim(),
      variant_id: input.variant_id?.trim() || null,
      product_title: input.product_title.trim(),
      product_handle: input.product_handle?.trim() || null,
      product_thumbnail: thumb,
      price_formatted: input.price_formatted?.trim() || null,
      price_amount: input.price_amount ?? null,
      currency_code: input.currency_code?.trim().toLowerCase() || null,
      x_percent: x,
      y_percent: y,
      label: input.label?.trim() || null,
      badge_style: input.badge_style ?? "pill",
    })

    return hotspot as unknown as StoryHotspotDTO
  }

  async removeHotspot(
    hotspotId: string,
    storyId?: string
  ): Promise<{ id: string; deleted: boolean }> {
    const filter: Record<string, unknown> = { id: hotspotId }
    if (storyId) {
      filter.story_id = storyId
    }
    const existing = await this.listStoryHotspots(filter)
    if (!existing?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Hotspot "${hotspotId}" not found.`
      )
    }
    await this.deleteStoryHotspots(hotspotId)
    return { id: hotspotId, deleted: true }
  }

  async addSticker(
    storyId: string,
    input: {
      type: StoryStickerType
      prompt: string
      x_percent?: number
      y_percent?: number
      options?: Array<{ id?: string; label: string; votes?: number }> | null
      coupon_code?: string | null
      countdown_until?: string | null
      metadata?: Record<string, unknown> | null
    }
  ): Promise<StoryStickerDTO> {
    const prompt = String(input.prompt || "").trim()
    if (!prompt) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Sticker prompt is required."
      )
    }

    const existingStories = await this.listStories({ id: storyId })
    if (!existingStories?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Story "${storyId}" not found.`
      )
    }

    const x = clampCoordinatePercent(input.x_percent ?? 50)
    const y = clampCoordinatePercent(input.y_percent ?? 25)

    const normalizedOptions: StoryStickerOption[] | null = input.options
      ? input.options.map((opt, idx) => ({
          id: opt.id?.trim() || `opt_${idx + 1}`,
          label: String(opt.label || "").trim(),
          votes: Number(opt.votes ?? 0),
        }))
      : null

    const sticker = await this.createStoryStickers({
      story_id: storyId,
      type: input.type,
      prompt,
      x_percent: x,
      y_percent: y,
      options: normalizedOptions as unknown as Record<string, unknown>,
      coupon_code: input.coupon_code?.trim().toUpperCase() || null,
      countdown_until: input.countdown_until || null,
      total_interactions: 0,
      metadata: input.metadata ?? null,
    })

    return {
      ...(sticker as unknown as StoryStickerDTO),
      options: normalizedOptions,
    }
  }

  async removeSticker(
    stickerId: string,
    storyId?: string
  ): Promise<{ id: string; deleted: boolean }> {
    const filter: Record<string, unknown> = { id: stickerId }
    if (storyId) {
      filter.story_id = storyId
    }
    const existing = await this.listStoryStickers(filter)
    if (!existing?.[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Sticker "${stickerId}" not found.`
      )
    }
    await this.deleteStoryStickers(stickerId)
    return { id: stickerId, deleted: true }
  }

  async interactWithSticker(params: {
    storyId: string
    stickerId: string
    optionId?: string
    responseText?: string
    sessionId?: string
  }): Promise<StoryStickerDTO> {
    const stickers = await this.listStoryStickers({
      id: params.stickerId,
      story_id: params.storyId,
    })
    const sticker = stickers?.[0]
    if (!sticker) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Sticker "${params.stickerId}" not found on story "${params.storyId}".`
      )
    }

    let options = Array.isArray(sticker.options)
      ? ([...(sticker.options as unknown as StoryStickerOption[])])
      : null

    if (sticker.type === "poll" && options && params.optionId) {
      const targetIdx = options.findIndex((o) => o.id === params.optionId)
      if (targetIdx === -1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Poll option "${params.optionId}" not found.`
        )
      }
      options[targetIdx] = {
        ...options[targetIdx],
        votes: (options[targetIdx].votes ?? 0) + 1,
      }
    }

    const totalInteractions = Number(sticker.total_interactions ?? 0) + 1
    const updated = await this.updateStoryStickers({
      id: sticker.id,
      options: options as unknown as Record<string, unknown>,
      total_interactions: totalInteractions,
    })

    const slides = await this.listStories({ id: params.storyId })
    const groupId = slides?.[0]?.group_id ?? null

    await this.createStoryEvents({
      story_id: params.storyId,
      group_id: groupId,
      event_type: "sticker_interact",
      sticker_id: sticker.id,
      session_id: params.sessionId ?? null,
      metadata: {
        option_id: params.optionId ?? null,
        response_text: params.responseText
          ? String(params.responseText).slice(0, 280)
          : null,
      },
    })

    return {
      ...(updated as unknown as StoryStickerDTO),
      options,
    }
  }

  // ─── Querying & Hydration (Admin & Storefront) ─────────────────────────────

  async hydrateSlide(rawSlide: StorySlideDTO): Promise<StorySlideDTO> {
    const [hotspots, stickers] = await Promise.all([
      this.listStoryHotspots({ story_id: rawSlide.id }),
      this.listStoryStickers({ story_id: rawSlide.id }),
    ])

    return {
      ...rawSlide,
      hotspots: (hotspots ?? []) as unknown as StoryHotspotDTO[],
      stickers: (stickers ?? []).map((s) => ({
        ...(s as unknown as StoryStickerDTO),
        options: Array.isArray(s.options)
          ? (s.options as unknown as StoryStickerOption[])
          : null,
      })),
    }
  }

  /**
   * Backward-compatible `listActive()` method matching `@bambiste/medusa-stories`,
   * enhanced with start/expiration window checks and hydrated hotspots & stickers.
   */
  async listActive(filters?: {
    group_id?: string
    product_id?: string
  }): Promise<StorySlideDTO[]> {
    const now = new Date()
    const queryFilter: Record<string, unknown> = { is_active: true }
    if (filters?.group_id) {
      queryFilter.group_id = filters.group_id
    }

    const all = await this.listStories(queryFilter)
    const activeSlides = all
      .filter((s) => {
        if (s.starts_at && new Date(s.starts_at) > now) return false
        if (s.expires_at && new Date(s.expires_at) <= now) return false
        return true
      })
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

    const hydrated = await Promise.all(
      activeSlides.map((s) => this.hydrateSlide(s as unknown as StorySlideDTO))
    )

    if (filters?.product_id) {
      return hydrated.filter((s) =>
        (s.hotspots ?? []).some((h) => h.product_id === filters.product_id)
      )
    }

    return hydrated
  }

  async listStorefrontGroups(filters?: {
    placement?: StoryPlacementZone
    target_entity_id?: string
    group_id?: string
    product_id?: string
    collection_id?: string
  }): Promise<StoryGroupDTO[]> {
    const effectiveTargetEntityId =
      filters?.target_entity_id ?? filters?.collection_id
    const groups = await this.listStoryGroups({ is_active: true })
    const filteredGroups = groups
      .filter((g) => {
        if (filters?.group_id && g.id !== filters.group_id) {
          return false
        }
        if (
          filters?.placement &&
          g.placement !== filters.placement &&
          g.placement !== "global"
        ) {
          return false
        }
        if (
          effectiveTargetEntityId &&
          g.target_entity_id &&
          g.target_entity_id !== effectiveTargetEntityId
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        return (a.display_order ?? 0) - (b.display_order ?? 0)
      })

    const activeSlides = await this.listActive({
      group_id: filters?.group_id,
      product_id: filters?.product_id,
    })
    const slidesByGroup = new Map<string, StorySlideDTO[]>()
    for (const slide of activeSlides) {
      if (slide.group_id) {
        const list = slidesByGroup.get(slide.group_id) ?? []
        list.push(slide)
        slidesByGroup.set(slide.group_id, list)
      }
    }

    const hydratedGroups = filteredGroups.map((g) => ({
      ...(g as unknown as StoryGroupDTO),
      slides: slidesByGroup.get(g.id) ?? [],
    }))

    if (filters?.product_id) {
      return hydratedGroups.filter((g) => (g.slides?.length ?? 0) > 0)
    }

    return hydratedGroups
  }

  async listAdminStudioState(filters?: {
    product_id?: string
  }): Promise<{
    groups: StoryGroupDTO[]
    slides: StorySlideDTO[]
  }> {
    const [rawGroups, rawSlides] = await Promise.all([
      this.listStoryGroups({}),
      this.listStories({}),
    ])

    const sortedSlides = [...rawSlides].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    )
    const hydratedSlides = await Promise.all(
      sortedSlides.map((s) => this.hydrateSlide(s as unknown as StorySlideDTO))
    )

    const finalSlides = filters?.product_id
      ? hydratedSlides.filter((s) =>
          (s.hotspots ?? []).some((h) => h.product_id === filters.product_id)
        )
      : hydratedSlides

    const slidesByGroup = new Map<string, StorySlideDTO[]>()
    for (const slide of finalSlides) {
      if (slide.group_id) {
        const list = slidesByGroup.get(slide.group_id) ?? []
        list.push(slide)
        slidesByGroup.set(slide.group_id, list)
      }
    }

    const sortedGroups = [...rawGroups]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((g) => ({
        ...(g as unknown as StoryGroupDTO),
        slides: slidesByGroup.get(g.id) ?? [],
      }))

    return {
      groups: sortedGroups,
      slides: finalSlides,
    }
  }

  // ─── Engagement Tracking & Conversion Funnel Analytics ─────────────────────

  async recordEngagementEvent(input: {
    story_id: string
    event_type: StoryEngagementEventType
    hotspot_id?: string | null
    sticker_id?: string | null
    product_id?: string | null
    session_id?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<{ ok: boolean; story: StorySlideDTO }> {
    const existing = await this.listStories({ id: input.story_id })
    const slide = existing?.[0]
    if (!slide) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Story "${input.story_id}" not found.`
      )
    }

    await this.createStoryEvents({
      story_id: slide.id,
      group_id: slide.group_id ?? null,
      event_type: input.event_type,
      hotspot_id: input.hotspot_id ?? null,
      sticker_id: input.sticker_id ?? null,
      product_id: input.product_id ?? null,
      session_id: input.session_id ?? null,
      metadata: input.metadata ?? null,
    })

    const counterPatch: Record<string, unknown> = { id: slide.id }
    if (input.event_type === "impression") {
      counterPatch.views_count = Number(slide.views_count ?? 0) + 1
    } else if (input.event_type === "complete") {
      counterPatch.completions_count = Number(slide.completions_count ?? 0) + 1
    } else if (
      input.event_type === "hotspot_click" ||
      input.event_type === "link_click"
    ) {
      counterPatch.clicks_count = Number(slide.clicks_count ?? 0) + 1
    } else if (input.event_type === "add_to_cart") {
      counterPatch.cart_conversions_count =
        Number(slide.cart_conversions_count ?? 0) + 1
    }

    const updated =
      Object.keys(counterPatch).length > 1
        ? await this.updateStories(counterPatch)
        : slide

    return {
      ok: true,
      story: await this.hydrateSlide(updated as unknown as StorySlideDTO),
    }
  }

  async getAnalyticsOverview(): Promise<StoriesAnalyticsOverview> {
    const [groups, slides, stickers, events] = await Promise.all([
      this.listStoryGroups({}),
      this.listStories({}),
      this.listStoryStickers({}),
      this.listStoryEvents({}),
    ])

    const now = new Date()
    const activeSlidesCount = slides.filter(
      (s) =>
        s.is_active &&
        (!s.starts_at || new Date(s.starts_at) <= now) &&
        (!s.expires_at || new Date(s.expires_at) > now)
    ).length

    const groupMap = new Map<string, { title: string }>()
    for (const g of groups) {
      groupMap.set(g.id, { title: g.title })
    }

    const stickerInteractionsByStory = new Map<string, number>()
    let totalStickerInteractions = 0
    for (const stk of stickers) {
      const count = Number(stk.total_interactions ?? 0)
      totalStickerInteractions += count
      stickerInteractionsByStory.set(
        stk.story_id,
        (stickerInteractionsByStory.get(stk.story_id) ?? 0) + count
      )
    }

    const linkClicksByStory = new Map<string, number>()
    let totalLinkClicks = 0
    for (const evt of events) {
      if (evt.event_type === "link_click") {
        totalLinkClicks++
        linkClicksByStory.set(
          evt.story_id,
          (linkClicksByStory.get(evt.story_id) ?? 0) + 1
        )
      }
    }

    let totalImpressions = 0
    let totalCompletions = 0
    let totalHotspotClicks = 0
    let totalCartConversions = 0

    for (const s of slides) {
      totalImpressions += Number(s.views_count ?? 0)
      totalCompletions += Number(s.completions_count ?? 0)
      totalHotspotClicks += Number(s.clicks_count ?? 0)
      totalCartConversions += Number(s.cart_conversions_count ?? 0)
    }

    const byGroup: StoryGroupAnalyticsSummary[] = groups.map((g) => {
      const groupSlides = slides.filter((s) => s.group_id === g.id)
      const impressions = groupSlides.reduce(
        (acc, s) => acc + Number(s.views_count ?? 0),
        0
      )
      const completions = groupSlides.reduce(
        (acc, s) => acc + Number(s.completions_count ?? 0),
        0
      )
      const hotspotClicks = groupSlides.reduce(
        (acc, s) => acc + Number(s.clicks_count ?? 0),
        0
      )
      const linkClicks = groupSlides.reduce(
        (acc, s) => acc + (linkClicksByStory.get(s.id) ?? 0),
        0
      )
      const cartConversions = groupSlides.reduce(
        (acc, s) => acc + Number(s.cart_conversions_count ?? 0),
        0
      )
      const stickerInteractions = groupSlides.reduce(
        (acc, s) => acc + (stickerInteractionsByStory.get(s.id) ?? 0),
        0
      )

      return {
        group_id: g.id,
        group_title: g.title,
        slides_count: groupSlides.length,
        impressions,
        completions,
        completion_rate_pct:
          impressions > 0 ? Math.round((completions / impressions) * 100) : 0,
        hotspot_clicks: hotspotClicks,
        link_clicks: linkClicks,
        cart_conversions: cartConversions,
        conversion_rate_pct:
          impressions > 0
            ? Math.round((cartConversions / impressions) * 1000) / 10
            : 0,
        sticker_interactions: stickerInteractions,
      }
    })

    const topSlides = [...slides]
      .sort((a, b) => Number(b.views_count ?? 0) - Number(a.views_count ?? 0))
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        title: s.title,
        group_title: s.group_id
          ? (groupMap.get(s.group_id)?.title ?? null)
          : null,
        impressions: Number(s.views_count ?? 0),
        completions: Number(s.completions_count ?? 0),
        hotspot_clicks: Number(s.clicks_count ?? 0),
        cart_conversions: Number(s.cart_conversions_count ?? 0),
      }))

    return {
      total_groups: groups.length,
      active_groups: groups.filter((g) => g.is_active).length,
      total_slides: slides.length,
      active_slides: activeSlidesCount,
      total_impressions: totalImpressions,
      total_completions: totalCompletions,
      overall_completion_rate_pct:
        totalImpressions > 0
          ? Math.round((totalCompletions / totalImpressions) * 100)
          : 0,
      total_hotspot_clicks: totalHotspotClicks,
      total_link_clicks: totalLinkClicks,
      total_cart_conversions: totalCartConversions,
      overall_conversion_rate_pct:
        totalImpressions > 0
          ? Math.round((totalCartConversions / totalImpressions) * 1000) / 10
          : 0,
      total_sticker_interactions: totalStickerInteractions,
      by_group: byGroup,
      top_slides: topSlides,
    }
  }

  // ─── Scheduled Expiration & Lifecycle Management ───────────────────────────

  async expireOutdatedStories(referenceTime?: Date): Promise<{
    expired_slides: number
    expired_ids: string[]
  }> {
    const now = referenceTime ?? new Date()
    const activeSlides = await this.listStories({ is_active: true })
    const expiredIds: string[] = []

    for (const slide of activeSlides) {
      if (slide.expires_at && new Date(slide.expires_at) <= now) {
        await this.updateStories({
          id: slide.id,
          is_active: false,
        })
        expiredIds.push(slide.id)
      }
    }

    return {
      expired_slides: expiredIds.length,
      expired_ids: expiredIds,
    }
  }

  async removeHotspotsByProductId(productId: string): Promise<{
    removed_count: number
    removed_ids: string[]
  }> {
    const trimmed = String(productId || "").trim()
    if (!trimmed) {
      return { removed_count: 0, removed_ids: [] }
    }
    const matching = await this.listStoryHotspots({ product_id: trimmed })
    const removedIds: string[] = []
    for (const hs of matching ?? []) {
      await this.deleteStoryHotspots(hs.id)
      removedIds.push(hs.id)
    }
    return {
      removed_count: removedIds.length,
      removed_ids: removedIds,
    }
  }
}

export default StoriesModuleService

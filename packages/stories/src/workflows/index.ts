import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  resolveStoriesService,
  type StoryEngagementEventType,
  type StoryMediaType,
  type StoryPlacementZone,
  type StoryRingTheme,
  type StoryStickerType,
} from "../modules/story"

const createStoryGroupStep = createStep(
  "create-story-group",
  async (
    input: {
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
    },
    { container }
  ) => {
    const storiesService = resolveStoriesService(container)
    const group = await storiesService.createGroup(input)
    return new StepResponse(group, { groupId: group.id })
  },
  async (compInput, { container }) => {
    if (!compInput?.groupId) return
    const storiesService = resolveStoriesService(container)
    await storiesService.deleteGroup(compInput.groupId)
  }
)

export const createStoryGroupWorkflow = createWorkflow(
  "create-story-group",
  (input: {
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
  }) => {
    const group = createStoryGroupStep(input)
    return new WorkflowResponse(group)
  }
)

const createStorySlideStep = createStep(
  "create-story-slide",
  async (
    input: {
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
    },
    { container }
  ) => {
    const storiesService = resolveStoriesService(container)
    const slide = await storiesService.createSlide(input)
    return new StepResponse(slide, { slideId: slide.id })
  },
  async (compInput, { container }) => {
    if (!compInput?.slideId) return
    const storiesService = resolveStoriesService(container)
    await storiesService.deleteSlide(compInput.slideId)
  }
)

export const createStorySlideWorkflow = createWorkflow(
  "create-story-slide",
  (input: {
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
  }) => {
    const slide = createStorySlideStep(input)
    return new WorkflowResponse(slide)
  }
)

const recordStoryEngagementStep = createStep(
  "record-story-engagement",
  async (
    input: {
      story_id: string
      event_type: StoryEngagementEventType
      hotspot_id?: string | null
      sticker_id?: string | null
      product_id?: string | null
      session_id?: string | null
    },
    { container }
  ) => {
    const storiesService = resolveStoriesService(container)
    const res = await storiesService.recordEngagementEvent(input)
    return new StepResponse(res)
  }
)

export const recordStoryEngagementWorkflow = createWorkflow(
  "record-story-engagement",
  (input: {
    story_id: string
    event_type: StoryEngagementEventType
    hotspot_id?: string | null
    sticker_id?: string | null
    product_id?: string | null
    session_id?: string | null
  }) => {
    const res = recordStoryEngagementStep(input)
    return new WorkflowResponse(res)
  }
)

const expireEphemeralStoriesStep = createStep(
  "expire-ephemeral-stories",
  async (_input: Record<string, never>, { container }) => {
    const storiesService = resolveStoriesService(container)
    const res = await storiesService.expireOutdatedStories()
    return new StepResponse(res)
  }
)

export const expireEphemeralStoriesWorkflow = createWorkflow(
  "expire-ephemeral-stories",
  (input: Record<string, never> = {}) => {
    const res = expireEphemeralStoriesStep(input)
    return new WorkflowResponse(res)
  }
)

export const expireStoriesWorkflow = expireEphemeralStoriesWorkflow

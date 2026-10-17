import { useCallback, useEffect, useState } from "react"
import type {
  CreateStoryGroupInput,
  CreateStoryHotspotInput,
  CreateStorySlideInput,
  CreateStoryStickerInput,
  InteractWithStoryStickerInput,
  RecordStoryEngagementInput,
  UpdateStoryGroupInput,
  UpdateStorySlideInput,
} from "../api/validators"
import type {
  StoriesAnalyticsOverview,
  StoriesMutationHookOptions,
  StoriesQueryHookOptions,
  StoryGroupDTO,
  StoryHotspotDTO,
  StoryPlacementZone,
  StorySlideDTO,
  StoryStickerDTO,
} from "../modules/story/types"
import { defaultStoriesSdk, storiesQueryKeys } from "../sdk"
import { useStoriesMutation, useStoriesQuery } from "./use-sdk-primitives"

export * from "./use-sdk-primitives"

const SEEN_STORIES_STORAGE_KEY = "medusa_stories_seen_v1"

// ─── Admin Hooks ─────────────────────────────────────────────────────────────

export function useAdminStoriesState(
  filters?: { product_id?: string },
  options?: StoriesQueryHookOptions<{
    stories: StorySlideDTO[]
    groups: StoryGroupDTO[]
  }>
) {
  return useStoriesQuery(
    storiesQueryKeys.adminState(filters),
    () => defaultStoriesSdk.admin.listStudioState(filters),
    options
  )
}

export function useStoriesAnalytics(
  options?: StoriesQueryHookOptions<{ analytics: StoriesAnalyticsOverview }>
) {
  return useStoriesQuery(
    storiesQueryKeys.analytics(),
    () => defaultStoriesSdk.admin.getAnalytics(),
    options
  )
}

export function useCreateStoryGroup(
  options?: StoriesMutationHookOptions<
    { group: StoryGroupDTO },
    CreateStoryGroupInput
  >
) {
  return useStoriesMutation(
    (payload) => defaultStoriesSdk.admin.createGroup(payload),
    options,
    storiesQueryKeys.all
  )
}

export function useUpdateStoryGroup(
  options?: StoriesMutationHookOptions<
    { group: StoryGroupDTO },
    { id: string; patch: UpdateStoryGroupInput }
  >
) {
  return useStoriesMutation(
    ({ id, patch }) => defaultStoriesSdk.admin.updateGroup(id, patch),
    options,
    storiesQueryKeys.all
  )
}

export function useDeleteStoryGroup(
  options?: StoriesMutationHookOptions<
    { id: string; deleted: boolean },
    { id: string }
  >
) {
  return useStoriesMutation(
    ({ id }) => defaultStoriesSdk.admin.deleteGroup(id),
    options,
    storiesQueryKeys.all
  )
}

export function useCreateStorySlide(
  options?: StoriesMutationHookOptions<
    { story: StorySlideDTO },
    CreateStorySlideInput
  >
) {
  return useStoriesMutation(
    (payload) => defaultStoriesSdk.admin.createSlide(payload),
    options,
    storiesQueryKeys.all
  )
}

export function useUpdateStorySlide(
  options?: StoriesMutationHookOptions<
    { story: StorySlideDTO },
    { id: string; patch: UpdateStorySlideInput }
  >
) {
  return useStoriesMutation(
    ({ id, patch }) => defaultStoriesSdk.admin.updateSlide(id, patch),
    options,
    storiesQueryKeys.all
  )
}

export function useDeleteStorySlide(
  options?: StoriesMutationHookOptions<
    { id: string; deleted: boolean },
    { id: string }
  >
) {
  return useStoriesMutation(
    ({ id }) => defaultStoriesSdk.admin.deleteSlide(id),
    options,
    storiesQueryKeys.all
  )
}

export function useAddStoryHotspot(
  options?: StoriesMutationHookOptions<
    { hotspot: StoryHotspotDTO },
    { storyId: string; hotspot: CreateStoryHotspotInput }
  >
) {
  return useStoriesMutation(
    ({ storyId, hotspot }) =>
      defaultStoriesSdk.admin.addHotspot(storyId, hotspot),
    options,
    storiesQueryKeys.all
  )
}

export function useRemoveStoryHotspot(
  options?: StoriesMutationHookOptions<
    { id: string; deleted: boolean },
    { storyId: string; hotspotId: string }
  >
) {
  return useStoriesMutation(
    ({ storyId, hotspotId }) =>
      defaultStoriesSdk.admin.removeHotspot(storyId, hotspotId),
    options,
    storiesQueryKeys.all
  )
}

export function useAddStorySticker(
  options?: StoriesMutationHookOptions<
    { sticker: StoryStickerDTO },
    { storyId: string; sticker: CreateStoryStickerInput }
  >
) {
  return useStoriesMutation(
    ({ storyId, sticker }) =>
      defaultStoriesSdk.admin.addSticker(storyId, sticker),
    options,
    storiesQueryKeys.all
  )
}

export function useRemoveStorySticker(
  options?: StoriesMutationHookOptions<
    { id: string; deleted: boolean },
    { storyId: string; stickerId: string }
  >
) {
  return useStoriesMutation(
    ({ storyId, stickerId }) =>
      defaultStoriesSdk.admin.removeSticker(storyId, stickerId),
    options,
    storiesQueryKeys.all
  )
}

// ─── Storefront Hooks & Interactive 9:16 Player Engine ──────────────────────

export function useStoreStories(
  filters?: {
    placement?: StoryPlacementZone
    target_entity_id?: string
    collection_id?: string
    group_id?: string
    product_id?: string
  },
  options?: StoriesQueryHookOptions<{
    stories: StorySlideDTO[]
    groups: StoryGroupDTO[]
  }>
) {
  return useStoriesQuery(
    storiesQueryKeys.storefront(filters),
    () => defaultStoriesSdk.store.listStories(filters),
    options
  )
}

export function useRecordStoryEvent(
  options?: StoriesMutationHookOptions<
    { ok: boolean; story: StorySlideDTO },
    { storyId: string } & RecordStoryEngagementInput
  >
) {
  return useStoriesMutation(
    ({ storyId, ...payload }) =>
      defaultStoriesSdk.store.recordEvent(storyId, payload),
    options
  )
}

export function useInteractStorySticker(
  options?: StoriesMutationHookOptions<
    { sticker: StoryStickerDTO },
    { storyId: string } & InteractWithStoryStickerInput
  >
) {
  return useStoriesMutation(
    ({ storyId, ...payload }) =>
      defaultStoriesSdk.store.interactWithSticker(storyId, payload),
    options,
    storiesQueryKeys.storefront()
  )
}

/**
 * Headless 9:16 Story Player state machine hook with segmented progress bar tick,
 * pause-on-hold, group-to-group progression, active product sheet, and seen-ring persistence.
 */
export function useStoryPlayer(params: {
  groups: StoryGroupDTO[]
  autoPlay?: boolean
  onSlideImpression?: (slide: StorySlideDTO) => void
  onSlideComplete?: (slide: StorySlideDTO) => void
}) {
  const { groups, autoPlay = true, onSlideImpression, onSlideComplete } = params
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [progressPct, setProgressPct] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedHotspot, setSelectedHotspot] =
    useState<StoryHotspotDTO | null>(null)
  const [seenSlideIds, setSeenSlideIds] = useState<Set<string>>(() => {
    try {
      if (typeof window === "undefined") return new Set()
      const raw = window.localStorage.getItem(SEEN_STORIES_STORAGE_KEY)
      if (!raw) return new Set()
      const parsed = JSON.parse(raw) as string[]
      return new Set(Array.isArray(parsed) ? parsed : [])
    } catch {
      return new Set()
    }
  })

  const activeGroup =
    activeGroupIndex !== null ? (groups[activeGroupIndex] ?? null) : null
  const slides = activeGroup?.slides ?? []
  const activeSlide = slides[activeSlideIndex] ?? null

  const markSlideSeen = useCallback((slideId: string) => {
    setSeenSlideIds((prev) => {
      if (prev.has(slideId)) return prev
      const next = new Set(prev)
      next.add(slideId)
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            SEEN_STORIES_STORAGE_KEY,
            JSON.stringify(Array.from(next).slice(-500))
          )
        }
      } catch {
        // Ignore storage quota errors
      }
      return next
    })
  }, [])

  const openGroup = useCallback((groupIndex: number, slideIndex = 0) => {
    setActiveGroupIndex(groupIndex)
    setActiveSlideIndex(slideIndex)
    setProgressPct(0)
    setIsPaused(false)
    setSelectedHotspot(null)
  }, [])

  const closePlayer = useCallback(() => {
    setActiveGroupIndex(null)
    setActiveSlideIndex(0)
    setProgressPct(0)
    setIsPaused(false)
    setSelectedHotspot(null)
  }, [])

  const nextSlide = useCallback(() => {
    if (activeGroupIndex === null) return
    const currentGroup = groups[activeGroupIndex]
    const currentSlides = currentGroup?.slides ?? []

    if (activeSlide) {
      onSlideComplete?.(activeSlide)
    }

    if (activeSlideIndex + 1 < currentSlides.length) {
      setActiveSlideIndex((prev) => prev + 1)
      setProgressPct(0)
      setSelectedHotspot(null)
      return
    }

    if (activeGroupIndex + 1 < groups.length) {
      setActiveGroupIndex((prev) => (prev !== null ? prev + 1 : null))
      setActiveSlideIndex(0)
      setProgressPct(0)
      setSelectedHotspot(null)
      return
    }

    closePlayer()
  }, [
    activeGroupIndex,
    activeSlide,
    activeSlideIndex,
    closePlayer,
    groups,
    onSlideComplete,
  ])

  const prevSlide = useCallback(() => {
    if (activeGroupIndex === null) return
    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1)
      setProgressPct(0)
      setSelectedHotspot(null)
      return
    }
    if (activeGroupIndex > 0) {
      const prevGroupIdx = activeGroupIndex - 1
      const prevGroupSlides = groups[prevGroupIdx]?.slides ?? []
      setActiveGroupIndex(prevGroupIdx)
      setActiveSlideIndex(Math.max(0, prevGroupSlides.length - 1))
      setProgressPct(0)
      setSelectedHotspot(null)
    }
  }, [activeGroupIndex, activeSlideIndex, groups])

  useEffect(() => {
    if (!activeSlide) return
    markSlideSeen(activeSlide.id)
    onSlideImpression?.(activeSlide)
  }, [activeSlide, markSlideSeen, onSlideImpression])

  useEffect(() => {
    if (
      !autoPlay ||
      !activeSlide ||
      isPaused ||
      Boolean(selectedHotspot)
    ) {
      return
    }

    const duration = Math.max(1000, activeSlide.duration_ms || 5000)
    const tickMs = 50
    const stepPct = (tickMs / duration) * 100

    const interval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev + stepPct >= 100) {
          return 100
        }
        return prev + stepPct
      })
    }, tickMs)

    return () => clearInterval(interval)
  }, [activeSlide, autoPlay, isPaused, selectedHotspot])

  useEffect(() => {
    if (progressPct >= 100 && activeSlide && !isPaused && !selectedHotspot) {
      nextSlide()
    }
  }, [progressPct, activeSlide, isPaused, selectedHotspot, nextSlide])

  const isGroupSeen = useCallback(
    (group: StoryGroupDTO) => {
      const groupSlides = group.slides ?? []
      if (!groupSlides.length) return false
      return groupSlides.every((s) => seenSlideIds.has(s.id))
    },
    [seenSlideIds]
  )

  return {
    isOpen: activeGroup !== null,
    activeGroup,
    activeGroupIndex,
    activeSlide,
    activeSlideIndex,
    progressPct,
    isPaused,
    setIsPaused,
    selectedHotspot,
    setSelectedHotspot,
    openGroup,
    closePlayer,
    nextSlide,
    prevSlide,
    isGroupSeen,
    seenSlideIds,
  }
}

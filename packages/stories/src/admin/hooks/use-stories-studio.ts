import { useEffect, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  useAddStoryHotspot,
  useAddStorySticker,
  useAdminStoriesState,
  useCreateStoryGroup,
  useCreateStorySlide,
  useDeleteStoryGroup,
  useDeleteStorySlide,
  useRemoveStoryHotspot,
  useRemoveStorySticker,
  useStoriesAnalytics,
  useUpdateStoryGroup,
  useUpdateStorySlide,
} from "../../hooks"
import type {
  StoryMediaType,
  StoryPlacementZone,
  StoryRingTheme,
  StoryStickerType,
} from "../../modules/story/types"

export interface NewGroupFormState {
  title: string
  subtitle: string
  avatar_url: string
  ring_theme: StoryRingTheme
  custom_ring_color: string
  placement: StoryPlacementZone
  is_pinned: boolean
  is_ephemeral: boolean
}

export interface NewSlideFormState {
  group_id: string
  title: string
  caption: string
  media_type: StoryMediaType
  media_url: string
  thumbnail_url: string
  duration_ms: number
  link_url: string
  link_text: string
  is_ephemeral_24h: boolean
}

export interface NewHotspotFormState {
  product_id: string
  product_title: string
  product_handle: string
  price_formatted: string
  label: string
  x_percent: number
  y_percent: number
}

export interface NewStickerFormState {
  type: StoryStickerType
  prompt: string
  option_one: string
  option_two: string
  coupon_code: string
  countdown_until: string
  x_percent: number
  y_percent: number
}

export const useStoriesStudio = () => {
  const { t } = useTranslation()
  const studioQuery = useAdminStoriesState()
  const analyticsQuery = useStoriesAnalytics()

  const createGroupMutation = useCreateStoryGroup()
  const updateGroupMutation = useUpdateStoryGroup()
  const deleteGroupMutation = useDeleteStoryGroup()
  const createSlideMutation = useCreateStorySlide()
  const updateSlideMutation = useUpdateStorySlide()
  const deleteSlideMutation = useDeleteStorySlide()
  const addHotspotMutation = useAddStoryHotspot()
  const removeHotspotMutation = useRemoveStoryHotspot()
  const addStickerMutation = useAddStorySticker()
  const removeStickerMutation = useRemoveStorySticker()

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)

  const [groupForm, setGroupForm] = useState<NewGroupFormState>({
    title: "",
    subtitle: "",
    avatar_url: "",
    ring_theme: "instagram",
    custom_ring_color: "#6366f1",
    placement: "home",
    is_pinned: true,
    is_ephemeral: false,
  })

  const [slideForm, setSlideForm] = useState<NewSlideFormState>({
    group_id: "",
    title: "",
    caption: "",
    media_type: "image",
    media_url: "",
    thumbnail_url: "",
    duration_ms: 5000,
    link_url: "",
    link_text: "Shop Now",
    is_ephemeral_24h: false,
  })

  const [hotspotForm, setHotspotForm] = useState<NewHotspotFormState>({
    product_id: "",
    product_title: "",
    product_handle: "",
    price_formatted: "$49.00",
    label: "",
    x_percent: 50,
    y_percent: 62,
  })

  const [stickerForm, setStickerForm] = useState<NewStickerFormState>({
    type: "poll",
    prompt: "",
    option_one: "Yes 🔥",
    option_two: "Show me more",
    coupon_code: "STORY15",
    countdown_until: "",
    x_percent: 50,
    y_percent: 25,
  })

  const groups = studioQuery.data?.groups ?? []
  const slides = studioQuery.data?.stories ?? []

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id)
      setSlideForm((prev) => ({ ...prev, group_id: groups[0].id }))
    }
  }, [groups, selectedGroupId])

  useEffect(() => {
    if (!selectedSlideId && slides.length > 0) {
      setSelectedSlideId(slides[0].id)
    }
  }, [slides, selectedSlideId])

  const selectedSlide =
    slides.find((s) => s.id === selectedSlideId) ?? slides[0] ?? null

  const notify = (msg: string, tone: "success" | "error" = "success") => {
    if (tone === "error") {
      toast.error(msg)
    } else {
      toast.success(msg)
    }
  }

  const handleCreateGroup = async () => {
    try {
      const res = await createGroupMutation.mutateAsync({
        title: groupForm.title,
        subtitle: groupForm.subtitle || null,
        avatar_url: groupForm.avatar_url || null,
        ring_theme: groupForm.ring_theme,
        custom_ring_color:
          groupForm.ring_theme === "custom"
            ? groupForm.custom_ring_color
            : null,
        placement: groupForm.placement,
        is_pinned: groupForm.is_pinned,
        is_ephemeral: groupForm.is_ephemeral,
      })
      setSelectedGroupId(res.group.id)
      setGroupForm((prev) => ({ ...prev, title: "", subtitle: "" }))
      notify(t("messages.groupCreated", { title: res.group.title }))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.groupCreateError"),
        "error"
      )
    }
  }

  const handleToggleGroupActive = async (id: string, isActive: boolean) => {
    try {
      await updateGroupMutation.mutateAsync({
        id,
        patch: { is_active: isActive },
      })
      notify(
        isActive ? t("messages.groupActivated") : t("messages.groupPaused")
      )
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.groupUpdateError"),
        "error"
      )
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await deleteGroupMutation.mutateAsync({ id })
      if (selectedGroupId === id) {
        setSelectedGroupId(null)
      }
      notify(t("messages.groupDeleted"))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.groupDeleteError"),
        "error"
      )
    }
  }

  const handleCreateSlide = async () => {
    try {
      const expiresAt = slideForm.is_ephemeral_24h
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null

      const res = await createSlideMutation.mutateAsync({
        group_id: slideForm.group_id || selectedGroupId || null,
        title: slideForm.title,
        caption: slideForm.caption || null,
        media_type: slideForm.media_type,
        media_url: slideForm.media_url,
        thumbnail_url: slideForm.thumbnail_url || null,
        duration_ms: slideForm.duration_ms,
        link_url: slideForm.link_url || null,
        link_text: slideForm.link_text || null,
        expires_at: expiresAt,
      })
      setSelectedSlideId(res.story.id)
      setSlideForm((prev) => ({
        ...prev,
        title: "",
        caption: "",
        media_url: "",
      }))
      notify(t("messages.slideCreated", { title: res.story.title }))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.slideCreateError"),
        "error"
      )
    }
  }

  const handleToggleSlideActive = async (id: string, isActive: boolean) => {
    try {
      await updateSlideMutation.mutateAsync({
        id,
        patch: { is_active: isActive },
      })
      notify(
        isActive ? t("messages.slideActivated") : t("messages.slidePaused")
      )
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.slideUpdateError"),
        "error"
      )
    }
  }

  const handleDeleteSlide = async (id: string) => {
    try {
      await deleteSlideMutation.mutateAsync({ id })
      if (selectedSlideId === id) {
        setSelectedSlideId(null)
      }
      notify(t("messages.slideDeleted"))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.slideDeleteError"),
        "error"
      )
    }
  }

  const handleCanvasCoordinateClick = (xPercent: number, yPercent: number) => {
    setHotspotForm((prev) => ({
      ...prev,
      x_percent: Math.round(xPercent * 10) / 10,
      y_percent: Math.round(yPercent * 10) / 10,
    }))
  }

  const handleAddHotspot = async () => {
    if (!selectedSlide) {
      notify(t("messages.selectSlideForHotspot"), "error")
      return
    }
    try {
      await addHotspotMutation.mutateAsync({
        storyId: selectedSlide.id,
        hotspot: {
          product_id: hotspotForm.product_id,
          product_title: hotspotForm.product_title,
          product_handle: hotspotForm.product_handle || null,
          price_formatted: hotspotForm.price_formatted || null,
          label: hotspotForm.label || null,
          x_percent: hotspotForm.x_percent,
          y_percent: hotspotForm.y_percent,
        },
      })
      setHotspotForm((prev) => ({
        ...prev,
        product_id: "",
        product_title: "",
        label: "",
      }))
      notify(
        t("messages.hotspotPinned", {
          x: hotspotForm.x_percent,
          y: hotspotForm.y_percent,
        })
      )
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.hotspotPinError"),
        "error"
      )
    }
  }

  const handleRemoveHotspot = async (hotspotId: string) => {
    if (!selectedSlide) return
    try {
      await removeHotspotMutation.mutateAsync({
        storyId: selectedSlide.id,
        hotspotId,
      })
      notify(t("messages.hotspotRemoved"))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.hotspotRemoveError"),
        "error"
      )
    }
  }

  const handleAddSticker = async () => {
    if (!selectedSlide) {
      notify(t("messages.selectSlideForSticker"), "error")
      return
    }
    try {
      await addStickerMutation.mutateAsync({
        storyId: selectedSlide.id,
        sticker: {
          type: stickerForm.type,
          prompt: stickerForm.prompt,
          x_percent: stickerForm.x_percent,
          y_percent: stickerForm.y_percent,
          options:
            stickerForm.type === "poll"
              ? [
                  { id: "opt_1", label: stickerForm.option_one || "Yes" },
                  { id: "opt_2", label: stickerForm.option_two || "No" },
                ]
              : null,
          coupon_code:
            stickerForm.type === "coupon" ? stickerForm.coupon_code : null,
          countdown_until:
            stickerForm.type === "countdown"
              ? stickerForm.countdown_until
              : null,
        },
      })
      setStickerForm((prev) => ({ ...prev, prompt: "" }))
      notify(t("messages.stickerAdded"))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.stickerAddError"),
        "error"
      )
    }
  }

  const handleRemoveSticker = async (stickerId: string) => {
    if (!selectedSlide) return
    try {
      await removeStickerMutation.mutateAsync({
        storyId: selectedSlide.id,
        stickerId,
      })
      notify(t("messages.stickerRemoved"))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.stickerRemoveError"),
        "error"
      )
    }
  }

  return {
    groups,
    slides,
    selectedGroupId,
    setSelectedGroupId,
    selectedSlide,
    selectedSlideId,
    setSelectedSlideId,
    analytics: analyticsQuery.data?.analytics,
    isLoading: studioQuery.isLoading || analyticsQuery.isLoading,
    groupForm,
    setGroupForm,
    slideForm,
    setSlideForm,
    hotspotForm,
    setHotspotForm,
    stickerForm,
    setStickerForm,
    isSavingGroup: createGroupMutation.isPending,
    isSavingSlide: createSlideMutation.isPending,
    isSavingHotspot: addHotspotMutation.isPending,
    isSavingSticker: addStickerMutation.isPending,
    onRefresh: () => {
      void studioQuery.refetch()
      void analyticsQuery.refetch()
    },
    handleCreateGroup,
    handleToggleGroupActive,
    handleDeleteGroup,
    handleCreateSlide,
    handleToggleSlideActive,
    handleDeleteSlide,
    handleCanvasCoordinateClick,
    handleAddHotspot,
    handleRemoveHotspot,
    handleAddSticker,
    handleRemoveSticker,
  }
}

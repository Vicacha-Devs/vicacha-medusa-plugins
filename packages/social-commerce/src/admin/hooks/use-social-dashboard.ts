import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  CatalogSyncItemRecord,
  LiveSessionRecord,
  MediaType,
  SocialAccountPublicDTO,
  SocialMediaPostRecord,
  SocialPlatform,
} from "../../modules/social-commerce/types/index.js"
import { sanitizeClientUrl, type ActiveTab } from "../utils/formatters.js"

export interface CreateStoryFormState {
  title: string
  mediaUrl: string
  mediaType: MediaType
  linkUrl: string
  durationSeconds: number
}

export interface CreateLiveFormState {
  title: string
  platform: SocialPlatform
  streamUrl: string
}

/**
 * Decoupled state and API orchestration hook for the Social Commerce Admin page.
 */
export const useSocialDashboard = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ActiveTab>("accounts")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [accounts, setAccounts] = useState<SocialAccountPublicDTO[]>([])
  const [posts, setPosts] = useState<SocialMediaPostRecord[]>([])
  const [liveSessions, setLiveSessions] = useState<LiveSessionRecord[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogSyncItemRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [storyForm, setStoryForm] = useState<CreateStoryFormState>({
    title: "",
    mediaUrl: "",
    mediaType: "story",
    linkUrl: "",
    durationSeconds: 15,
  })

  const [liveForm, setLiveForm] = useState<CreateLiveFormState>({
    title: "",
    platform: "tiktok",
    streamUrl: "",
  })

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const querySuffix =
        platformFilter !== "all"
          ? `?platform=${encodeURIComponent(platformFilter)}`
          : ""

      const [accRes, postRes, liveRes, catRes] = await Promise.all([
        fetch(`/admin/social/accounts${querySuffix}`, {
          credentials: "include",
        }),
        fetch(`/admin/social/posts${querySuffix}`, {
          credentials: "include",
        }),
        fetch(`/admin/social/live${querySuffix}`, {
          credentials: "include",
        }),
        fetch(`/admin/social/catalog${querySuffix}`, {
          credentials: "include",
        }),
      ])

      if (accRes.ok) {
        const data = (await accRes.json()) as {
          accounts?: SocialAccountPublicDTO[]
        }
        setAccounts(data.accounts ?? [])
      }
      if (postRes.ok) {
        const data = (await postRes.json()) as {
          posts?: SocialMediaPostRecord[]
        }
        setPosts(data.posts ?? [])
      }
      if (liveRes.ok) {
        const data = (await liveRes.json()) as {
          live_sessions?: LiveSessionRecord[]
        }
        setLiveSessions(data.live_sessions ?? [])
      }
      if (catRes.ok) {
        const data = (await catRes.json()) as {
          items?: CatalogSyncItemRecord[]
        }
        setCatalogItems(data.items ?? [])
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.loadDashboardError")
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [platformFilter, t])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  const handleConnectPlatform = async (
    platform: "tiktok" | "instagram" | "facebook"
  ) => {
    setErrorMessage(null)
    try {
      const response = await fetch("/admin/social/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })
      const data = (await response.json()) as {
        authorization_url?: string
        message?: string
      }
      if (!response.ok || !data.authorization_url) {
        const msg = data.message ?? t("messages.oauthInitError", { platform })
        setErrorMessage(msg)
        toast.error(msg)
        return
      }
      const safeAuthUrl = sanitizeClientUrl(data.authorization_url)
      if (safeAuthUrl !== "#") {
        window.location.assign(safeAuthUrl)
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.oauthRequestError")
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  const handleTriggerSync = async () => {
    setStatusMessage(t("messages.syncingMedia"))
    setErrorMessage(null)
    try {
      const response = await fetch("/admin/social/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          platformFilter !== "all" ? { platform: platformFilter } : {}
        ),
      })
      const data = (await response.json()) as {
        synced_count?: number
        message?: string
      }
      if (!response.ok) {
        const msg = data.message ?? t("messages.syncMediaError")
        setErrorMessage(msg)
        setStatusMessage(null)
        toast.error(msg)
        return
      }
      const successMsg = t("messages.syncMediaSuccess", {
        count: data.synced_count ?? 0,
      })
      setStatusMessage(successMsg)
      toast.success(successMsg)
      await loadDashboardData()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.syncMediaError")
      setErrorMessage(msg)
      setStatusMessage(null)
      toast.error(msg)
    }
  }

  const submitLocalStory = async (
    values: CreateStoryFormState
  ): Promise<boolean> => {
    setErrorMessage(null)
    try {
      const response = await fetch("/admin/social/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          media_url: values.mediaUrl,
          media_type: values.mediaType,
          link_url: values.linkUrl || undefined,
          duration_seconds: values.durationSeconds,
          is_featured: true,
        }),
      })
      const data = (await response.json()) as { message?: string }
      if (!response.ok) {
        const msg = data.message ?? t("messages.createStoryError")
        setErrorMessage(msg)
        toast.error(msg)
        return false
      }
      setStoryForm({
        title: "",
        mediaUrl: "",
        mediaType: "story",
        linkUrl: "",
        durationSeconds: 15,
      })
      const successMsg = t("messages.createStorySuccess")
      setStatusMessage(successMsg)
      toast.success(successMsg)
      await loadDashboardData()
      return true
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.createStoryError")
      setErrorMessage(msg)
      toast.error(msg)
      return false
    }
  }

  const handleCreateLocalStory = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault()
    }
    await submitLocalStory(storyForm)
  }

  const submitLiveSession = async (
    values: CreateLiveFormState
  ): Promise<boolean> => {
    setErrorMessage(null)
    try {
      const response = await fetch("/admin/social/live", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: values.platform,
          title: values.title,
          stream_url: values.streamUrl || undefined,
        }),
      })
      const data = (await response.json()) as { message?: string }
      if (!response.ok) {
        const msg = data.message ?? t("messages.scheduleLiveError")
        setErrorMessage(msg)
        toast.error(msg)
        return false
      }
      setLiveForm((prev) => ({ ...prev, title: "", streamUrl: "" }))
      const successMsg = t("messages.scheduleLiveSuccess")
      setStatusMessage(successMsg)
      toast.success(successMsg)
      await loadDashboardData()
      return true
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.scheduleLiveError")
      setErrorMessage(msg)
      toast.error(msg)
      return false
    }
  }

  const handleCreateLiveSession = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault()
    }
    await submitLiveSession(liveForm)
  }

  const handleLiveTransition = async (
    sessionId: string,
    action: "start" | "end"
  ) => {
    setErrorMessage(null)
    try {
      const response = await fetch(
        `/admin/social/live/${encodeURIComponent(sessionId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      )
      if (response.ok) {
        const successMsg =
          action === "start"
            ? t("messages.liveStarted")
            : t("messages.liveEnded")
        setStatusMessage(successMsg)
        toast.success(successMsg)
        await loadDashboardData()
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.liveTransitionError")
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  const storiesList = posts.filter((p) => p.media_type === "story")

  return {
    activeTab,
    setActiveTab,
    platformFilter,
    setPlatformFilter,
    accounts,
    posts,
    storiesList,
    liveSessions,
    catalogItems,
    loading,
    statusMessage,
    errorMessage,
    storyForm,
    setStoryForm,
    liveForm,
    setLiveForm,
    loadDashboardData,
    handleConnectPlatform,
    handleTriggerSync,
    submitLocalStory,
    handleCreateLocalStory,
    submitLiveSession,
    handleCreateLiveSession,
    handleLiveTransition,
  }
}



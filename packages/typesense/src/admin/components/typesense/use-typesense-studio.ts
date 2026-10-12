import { toast } from "@medusajs/ui"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  AnalyticsSummary,
  CollectionOverviewItem,
  CurationItem,
  PlaygroundResponse,
  StopwordSetItem,
  SyncJobItem,
  SynonymItem,
  TypesenseNodeInfo,
  TypesenseTabKey,
} from "./types"

export function useTypesenseStudio() {
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState<TypesenseTabKey>("overview")
  const [loading, setLoading] = useState<boolean>(true)
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null)

  // Overview state
  const [healthy, setHealthy] = useState<boolean>(false)
  const [nodeInfo, setNodeInfo] = useState<TypesenseNodeInfo | null>(null)
  const [collections, setCollections] = useState<CollectionOverviewItem[]>([])
  const [syncJobs, setSyncJobs] = useState<SyncJobItem[]>([])

  // Custom Entity Form state
  const [entityKey, setEntityKey] = useState<string>("")
  const [graphEntity, setGraphEntity] = useState<string>("")
  const [graphFieldsStr, setGraphFieldsStr] = useState<string>(
    "id, title, name, handle, description, status"
  )
  const [queryByStr, setQueryByStr] = useState<string>(
    "title, name, handle, description"
  )
  const [facetByStr, setFacetByStr] = useState<string>("status")
  const [enableEmbedder, setEnableEmbedder] = useState<boolean>(false)
  const [embedderModel, setEmbedderModel] = useState<string>(
    "ts/all-MiniLM-L6-v2"
  )

  // Merchandising state
  const [merchEntity, setMerchEntity] = useState<string>("products")
  const [synonyms, setSynonyms] = useState<SynonymItem[]>([])
  const [curations, setCurations] = useState<CurationItem[]>([])
  const [stopwords, setStopwords] = useState<StopwordSetItem[]>([])

  const [synId, setSynId] = useState<string>("")
  const [synRoot, setSynRoot] = useState<string>("")
  const [synTerms, setSynTerms] = useState<string>("")

  const [curId, setCurId] = useState<string>("")
  const [curQuery, setCurQuery] = useState<string>("")
  const [curMatch, setCurMatch] = useState<"exact" | "contains">("exact")
  const [curIncludesStr, setCurIncludesStr] = useState<string>("")
  const [curExcludesStr, setCurExcludesStr] = useState<string>("")
  const [curBannerTitle, setCurBannerTitle] = useState<string>("")

  const [stopId, setStopId] = useState<string>("")
  const [stopWordsStr, setStopWordsStr] = useState<string>("")

  // Playground state
  const [playEntity, setPlayEntity] = useState<string>("products")
  const [playQuery, setPlayQuery] = useState<string>("")
  const [playMode, setPlayMode] = useState<string>("keyword")
  const [playAlpha, setPlayAlpha] = useState<string>("0.3")
  const [playResult, setPlayResult] = useState<PlaygroundResponse | null>(null)
  const [playLoading, setPlayLoading] = useState<boolean>(false)

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/typesense/health", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setHealthy(Boolean(data.healthy))
        setNodeInfo(data.node || null)
        setCollections(Array.isArray(data.collections) ? data.collections : [])
        setSyncJobs(
          Array.isArray(data.recentSyncJobs) ? data.recentSyncJobs : []
        )
      }
    } catch {
      toast.error(t("messages.loadOverviewError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  const fetchMerchandising = useCallback(async (entity: string) => {
    try {
      const [synRes, curRes, stopRes] = await Promise.all([
        fetch(`/admin/typesense/synonyms/${encodeURIComponent(entity)}`, {
          credentials: "include",
        }),
        fetch(`/admin/typesense/curations/${encodeURIComponent(entity)}`, {
          credentials: "include",
        }),
        fetch("/admin/typesense/stopwords", {
          credentials: "include",
        }),
      ])

      if (synRes.ok) {
        const d = await synRes.json()
        setSynonyms(Array.isArray(d.synonyms) ? d.synonyms : [])
      }
      if (curRes.ok) {
        const d = await curRes.json()
        setCurations(Array.isArray(d.curations) ? d.curations : [])
      }
      if (stopRes.ok) {
        const d = await stopRes.json()
        setStopwords(Array.isArray(d.stopwords) ? d.stopwords : [])
      }
    } catch {
      // Ignore background merchandising errors
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/admin/typesense/analytics", {
        credentials: "include",
      })
      if (res.ok) {
        setAnalytics(await res.json())
      }
    } catch {
      // Ignore background analytics errors
    }
  }, [])

  useEffect(() => {
    void fetchOverview()
    void fetchAnalytics()
  }, [fetchOverview, fetchAnalytics])

  useEffect(() => {
    void fetchMerchandising(merchEntity)
  }, [merchEntity, fetchMerchandising])

  const handleSyncEntity = async (entity?: string) => {
    const target = entity || "all"
    setSyncingEntity(target)
    try {
      const url = entity
        ? `/admin/typesense/collections/${encodeURIComponent(entity)}/sync`
        : "/admin/typesense/collections"
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_reindex: true }),
      })

      if (res.ok) {
        toast.success(
          entity
            ? t("messages.rebuildEntitySuccess", { entity })
            : t("messages.rebuildAllSuccess")
        )
        await fetchOverview()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("messages.reindexFailed"))
      }
    } catch {
      toast.error(t("messages.networkSyncError"))
    } finally {
      setSyncingEntity(null)
    }
  }

  const handleSaveEntityConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entityKey.trim()) {
      toast.error(t("messages.entityKeyRequired"))
      return
    }

    try {
      const payload = {
        entity: entityKey.trim().toLowerCase(),
        enabled: true,
        graph_entity:
          graphEntity.trim() || entityKey.trim().replace(/s$/, ""),
        graph_fields: graphFieldsStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        query_by: queryByStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        facet_by: facetByStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        embedder: enableEmbedder
          ? {
              enabled: true,
              model_name: embedderModel,
              field_name: "embedding",
            }
          : null,
      }

      const res = await fetch("/admin/typesense/entities", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(t("messages.entitySaved", { entity: payload.entity }))
        setEntityKey("")
        setGraphEntity("")
        await fetchOverview()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("messages.entitySaveError"))
      }
    } catch {
      toast.error(t("messages.entitySaveError"))
    }
  }

  const handleDeleteCustomEntity = async (entity: string) => {
    try {
      const res = await fetch(
        `/admin/typesense/entities/${encodeURIComponent(entity)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (res.ok) {
        toast.success(t("messages.entityRemoved", { entity }))
        await fetchOverview()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message || t("messages.entityRemoveError"))
      }
    } catch {
      toast.error(t("messages.entityRemoveError"))
    }
  }

  const handleCreateSynonym = async (e: React.FormEvent) => {
    e.preventDefault()
    const terms = synTerms
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!synId.trim() || terms.length === 0) {
      toast.error(t("messages.synonymRequired"))
      return
    }

    try {
      const res = await fetch(
        `/admin/typesense/synonyms/${encodeURIComponent(merchEntity)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: synId.trim(),
            synonyms: terms,
            ...(synRoot.trim() ? { root: synRoot.trim() } : {}),
          }),
        }
      )
      if (res.ok) {
        toast.success(t("messages.synonymSaved", { id: synId.trim() }))
        setSynId("")
        setSynRoot("")
        setSynTerms("")
        await fetchMerchandising(merchEntity)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("messages.synonymSaveError"))
      }
    } catch {
      toast.error(t("messages.synonymSaveError"))
    }
  }

  const handleDeleteSynonym = async (id: string) => {
    try {
      const res = await fetch(
        `/admin/typesense/synonyms/${encodeURIComponent(merchEntity)}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (res.ok) {
        toast.success(t("messages.synonymDeleted", { id }))
        await fetchMerchandising(merchEntity)
      }
    } catch {
      toast.error(t("messages.synonymDeleteError"))
    }
  }

  const handleCreateCuration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!curId.trim() || !curQuery.trim()) {
      toast.error(t("messages.curationRequired"))
      return
    }

    const includes = curIncludesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair, idx) => {
        const [docId, posStr] = pair.split(":")
        return {
          id: docId.trim(),
          position: posStr ? Number(posStr) : idx + 1,
        }
      })

    const excludes = curExcludesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => ({ id }))

    try {
      const res = await fetch(
        `/admin/typesense/curations/${encodeURIComponent(merchEntity)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: curId.trim(),
            rule: {
              query: curQuery.trim(),
              match: curMatch,
            },
            ...(includes.length > 0 ? { includes } : {}),
            ...(excludes.length > 0 ? { excludes } : {}),
            ...(curBannerTitle.trim()
              ? { metadata: { promo_banner: curBannerTitle.trim() } }
              : {}),
          }),
        }
      )
      if (res.ok) {
        toast.success(t("messages.curationSaved", { id: curId.trim() }))
        setCurId("")
        setCurQuery("")
        setCurIncludesStr("")
        setCurExcludesStr("")
        setCurBannerTitle("")
        await fetchMerchandising(merchEntity)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(
          err.detail || err.message || t("messages.curationSaveError")
        )
      }
    } catch {
      toast.error(t("messages.curationSaveError"))
    }
  }

  const handleDeleteCuration = async (id: string) => {
    try {
      const res = await fetch(
        `/admin/typesense/curations/${encodeURIComponent(merchEntity)}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (res.ok) {
        toast.success(t("messages.curationDeleted", { id }))
        await fetchMerchandising(merchEntity)
      }
    } catch {
      toast.error(t("messages.curationDeleteError"))
    }
  }

  const handleCreateStopwords = async (e: React.FormEvent) => {
    e.preventDefault()
    const words = stopWordsStr
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean)
    if (!stopId.trim() || words.length === 0) {
      toast.error(t("messages.stopwordsRequired"))
      return
    }

    try {
      const res = await fetch("/admin/typesense/stopwords", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: stopId.trim(),
          stopwords: words,
        }),
      })
      if (res.ok) {
        toast.success(t("messages.stopwordsSaved", { id: stopId.trim() }))
        setStopId("")
        setStopWordsStr("")
        await fetchMerchandising(merchEntity)
      }
    } catch {
      toast.error(t("messages.stopwordsSaveError"))
    }
  }

  const handleDeleteStopwords = async (id: string) => {
    try {
      const res = await fetch(
        `/admin/typesense/stopwords/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (res.ok) {
        toast.success(t("messages.stopwordsDeleted", { id }))
        await fetchMerchandising(merchEntity)
      }
    } catch {
      toast.error(t("messages.stopwordsDeleteError"))
    }
  }

  const handleRunPlayground = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setPlayLoading(true)
    try {
      const res = await fetch("/admin/typesense/playground", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: playEntity,
          q: playQuery || "*",
          mode: playMode,
          alpha: Number(playAlpha) || 0.3,
          disjunctive_facets: true,
          limit: 12,
        }),
      })
      if (res.ok) {
        setPlayResult(await res.json())
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("messages.playgroundError"))
      }
    } catch {
      toast.error(t("messages.playgroundError"))
    } finally {
      setPlayLoading(false)
    }
  }

  const prefillSynonymFromNoHitQuery = (query: string) => {
    setSynId(
      `syn-${String(query)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`
    )
    setSynTerms(String(query))
    setActiveTab("merchandising")
  }

  return {
    activeTab,
    setActiveTab,
    loading,
    syncingEntity,
    healthy,
    nodeInfo,
    collections,
    syncJobs,
    entityForm: {
      entityKey,
      setEntityKey,
      graphEntity,
      setGraphEntity,
      graphFieldsStr,
      setGraphFieldsStr,
      queryByStr,
      setQueryByStr,
      facetByStr,
      setFacetByStr,
      enableEmbedder,
      setEnableEmbedder,
      embedderModel,
      setEmbedderModel,
      handleSaveEntityConfig,
    },
    merchandising: {
      merchEntity,
      setMerchEntity,
      synonyms,
      curations,
      stopwords,
      synId,
      setSynId,
      synRoot,
      setSynRoot,
      synTerms,
      setSynTerms,
      curId,
      setCurId,
      curQuery,
      setCurQuery,
      curMatch,
      setCurMatch,
      curIncludesStr,
      setCurIncludesStr,
      curExcludesStr,
      setCurExcludesStr,
      curBannerTitle,
      setCurBannerTitle,
      stopId,
      setStopId,
      stopWordsStr,
      setStopWordsStr,
      handleCreateSynonym,
      handleDeleteSynonym,
      handleCreateCuration,
      handleDeleteCuration,
      handleCreateStopwords,
      handleDeleteStopwords,
    },
    playground: {
      playEntity,
      setPlayEntity,
      playQuery,
      setPlayQuery,
      playMode,
      setPlayMode,
      playAlpha,
      setPlayAlpha,
      playResult,
      playLoading,
      handleRunPlayground,
    },
    analytics,
    fetchOverview,
    handleSyncEntity,
    handleDeleteCustomEntity,
    prefillSynonymFromNoHitQuery,
  }
}

import { useCallback, useEffect, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  useDeleteTypesenseCuration,
  useDeleteTypesenseCustomEntity,
  useDeleteTypesenseStopwords,
  useDeleteTypesenseSynonym,
  useSyncAllTypesenseCollections,
  useSyncTypesenseEntityCollection,
  useTypesenseAnalytics,
  useTypesenseCollections,
  useTypesenseCurations,
  useTypesenseEntities,
  useTypesenseHealth,
  useTypesensePlaygroundSearch,
  useTypesenseStopwords,
  useTypesenseSynonyms,
  useUpsertTypesenseCuration,
  useUpsertTypesenseEntityConfig,
  useUpsertTypesenseStopwords,
  useUpsertTypesenseSynonym,
} from "../../../hooks"
import { invalidateTypesenseQueries, typesenseQueryKeys } from "../../../sdk"
import type { EntityConfigPayload } from "./types"

export function useTypesenseStudio() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState("collections")
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null)

  // Entity Designer state
  const [selectedEntity, setSelectedEntity] = useState<string>("product")
  const [editingEntity, setEditingEntity] =
    useState<EntityConfigPayload | null>(null)
  const [newEntityName, setNewEntityName] = useState("")
  const [newEntityFields, setNewEntityFields] = useState("id, title, handle")

  // Merchandising state
  const [merchEntity, setMerchEntity] = useState("product")
  const [synId, setSynId] = useState("")
  const [synTerms, setSynTerms] = useState("")
  const [synRoot, setSynRoot] = useState("")

  const [curId, setCurId] = useState("")
  const [curQuery, setCurQuery] = useState("")
  const [curMatch, setCurMatch] = useState<"exact" | "contains">("exact")
  const [curPinIds, setCurPinIds] = useState("")
  const [curHideIds, setCurHideIds] = useState("")

  const [stopId, setStopId] = useState("default_stopwords")
  const [stopWordsInput, setStopWordsInput] = useState("the, a, an, of, in")

  // Playground state
  const [pgEntity, setPgEntity] = useState("product")
  const [pgQuery, setPgQuery] = useState("")
  const [pgMode, setPgMode] = useState<
    "keyword" | "semantic" | "hybrid" | "conversational"
  >("hybrid")
  const [pgAlpha, setPgAlpha] = useState("0.3")
  const [pgLocale, setPgLocale] = useState("")
  const [pgFacets, setPgFacets] = useState(
    "category_names,brand,status,min_price"
  )

  const handleLoadError = useCallback(() => {
    toast.error(t("studio.messages.loadError"))
  }, [t])

  // Queries via SDK hooks
  const { data: healthData, isLoading: healthLoading } = useTypesenseHealth({
    onError: handleLoadError,
  })
  const { data: collectionsData, isLoading: collectionsLoading } =
    useTypesenseCollections({
      onError: handleLoadError,
    })
  const { data: entitiesData, isLoading: entitiesLoading } =
    useTypesenseEntities({
      onError: handleLoadError,
    })
  const { data: stopwordsData } = useTypesenseStopwords()
  const { data: analyticsData } = useTypesenseAnalytics()
  const { data: synonymsData, refetch: refetchSynonyms } =
    useTypesenseSynonyms(merchEntity)
  const { data: curationsData, refetch: refetchCurations } =
    useTypesenseCurations(merchEntity)

  const health = healthData ?? null
  const collections = collectionsData?.collections || []
  const recentLogs = collectionsData?.recent_logs || []
  const entities = entitiesData?.entities || []
  const stopwords = stopwordsData?.stopwords || []
  const analytics = analyticsData ?? null
  const synonyms = synonymsData?.synonyms || []
  const curations = curationsData?.curations || []
  const loading = healthLoading || collectionsLoading || entitiesLoading

  useEffect(() => {
    if (entities.length > 0 && !editingEntity) {
      const found =
        entities.find((e) => e.entity_type === selectedEntity) || entities[0]
      setEditingEntity(found)
    }
  }, [entities, selectedEntity, editingEntity])

  // Mutations via SDK hooks
  const syncAllMutation = useSyncAllTypesenseCollections()
  const syncEntityMutation = useSyncTypesenseEntityCollection()
  const upsertEntityMutation = useUpsertTypesenseEntityConfig()
  const deleteEntityMutation = useDeleteTypesenseCustomEntity()
  const upsertSynonymMutation = useUpsertTypesenseSynonym()
  const deleteSynonymMutation = useDeleteTypesenseSynonym()
  const upsertCurationMutation = useUpsertTypesenseCuration()
  const deleteCurationMutation = useDeleteTypesenseCuration()
  const upsertStopwordsMutation = useUpsertTypesenseStopwords()
  const deleteStopwordsMutation = useDeleteTypesenseStopwords()
  const playgroundMutation = useTypesensePlaygroundSearch()

  const fetchOverview = useCallback(async () => {
    invalidateTypesenseQueries(typesenseQueryKeys.all)
  }, [])

  const fetchMerchandising = useCallback(
    async (_entity: string) => {
      await Promise.all([refetchSynonyms(), refetchCurations()])
    },
    [refetchSynonyms, refetchCurations]
  )

  const handleSyncAll = async () => {
    setSyncingEntity("__all__")
    try {
      const data = await syncAllMutation.mutateAsync({
        recreate: true,
        zero_downtime: true,
      })
      const totalProcessed = (data.results || []).reduce(
        (acc: number, r: any) => acc + (r.processed || 0),
        0
      )
      toast.success(
        t("studio.messages.syncedAllSuccess", {
          documents: totalProcessed,
          collections: (data.results || []).length,
        })
      )
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.syncError"))
    } finally {
      setSyncingEntity(null)
    }
  }

  const handleSyncEntity = async (entity: string, zeroDowntime = true) => {
    setSyncingEntity(entity)
    try {
      const data = await syncEntityMutation.mutateAsync({
        entity,
        payload: { recreate: true, zero_downtime: zeroDowntime },
      })
      toast.success(
        t("studio.messages.syncedEntitySuccess", {
          entity,
          processed: data.processed,
          failed: data.failed,
        })
      )
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.entitySyncError"))
    } finally {
      setSyncingEntity(null)
    }
  }

  const handleSaveEntityConfig = async () => {
    if (!editingEntity) return
    try {
      await upsertEntityMutation.mutateAsync(editingEntity)
      toast.success(
        t("studio.messages.savedEntitySuccess", {
          entity: editingEntity.entity_type,
        })
      )
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.saveEntityError"))
    }
  }

  const handleAddCustomEntity = async () => {
    if (!newEntityName.trim()) {
      toast.error(t("studio.messages.enterEntityName"))
      return
    }
    const fields = newEntityFields
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      await upsertEntityMutation.mutateAsync({
        entity_type: newEntityName.trim(),
        enabled: true,
        query_by_fields: fields,
        query_by_weights: fields.map(() => 1),
        facet_fields: [],
        searchable_fields: fields,
        typo_tolerance_enabled: true,
      })
      toast.success(
        t("studio.messages.registeredEntitySuccess", {
          entity: newEntityName.trim(),
        })
      )
      setNewEntityName("")
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.registerEntityError"))
    }
  }

  const handleDeleteCustomEntity = async (entityType: string) => {
    try {
      await deleteEntityMutation.mutateAsync({ entity: entityType })
      toast.success(
        t("studio.messages.RemovedEntitySuccess", { entity: entityType })
      )
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.deleteEntityError"))
    }
  }

  const handleUpsertSynonym = async () => {
    if (!synId.trim() || !synTerms.trim()) {
      toast.error(t("studio.messages.synonymValidation"))
      return
    }
    try {
      await upsertSynonymMutation.mutateAsync({
        entity: merchEntity,
        payload: {
          id: synId.trim(),
          synonyms: synTerms
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          root: synRoot.trim() || undefined,
        },
      })
      toast.success(
        t("studio.messages.savedSynonymSuccess", { id: synId.trim() })
      )
      setSynId("")
      setSynTerms("")
      setSynRoot("")
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.saveSynonymError"))
    }
  }

  const handleDeleteSynonym = async (id: string) => {
    await deleteSynonymMutation.mutateAsync({ entity: merchEntity, id })
    toast.success(t("studio.messages.deletedSynonymSuccess", { id }))
  }

  const handleUpsertCuration = async () => {
    if (!curId.trim() || !curQuery.trim()) {
      toast.error(t("studio.messages.curationValidation"))
      return
    }
    const includes = curPinIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id, idx) => ({ id, position: idx + 1 }))
    const excludes = curHideIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => ({ id }))

    try {
      await upsertCurationMutation.mutateAsync({
        entity: merchEntity,
        payload: {
          id: curId.trim(),
          rule: { query: curQuery.trim(), match: curMatch },
          includes: includes.length > 0 ? includes : undefined,
          excludes: excludes.length > 0 ? excludes : undefined,
        },
      })
      toast.success(
        t("studio.messages.savedCurationSuccess", { id: curId.trim() })
      )
      setCurId("")
      setCurQuery("")
      setCurPinIds("")
      setCurHideIds("")
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.saveCurationError"))
    }
  }

  const handleDeleteCuration = async (id: string) => {
    await deleteCurationMutation.mutateAsync({ entity: merchEntity, id })
    toast.success(t("studio.messages.deletedCurationSuccess", { id }))
  }

  const handleUpsertStopwords = async () => {
    if (!stopId.trim() || !stopWordsInput.trim()) return
    try {
      await upsertStopwordsMutation.mutateAsync({
        id: stopId.trim(),
        stopwords: stopWordsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      })
      toast.success(
        t("studio.messages.savedStopwordsSuccess", { id: stopId.trim() })
      )
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.saveStopwordsError"))
    }
  }

  const handleDeleteStopwords = async (id: string) => {
    await deleteStopwordsMutation.mutateAsync({ id })
    toast.success(t("studio.messages.deletedStopwordsSuccess", { id }))
  }

  const handleRunPlaygroundSearch = async () => {
    try {
      await playgroundMutation.mutateAsync({
        entity: pgEntity,
        q: pgQuery,
        mode: pgMode,
        alpha: Number(pgAlpha) || 0.3,
        locale: pgLocale.trim() || undefined,
        facets: pgFacets
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        disjunctive_facets: true,
        limit: 12,
      })
    } catch (e: any) {
      toast.error(e.message || t("studio.messages.playgroundError"))
    }
  }

  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").split(
    /[-_]/
  )[0]
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return {
    t,
    i18n,
    currentLang,
    isRtl,
    activeTab,
    setActiveTab,
    loading,
    syncingEntity,
    health,
    collections,
    recentLogs,
    entities,
    selectedEntity,
    setSelectedEntity,
    editingEntity,
    setEditingEntity,
    newEntityName,
    setNewEntityName,
    newEntityFields,
    setNewEntityFields,
    merchEntity,
    setMerchEntity,
    synonyms,
    curations,
    stopwords,
    synId,
    setSynId,
    synTerms,
    setSynTerms,
    synRoot,
    setSynRoot,
    curId,
    setCurId,
    curQuery,
    setCurQuery,
    curMatch,
    setCurMatch,
    curPinIds,
    setCurPinIds,
    curHideIds,
    setCurHideIds,
    stopId,
    setStopId,
    stopWordsInput,
    setStopWordsInput,
    pgEntity,
    setPgEntity,
    pgQuery,
    setPgQuery,
    pgMode,
    setPgMode,
    pgAlpha,
    setPgAlpha,
    pgLocale,
    setPgLocale,
    pgFacets,
    setPgFacets,
    pgLoading: playgroundMutation.isPending,
    pgResult: playgroundMutation.data ?? null,
    analytics,
    fetchOverview,
    fetchMerchandising,
    handleSyncAll,
    handleSyncEntity,
    handleSaveEntityConfig,
    handleAddCustomEntity,
    handleDeleteCustomEntity,
    handleUpsertSynonym,
    handleDeleteSynonym,
    handleUpsertCuration,
    handleDeleteCuration,
    handleUpsertStopwords,
    handleDeleteStopwords,
    handleRunPlaygroundSearch,
  }
}

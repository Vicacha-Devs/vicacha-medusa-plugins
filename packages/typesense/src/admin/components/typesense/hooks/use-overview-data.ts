import { toast } from "@medusajs/ui"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  useSyncAllTypesenseCollections,
  useSyncTypesenseEntityCollection,
  useTypesenseAnalytics,
  useTypesenseCollections,
  useTypesenseEntities,
  useTypesenseHealth,
} from "../../../../hooks"
import { invalidateTypesenseQueries, typesenseQueryKeys } from "../../../../sdk"
import type {
  CollectionOverviewItem,
  SyncJobItem,
  TypesenseNodeInfo,
} from "../types"

/**
 * Cluster health, collections, entity configs, analytics and (re)sync actions.
 */
export function useOverviewData() {
  const { t } = useTranslation()
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null)

  const handleLoadError = useCallback(() => {
    toast.error(t("messages.loadOverviewError"))
  }, [t])

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
  const { data: analyticsData } = useTypesenseAnalytics()

  const syncAllMutation = useSyncAllTypesenseCollections()
  const syncEntityMutation = useSyncTypesenseEntityCollection()

  const healthy = Boolean(
    healthData?.healthy ?? (collectionsData as any)?.healthy
  )
  const nodeInfo = ((healthData as any)?.node as TypesenseNodeInfo) ?? null
  const collections = ((collectionsData?.collections ??
    (healthData as any)?.collections ??
    []) as CollectionOverviewItem[])
  const syncJobs = (((healthData as any)?.recentSyncJobs ??
    (collectionsData as any)?.recentSyncJobs ??
    collectionsData?.recent_logs ??
    []) as SyncJobItem[])
  const entities = entitiesData?.entities || []
  const analytics = analyticsData ?? null
  const loading = healthLoading || collectionsLoading || entitiesLoading

  const fetchOverview = useCallback(async () => {
    invalidateTypesenseQueries(typesenseQueryKeys.all)
  }, [])

  const handleSyncEntity = useCallback(
    async (entity?: string) => {
      setSyncingEntity(entity || "all")
      try {
        if (entity) {
          await syncEntityMutation.mutateAsync({
            entity,
            payload: { recreate: true, zero_downtime: true },
          })
          toast.success(t("messages.rebuildEntitySuccess", { entity }))
        } else {
          await syncAllMutation.mutateAsync({
            recreate: true,
            zero_downtime: true,
          })
          toast.success(t("messages.rebuildAllSuccess"))
        }
      } catch (e: any) {
        toast.error(e?.message || t("messages.reindexFailed"))
      } finally {
        setSyncingEntity(null)
      }
    },
    [syncAllMutation, syncEntityMutation, t]
  )

  return {
    healthy,
    nodeInfo,
    loading,
    syncingEntity,
    collections,
    syncJobs,
    entities,
    analytics,
    fetchOverview,
    handleSyncEntity,
  }
}

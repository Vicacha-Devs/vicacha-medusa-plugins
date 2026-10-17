import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  useEntityDesigner,
  useMerchandising,
  useOverviewData,
  usePlayground,
} from "./hooks"
import type { TypesenseTabKey } from "./types"

export function useTypesenseStudio(initialSynonymQuery?: string) {
  const { i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<TypesenseTabKey>("overview")

  const overview = useOverviewData()
  const { entityForm, handleDeleteCustomEntity } = useEntityDesigner(
    overview.entities
  )
  const { merchandising, prefillSynonym } = useMerchandising(
    overview.collections,
    initialSynonymQuery
  )
  const playground = usePlayground(overview.collections)

  const prefillSynonymFromNoHitQuery = (query: string) => {
    prefillSynonym(query)
    setActiveTab("merchandising")
  }

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return {
    isRtl,
    activeTab,
    setActiveTab,
    healthy: overview.healthy,
    nodeInfo: overview.nodeInfo,
    loading: overview.loading,
    syncingEntity: overview.syncingEntity,
    collections: overview.collections,
    syncJobs: overview.syncJobs,
    entities: overview.entities,
    analytics: overview.analytics,
    fetchOverview: overview.fetchOverview,
    handleSyncEntity: overview.handleSyncEntity,
    handleSyncAll: () => overview.handleSyncEntity(),
    handleDeleteCustomEntity,
    prefillSynonymFromNoHitQuery,
    entityForm,
    merchandising,
    playground,
  }
}

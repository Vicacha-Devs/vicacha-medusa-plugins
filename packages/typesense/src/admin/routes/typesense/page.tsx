import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import React, { useCallback, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"

interface CollectionOverviewItem {
  entity: string
  enabled: boolean
  isCustom: boolean
  aliasName: string
  physicalCollection: string | null
  numDocuments: number
  numFields: number
  hasVectorEmbedder: boolean
  embedderModel: string | null
  synonymsCount: number
  curationsCount: number
}

interface SyncJobItem {
  id: string
  entity: string
  collection_name: string
  alias_name: string | null
  locale: string
  action: string
  status: string
  documents_processed: number
  documents_failed: number
  duration_ms: number | null
  triggered_by: string
  error_message: string | null
  created_at: string
}

/**
 * Safely renders `<mark>...</mark>` highlight snippets from Typesense as React elements
 * without ever using dangerouslySetInnerHTML or innerHTML.
 */
function renderSafeHighlight(snippet: string): React.ReactNode {
  if (!snippet) return null
  const parts = snippet.split(/(<mark>.*?<\/mark>)/g)
  return parts.map((part, idx) => {
    if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
      const inner = part.slice(6, -7)
      return (
        <mark
          key={idx}
          className="rounded bg-amber-200 px-1 font-medium text-amber-950"
        >
          {inner}
        </mark>
      )
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

const TypesenseAdminPage: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [loading, setLoading] = useState<boolean>(true)
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null)

  // Overview state
  const [healthy, setHealthy] = useState<boolean>(false)
  const [nodeInfo, setNodeInfo] = useState<{
    host: string
    port: number
    protocol: string
  } | null>(null)
  const [collections, setCollections] = useState<CollectionOverviewItem[]>([])
  const [syncJobs, setSyncJobs] = useState<SyncJobItem[]>([])

  // Custom Entity Form state
  const [entityKey, setEntityKey] = useState<string>("")
  const [graphEntity, setGraphEntity] = useState<string>("")
  const [graphFieldsStr, setGraphFieldsStr] = useState<string>("id, title, name, handle, description, status")
  const [queryByStr, setQueryByStr] = useState<string>("title, name, handle, description")
  const [facetByStr, setFacetByStr] = useState<string>("status")
  const [enableEmbedder, setEnableEmbedder] = useState<boolean>(false)
  const [embedderModel, setEmbedderModel] = useState<string>("ts/all-MiniLM-L6-v2")

  // Merchandising state
  const [merchEntity, setMerchEntity] = useState<string>("products")
  const [synonyms, setSynonyms] = useState<any[]>([])
  const [curations, setCurations] = useState<any[]>([])
  const [stopwords, setStopwords] = useState<any[]>([])

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
  const [playResult, setPlayResult] = useState<any | null>(null)
  const [playLoading, setPlayLoading] = useState<boolean>(false)

  // Analytics state
  const [analytics, setAnalytics] = useState<any | null>(null)

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
      toast.error(t("typesense.toast.loadOverviewFailed"))
    } finally {
      setLoading(false)
    }
  }, [])

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
      // Ignore
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
      // Ignore
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
            ? t("typesense.toast.rebuildEntityDone", { entity })
            : t("typesense.toast.rebuildAllDone")
        )
        await fetchOverview()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("typesense.toast.reindexFailed"))
      }
    } catch {
      toast.error(t("typesense.toast.syncNetworkError"))
    } finally {
      setSyncingEntity(null)
    }
  }

  const handleSaveEntityConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entityKey.trim()) {
      toast.error(t("typesense.toast.entityRequired"))
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
        toast.success(t("typesense.toast.entitySaved", { entity: payload.entity }))
        setEntityKey("")
        setGraphEntity("")
        await fetchOverview()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("typesense.toast.entitySaveFailed"))
      }
    } catch {
      toast.error(t("typesense.toast.entitySaveConfigFailed"))
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
        toast.success(t("typesense.toast.entityRemoved", { entity }))
        await fetchOverview()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message || t("typesense.toast.entityRemoveFailed"))
      }
    } catch {
      toast.error(t("typesense.toast.entityRemoveFailedGeneric"))
    }
  }

  const handleCreateSynonym = async (e: React.FormEvent) => {
    e.preventDefault()
    const terms = synTerms
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!synId.trim() || terms.length === 0) {
      toast.error(t("typesense.toast.synonymRequired"))
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
        toast.success(t("typesense.toast.synonymSaved", { id: synId.trim() }))
        setSynId("")
        setSynRoot("")
        setSynTerms("")
        await fetchMerchandising(merchEntity)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("typesense.toast.synonymSaveFailed"))
      }
    } catch {
      toast.error(t("typesense.toast.synonymSaveFailed"))
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
        toast.success(t("typesense.toast.synonymDeleted", { id }))
        await fetchMerchandising(merchEntity)
      }
    } catch {
      toast.error(t("typesense.toast.synonymDeleteFailed"))
    }
  }

  const handleCreateCuration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!curId.trim() || !curQuery.trim()) {
      toast.error(t("typesense.toast.curationRequired"))
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
        toast.success(t("typesense.toast.curationSaved", { id: curId.trim() }))
        setCurId("")
        setCurQuery("")
        setCurIncludesStr("")
        setCurExcludesStr("")
        setCurBannerTitle("")
        await fetchMerchandising(merchEntity)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.detail || err.message || t("typesense.toast.curationSaveFailed"))
      }
    } catch {
      toast.error(t("typesense.toast.curationSaveRuleFailed"))
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
        toast.success(t("typesense.toast.curationDeleted", { id }))
        await fetchMerchandising(merchEntity)
      }
    } catch {
      toast.error(t("typesense.toast.curationDeleteFailed"))
    }
  }

  const handleCreateStopwords = async (e: React.FormEvent) => {
    e.preventDefault()
    const words = stopWordsStr
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean)
    if (!stopId.trim() || words.length === 0) {
      toast.error(t("typesense.toast.stopwordsRequired"))
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
        toast.success(t("typesense.toast.stopwordsSaved", { id: stopId.trim() }))
        setStopId("")
        setStopWordsStr("")
        await fetchMerchandising(merchEntity)
      }
    } catch {
      toast.error(t("typesense.toast.stopwordsSaveFailed"))
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
        toast.error(err.detail || err.message || t("typesense.toast.playgroundFailed"))
      }
    } catch {
      toast.error(t("typesense.toast.playgroundRequestFailed"))
    } finally {
      setPlayLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-x-3">
            <Heading level="h1">{t("typesense.page.title")}</Heading>
            <Badge color={healthy ? "green" : "red"}>
              {healthy ? t("typesense.page.healthy") : t("typesense.page.unreachable")}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {nodeInfo
              ? t("typesense.page.subtitleConnected", {
                  url: `${nodeInfo.protocol}://${nodeInfo.host}:${nodeInfo.port}`,
                })
              : t("typesense.page.subtitleDefault")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => void fetchOverview()}
            disabled={loading}
          >
            {t("typesense.page.refresh")}
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => void handleSyncEntity()}
            isLoading={syncingEntity === "all"}
          >
            {t("typesense.page.rebuildAll")}
          </Button>
        </div>
      </Container>

      <Container className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="mb-4">
            <Tabs.Trigger value="overview">{t("typesense.tabs.overview")}</Tabs.Trigger>
            <Tabs.Trigger value="entities">
              {t("typesense.tabs.entities")}
            </Tabs.Trigger>
            <Tabs.Trigger value="merchandising">
              {t("typesense.tabs.merchandising")}
            </Tabs.Trigger>
            <Tabs.Trigger value="playground">
              {t("typesense.tabs.playground")}
            </Tabs.Trigger>
            <Tabs.Trigger value="analytics">
              {t("typesense.tabs.analytics")}
            </Tabs.Trigger>
          </Tabs.List>

          {/* TAB 1: OVERVIEW & SYNC */}
          <Tabs.Content value="overview" className="flex flex-col gap-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {collections.map((col) => (
                <div
                  key={col.entity}
                  className="border-ui-border-base flex flex-col justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <Heading level="h2" className="capitalize">
                        {col.entity}
                      </Heading>
                      <div className="flex items-center gap-x-1">
                        {col.isCustom && (
                          <Badge color="purple" size="small">
                            {t("typesense.overview.customEntity")}
                          </Badge>
                        )}
                        <Badge
                          color={col.physicalCollection ? "green" : "orange"}
                          size="small"
                        >
                          {col.physicalCollection
                            ? t("typesense.overview.indexed")
                            : t("typesense.overview.notIndexed")}
                        </Badge>
                      </div>
                    </div>
                    <Text size="xsmall" className="text-ui-fg-subtle mt-1 font-mono">
                      {t("typesense.overview.alias", {
                        alias: col.aliasName,
                        collection: col.physicalCollection || t("typesense.overview.none"),
                      })}
                    </Text>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-ui-bg-subtle rounded p-2">
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {t("typesense.overview.documents")}
                        </Text>
                        <Text weight="plus">{col.numDocuments}</Text>
                      </div>
                      <div className="bg-ui-bg-subtle rounded p-2">
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {t("typesense.overview.synonyms")}
                        </Text>
                        <Text weight="plus">{col.synonymsCount}</Text>
                      </div>
                      <div className="bg-ui-bg-subtle rounded p-2">
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {t("typesense.overview.curations")}
                        </Text>
                        <Text weight="plus">{col.curationsCount}</Text>
                      </div>
                    </div>

                    {col.hasVectorEmbedder && (
                      <div className="mt-2">
                        <Badge color="blue" size="small">
                          {t("typesense.overview.vectorAi", { model: col.embedderModel })}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-x-2">
                    <Button
                      variant="secondary"
                      size="small"
                      className="w-full"
                      onClick={() => void handleSyncEntity(col.entity)}
                      isLoading={syncingEntity === col.entity}
                    >
                      {t("typesense.overview.rebuild")}
                    </Button>
                    {col.isCustom && (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => void handleDeleteCustomEntity(col.entity)}
                      >
                        {t("typesense.overview.remove")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Heading level="h2" className="mb-3">
                {t("typesense.overview.jobsTitle")}
              </Heading>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>{t("typesense.overview.colEntity")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("typesense.overview.colAction")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("typesense.overview.colTarget")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("typesense.overview.colProcessed")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("typesense.overview.colDuration")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("typesense.overview.colStatus")}</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {syncJobs.length === 0 ? (
                    <Table.Row>
                      <Table.Cell className="text-ui-fg-subtle">
                        {t("typesense.overview.noJobs")}
                      </Table.Cell>
                      <Table.Cell>-</Table.Cell>
                      <Table.Cell>-</Table.Cell>
                      <Table.Cell>-</Table.Cell>
                      <Table.Cell>-</Table.Cell>
                      <Table.Cell>-</Table.Cell>
                    </Table.Row>
                  ) : (
                    syncJobs.map((job) => (
                      <Table.Row key={job.id}>
                        <Table.Cell className="font-medium capitalize">
                          {job.entity}
                        </Table.Cell>
                        <Table.Cell>{job.action}</Table.Cell>
                        <Table.Cell className="font-mono text-xs">
                          {job.collection_name}
                        </Table.Cell>
                        <Table.Cell>
                          {t("typesense.overview.docs", {
                            count: job.documents_processed,
                          })}
                          {job.documents_failed > 0
                            ? ` ${t("typesense.overview.failed", {
                                count: job.documents_failed,
                              })}`
                            : ""}
                        </Table.Cell>
                        <Table.Cell>
                          {job.duration_ms != null
                            ? `${job.duration_ms} ms`
                            : "-"}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            color={
                              job.status === "completed"
                                ? "green"
                                : job.status === "failed"
                                  ? "red"
                                  : "orange"
                            }
                            size="small"
                          >
                            {job.status}
                          </Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            </div>
          </Tabs.Content>

          {/* TAB 2: COLLECTIONS & CUSTOM ENTITIES */}
          <Tabs.Content value="entities" className="flex flex-col gap-y-6">
            <div className="border-ui-border-base rounded-lg border p-4">
              <Heading level="h2" className="mb-1">
                {t("typesense.entities.title")}
              </Heading>
              <Text size="small" className="text-ui-fg-subtle mb-4">
                <Trans
                  i18nKey="typesense.entities.description"
                  components={{ code: <code /> }}
                />
              </Text>

              <form
                onSubmit={handleSaveEntityConfig}
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
              >
                <div>
                  <Label htmlFor="entity-key">
                    {t("typesense.entities.entityKey")}
                  </Label>
                  <Input
                    id="entity-key"
                    placeholder="brands"
                    value={entityKey}
                    onChange={(e) => setEntityKey(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="graph-entity">
                    {t("typesense.entities.graphEntity")}
                  </Label>
                  <Input
                    id="graph-entity"
                    placeholder="brand"
                    value={graphEntity}
                    onChange={(e) => setGraphEntity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="graph-fields">
                    {t("typesense.entities.graphFields")}
                  </Label>
                  <Input
                    id="graph-fields"
                    value={graphFieldsStr}
                    onChange={(e) => setGraphFieldsStr(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="query-by">
                    {t("typesense.entities.queryBy")}
                  </Label>
                  <Input
                    id="query-by"
                    value={queryByStr}
                    onChange={(e) => setQueryByStr(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="facet-by">
                    {t("typesense.entities.facetBy")}
                  </Label>
                  <Input
                    id="facet-by"
                    value={facetByStr}
                    onChange={(e) => setFacetByStr(e.target.value)}
                  />
                </div>
                <div className="flex flex-col justify-end gap-y-2">
                  <div className="flex items-center gap-x-2">
                    <Switch
                      id="enable-embedder"
                      checked={enableEmbedder}
                      onCheckedChange={setEnableEmbedder}
                    />
                    <Label htmlFor="enable-embedder">
                    {t("typesense.entities.enableEmbedder")}
                    </Label>
                  </div>
                  {enableEmbedder && (
                    <Select
                      value={embedderModel}
                      onValueChange={setEmbedderModel}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder={t("typesense.entities.selectModel")} />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="ts/all-MiniLM-L6-v2">
                          {t("typesense.entities.modelMiniLm")}
                        </Select.Item>
                        <Select.Item value="ts/e5-small">
                          {t("typesense.entities.modelE5")}
                        </Select.Item>
                        <Select.Item value="ts/multilingual-e5-small">
                          {t("typesense.entities.modelMultiE5")}
                        </Select.Item>
                        <Select.Item value="openai/text-embedding-3-small">
                          openai/text-embedding-3-small (OpenAI)
                        </Select.Item>
                        <Select.Item value="openai/text-embedding-3-large">
                          openai/text-embedding-3-large (OpenAI)
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Button type="submit" variant="primary" size="small">
                    {t("typesense.entities.save")}
                  </Button>
                </div>
              </form>
            </div>
          </Tabs.Content>

          {/* TAB 3: MERCHANDISING STUDIO */}
          <Tabs.Content value="merchandising" className="flex flex-col gap-y-6">
            <div className="flex items-center gap-x-3">
              <Label>{t("typesense.merch.targetEntity")}</Label>
              <div className="w-60">
                <Select value={merchEntity} onValueChange={setMerchEntity}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {collections.map((c) => (
                      <Select.Item key={c.entity} value={c.entity}>
                        {c.entity}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Synonyms Editor */}
              <div className="border-ui-border-base rounded-lg border p-4">
                <Heading level="h2" className="mb-2">
                  {t("typesense.merch.synonymsTitle")}
                </Heading>
                <form
                  onSubmit={handleCreateSynonym}
                  className="mb-4 flex flex-col gap-y-3"
                >
                  <Input
                    placeholder={t("typesense.merch.synId")}
                    value={synId}
                    onChange={(e) => setSynId(e.target.value)}
                  />
                  <Input
                    placeholder={t("typesense.merch.synRoot")}
                    value={synRoot}
                    onChange={(e) => setSynRoot(e.target.value)}
                  />
                  <Input
                    placeholder={t("typesense.merch.synTerms")}
                    value={synTerms}
                    onChange={(e) => setSynTerms(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" size="small">
                    {t("typesense.merch.saveSynonym")}
                  </Button>
                </form>

                <div className="flex flex-col gap-y-2">
                  {synonyms.map((s) => (
                    <div
                      key={s.id}
                      className="bg-ui-bg-subtle flex items-center justify-between rounded p-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold">{s.id}</span>:{" "}
                        {s.root ? `${s.root} → ` : ""}
                        {Array.isArray(s.synonyms) ? s.synonyms.join(", ") : ""}
                      </div>
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => void handleDeleteSynonym(s.id)}
                      >
                        {t("typesense.merch.delete")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curations / Overrides Editor */}
              <div className="border-ui-border-base rounded-lg border p-4">
                <Heading level="h2" className="mb-2">
                  {t("typesense.merch.curationsTitle")}
                </Heading>
                <form
                  onSubmit={handleCreateCuration}
                  className="mb-4 flex flex-col gap-y-3"
                >
                  <Input
                    placeholder={t("typesense.merch.curId")}
                    value={curId}
                    onChange={(e) => setCurId(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder={t("typesense.merch.curQuery")}
                      value={curQuery}
                      onChange={(e) => setCurQuery(e.target.value)}
                    />
                    <Select
                      value={curMatch}
                      onValueChange={(v) =>
                        setCurMatch(v as "exact" | "contains")
                      }
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="exact">
                          {t("typesense.merch.exactMatch")}
                        </Select.Item>
                        <Select.Item value="contains">
                          {t("typesense.merch.containsMatch")}
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                  <Input
                    placeholder={t("typesense.merch.curIncludes")}
                    value={curIncludesStr}
                    onChange={(e) => setCurIncludesStr(e.target.value)}
                  />
                  <Input
                    placeholder={t("typesense.merch.curExcludes")}
                    value={curExcludesStr}
                    onChange={(e) => setCurExcludesStr(e.target.value)}
                  />
                  <Input
                    placeholder={t("typesense.merch.curBanner")}
                    value={curBannerTitle}
                    onChange={(e) => setCurBannerTitle(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" size="small">
                    {t("typesense.merch.saveCuration")}
                  </Button>
                </form>

                <div className="flex flex-col gap-y-2">
                  {curations.map((c) => (
                    <div
                      key={c.id}
                      className="bg-ui-bg-subtle flex items-center justify-between rounded p-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold">{c.id}</span>{" "}
                        <Trans
                          i18nKey="typesense.merch.curationItem"
                          values={{ query: c.rule?.query, match: c.rule?.match }}
                        />
                      </div>
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => void handleDeleteCuration(c.id)}
                      >
                        {t("typesense.merch.delete")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stopwords Set Editor */}
            <div className="border-ui-border-base rounded-lg border p-4">
              <Heading level="h2" className="mb-2">
                {t("typesense.merch.stopwordsTitle")}
              </Heading>
              <form
                onSubmit={handleCreateStopwords}
                className="flex flex-wrap items-center gap-3"
              >
                <Input
                  placeholder={t("typesense.merch.stopId")}
                  value={stopId}
                  onChange={(e) => setStopId(e.target.value)}
                />
                <Input
                  placeholder={t("typesense.merch.stopWords")}
                  value={stopWordsStr}
                  onChange={(e) => setStopWordsStr(e.target.value)}
                />
                <Button type="submit" variant="secondary" size="small">
                  {t("typesense.merch.saveStopwords")}
                </Button>
              </form>
              {stopwords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stopwords.map((sw) => (
                    <Badge key={sw.id} color="grey" size="small">
                      {sw.id}{" "}
                      {t("typesense.merch.stopwordsCount", {
                        count: Array.isArray(sw.stopwords)
                          ? sw.stopwords.length
                          : 0,
                      })}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* TAB 4: AI SEARCH PLAYGROUND */}
          <Tabs.Content value="playground" className="flex flex-col gap-y-4">
            <form
              onSubmit={handleRunPlayground}
              className="border-ui-border-base grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-5"
            >
              <div>
                <Label>{t("typesense.play.entity")}</Label>
                <Select value={playEntity} onValueChange={setPlayEntity}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {collections.map((c) => (
                      <Select.Item key={c.entity} value={c.entity}>
                        {c.entity}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>{t("typesense.play.query")}</Label>
                <Input
                  placeholder={t("typesense.play.queryPlaceholder")}
                  value={playQuery}
                  onChange={(e) => setPlayQuery(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("typesense.play.mode")}</Label>
                <Select value={playMode} onValueChange={setPlayMode}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="keyword">
                      {t("typesense.play.modeKeyword")}
                    </Select.Item>
                    <Select.Item value="hybrid">
                      {t("typesense.play.modeHybrid")}
                    </Select.Item>
                    <Select.Item value="semantic">
                      {t("typesense.play.modeSemantic")}
                    </Select.Item>
                    <Select.Item value="conversational">
                      {t("typesense.play.modeConversational")}
                    </Select.Item>
                  </Select.Content>
                </Select>
              </div>
              <div className="flex items-end gap-x-2">
                <div className="w-24">
                  <Label>{t("typesense.play.alpha")}</Label>
                  <Input
                    value={playAlpha}
                    onChange={(e) => setPlayAlpha(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={playLoading}
                >
                  {t("typesense.play.search")}
                </Button>
              </div>
            </form>

            {playResult && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="border-ui-border-base rounded-lg border p-4">
                  <Heading level="h3" className="mb-2">
                    {t("typesense.play.facets", {
                      count: playResult.facets?.length || 0,
                    })}
                  </Heading>
                  {Array.isArray(playResult.facets) &&
                  playResult.facets.length > 0 ? (
                    playResult.facets.map((f: any) => (
                      <div key={f.field_name} className="mb-3">
                        <Text weight="plus" size="xsmall" className="uppercase">
                          {f.field_name}
                        </Text>
                        <div className="mt-1 flex flex-col gap-y-1">
                          {(f.counts || []).slice(0, 6).map((c: any) => (
                            <div
                              key={c.value}
                              className="flex justify-between text-xs"
                            >
                              <span>{c.value}</span>
                              <Badge size="xsmall" color="grey">
                                {c.count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Text size="small" className="text-ui-fg-subtle">
                      {t("typesense.play.noFacets")}
                    </Text>
                  )}
                </div>

                <div className="flex flex-col gap-y-3 md:col-span-3">
                  <div className="flex items-center justify-between">
                    <Text size="small">
                      <Trans
                        i18nKey="typesense.play.found"
                        values={{
                          found: playResult.found,
                          ms: playResult.search_time_ms,
                          collection: playResult.collection,
                        }}
                        components={{ strong: <strong />, code: <code /> }}
                      />
                    </Text>
                  </div>

                  {playResult.conversation?.answer && (
                    <div className="bg-ui-bg-subtle border-ui-border-base rounded-lg border p-3">
                      <Text weight="plus" size="small">
                        {t("typesense.play.aiAnswer")}
                      </Text>
                      <Text size="small" className="mt-1">
                        {playResult.conversation.answer}
                      </Text>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(playResult.hits || []).map((hit: any, i: number) => {
                      const doc = hit.document || {}
                      const firstHl = Array.isArray(hit.highlights)
                        ? hit.highlights[0]?.snippet
                        : undefined
                      return (
                        <div
                          key={doc.id || i}
                          className="border-ui-border-base rounded-lg border p-3"
                        >
                          <div className="flex items-center justify-between">
                            <Text weight="plus">
                              {doc.title || doc.name || doc.id}
                            </Text>
                            {hit.curated && (
                              <Badge color="purple" size="xsmall">
                                {t("typesense.play.pinned")}
                              </Badge>
                            )}
                          </div>
                          <Text
                            size="xsmall"
                            className="text-ui-fg-subtle font-mono"
                          >
                            ID: {doc.id}{" "}
                            {doc.min_price !== undefined
                              ? t("typesense.play.minPrice", {
                                  price: doc.min_price,
                                })
                              : ""}
                          </Text>
                          {firstHl && (
                            <div className="mt-2 text-xs">
                              {renderSafeHighlight(firstHl)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </Tabs.Content>

          {/* TAB 5: SEARCH ANALYTICS */}
          <Tabs.Content value="analytics" className="flex flex-col gap-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="border-ui-border-base rounded-lg border p-4">
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("typesense.analytics.totalSearches")}
                </Text>
                <Heading level="h2">{analytics?.totalSearches ?? 0}</Heading>
              </div>
              <div className="border-ui-border-base rounded-lg border p-4">
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("typesense.analytics.noHitRate")}
                </Text>
                <Heading level="h2">{analytics?.noHitRate ?? 0}%</Heading>
              </div>
              <div className="border-ui-border-base rounded-lg border p-4">
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("typesense.analytics.ctr")}
                </Text>
                <Heading level="h2">
                  {analytics?.clickThroughRate ?? 0}%
                </Heading>
              </div>
              <div className="border-ui-border-base rounded-lg border p-4">
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("typesense.analytics.conversion")}
                </Text>
                <Heading level="h2">{analytics?.conversionRate ?? 0}%</Heading>
              </div>
              <div className="border-ui-border-base rounded-lg border p-4">
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("typesense.analytics.latency")}
                </Text>
                <Heading level="h2">
                  {analytics?.averageLatencyMs ?? 0} ms
                </Heading>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Heading level="h2" className="mb-2">
                  {t("typesense.analytics.popular")}
                </Heading>
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>{t("typesense.analytics.colQuery")}</Table.HeaderCell>
                      <Table.HeaderCell>{t("typesense.analytics.colSearches")}</Table.HeaderCell>
                      <Table.HeaderCell>{t("typesense.analytics.colAvgHits")}</Table.HeaderCell>
                      <Table.HeaderCell>{t("typesense.analytics.colClicks")}</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(analytics?.popularQueries || []).map((pq: any) => (
                      <Table.Row key={pq.query}>
                        <Table.Cell className="font-medium">
                          {pq.query}
                        </Table.Cell>
                        <Table.Cell>{pq.count}</Table.Cell>
                        <Table.Cell>{pq.avgResults}</Table.Cell>
                        <Table.Cell>{pq.clicks}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>

              <div>
                <Heading level="h2" className="mb-2">
                  {t("typesense.analytics.zeroResult")}
                </Heading>
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>{t("typesense.analytics.colNoHit")}</Table.HeaderCell>
                      <Table.HeaderCell>{t("typesense.analytics.colCount")}</Table.HeaderCell>
                      <Table.HeaderCell>{t("typesense.overview.colAction")}</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(analytics?.noHitQueries || []).map((nh: any) => (
                      <Table.Row key={nh.query}>
                        <Table.Cell className="font-medium">
                          {nh.query}
                        </Table.Cell>
                        <Table.Cell>{nh.count}</Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => {
                              setSynId(
                                `syn-${String(nh.query)
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")}`
                              )
                              setSynTerms(String(nh.query))
                              setActiveTab("merchandising")
                            }}
                          >
                            {t("typesense.analytics.addSynonym")}
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </Tabs.Content>
        </Tabs>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Typesense Search",
  icon: MagnifyingGlass,
})

export default TypesenseAdminPage

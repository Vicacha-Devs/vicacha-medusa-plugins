import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import { Container, Tabs } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { AnalyticsTab } from "../../components/typesense/analytics-tab"
import { EntitiesTab } from "../../components/typesense/entities-tab"
import { TypesenseHeaderBar } from "../../components/typesense/header-bar"
import { MerchandisingTab } from "../../components/typesense/merchandising-tab"
import { OverviewTab } from "../../components/typesense/overview-tab"
import { PlaygroundTab } from "../../components/typesense/playground-tab"
import type { TypesenseTabKey } from "../../components/typesense/types"
import { useTypesenseStudio } from "../../components/typesense/use-typesense-studio"

const TypesenseAdminPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const studio = useTypesenseStudio()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <TypesenseHeaderBar
        healthy={studio.healthy}
        nodeInfo={studio.nodeInfo}
        loading={studio.loading}
        syncingAll={studio.syncingEntity === "all"}
        onRefresh={() => void studio.fetchOverview()}
        onRebuildAll={() => void studio.handleSyncEntity()}
      />

      <Container className="px-6 py-4">
        <Tabs
          value={studio.activeTab}
          onValueChange={(val) => studio.setActiveTab(val as TypesenseTabKey)}
        >
          <Tabs.List className="mb-4">
            <Tabs.Trigger value="overview">{t("tabs.overview")}</Tabs.Trigger>
            <Tabs.Trigger value="entities">{t("tabs.entities")}</Tabs.Trigger>
            <Tabs.Trigger value="merchandising">
              {t("tabs.merchandising")}
            </Tabs.Trigger>
            <Tabs.Trigger value="playground">
              {t("tabs.playground")}
            </Tabs.Trigger>
            <Tabs.Trigger value="analytics">{t("tabs.analytics")}</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview">
            <OverviewTab
              collections={studio.collections}
              syncJobs={studio.syncJobs}
              syncingEntity={studio.syncingEntity}
              onSyncEntity={(entity) => void studio.handleSyncEntity(entity)}
              onDeleteCustomEntity={(entity) =>
                void studio.handleDeleteCustomEntity(entity)
              }
            />
          </Tabs.Content>

          <Tabs.Content value="entities">
            <EntitiesTab
              entityKey={studio.entityForm.entityKey}
              setEntityKey={studio.entityForm.setEntityKey}
              graphEntity={studio.entityForm.graphEntity}
              setGraphEntity={studio.entityForm.setGraphEntity}
              graphFieldsStr={studio.entityForm.graphFieldsStr}
              setGraphFieldsStr={studio.entityForm.setGraphFieldsStr}
              queryByStr={studio.entityForm.queryByStr}
              setQueryByStr={studio.entityForm.setQueryByStr}
              facetByStr={studio.entityForm.facetByStr}
              setFacetByStr={studio.entityForm.setFacetByStr}
              enableEmbedder={studio.entityForm.enableEmbedder}
              setEnableEmbedder={studio.entityForm.setEnableEmbedder}
              embedderModel={studio.entityForm.embedderModel}
              setEmbedderModel={studio.entityForm.setEmbedderModel}
              onSaveEntityConfig={(e) =>
                void studio.entityForm.handleSaveEntityConfig(e)
              }
            />
          </Tabs.Content>

          <Tabs.Content value="merchandising">
            <MerchandisingTab
              collections={studio.collections}
              merchEntity={studio.merchandising.merchEntity}
              setMerchEntity={studio.merchandising.setMerchEntity}
              synonyms={studio.merchandising.synonyms}
              curations={studio.merchandising.curations}
              stopwords={studio.merchandising.stopwords}
              synId={studio.merchandising.synId}
              setSynId={studio.merchandising.setSynId}
              synRoot={studio.merchandising.synRoot}
              setSynRoot={studio.merchandising.setSynRoot}
              synTerms={studio.merchandising.synTerms}
              setSynTerms={studio.merchandising.setSynTerms}
              curId={studio.merchandising.curId}
              setCurId={studio.merchandising.setCurId}
              curQuery={studio.merchandising.curQuery}
              setCurQuery={studio.merchandising.setCurQuery}
              curMatch={studio.merchandising.curMatch}
              setCurMatch={studio.merchandising.setCurMatch}
              curIncludesStr={studio.merchandising.curIncludesStr}
              setCurIncludesStr={studio.merchandising.setCurIncludesStr}
              curExcludesStr={studio.merchandising.curExcludesStr}
              setCurExcludesStr={studio.merchandising.setCurExcludesStr}
              curBannerTitle={studio.merchandising.curBannerTitle}
              setCurBannerTitle={studio.merchandising.setCurBannerTitle}
              stopId={studio.merchandising.stopId}
              setStopId={studio.merchandising.setStopId}
              stopWordsStr={studio.merchandising.stopWordsStr}
              setStopWordsStr={studio.merchandising.setStopWordsStr}
              onCreateSynonym={(e) =>
                void studio.merchandising.handleCreateSynonym(e)
              }
              onDeleteSynonym={(id) =>
                void studio.merchandising.handleDeleteSynonym(id)
              }
              onCreateCuration={(e) =>
                void studio.merchandising.handleCreateCuration(e)
              }
              onDeleteCuration={(id) =>
                void studio.merchandising.handleDeleteCuration(id)
              }
              onCreateStopwords={(e) =>
                void studio.merchandising.handleCreateStopwords(e)
              }
              onDeleteStopwords={(id) =>
                void studio.merchandising.handleDeleteStopwords(id)
              }
            />
          </Tabs.Content>

          <Tabs.Content value="playground">
            <PlaygroundTab
              collections={studio.collections}
              playEntity={studio.playground.playEntity}
              setPlayEntity={studio.playground.setPlayEntity}
              playQuery={studio.playground.playQuery}
              setPlayQuery={studio.playground.setPlayQuery}
              playMode={studio.playground.playMode}
              setPlayMode={studio.playground.setPlayMode}
              playAlpha={studio.playground.playAlpha}
              setPlayAlpha={studio.playground.setPlayAlpha}
              playResult={studio.playground.playResult}
              playLoading={studio.playground.playLoading}
              onRunPlayground={(e) =>
                void studio.playground.handleRunPlayground(e)
              }
            />
          </Tabs.Content>

          <Tabs.Content value="analytics">
            <AnalyticsTab
              analytics={studio.analytics}
              onAddSynonymForQuery={studio.prefillSynonymFromNoHitQuery}
            />
          </Tabs.Content>
        </Tabs>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "nav.label",
  icon: MagnifyingGlass,
  translationNs: "typesense",
})

export default TypesenseAdminPage

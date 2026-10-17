import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import {
  ChartBar,
  CheckCircle,
  CommandLine,
  DocumentText,
  MagnifyingGlass,
  Sparkles,
  Swatch,
  Tag,
} from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { TypesenseHeaderBar } from "../../components/typesense/header-bar"
import {
  NavigationCard,
  StatCard,
} from "../../components/typesense/overview-cards"
import { OverviewTab } from "../../components/typesense/overview-tab"
import { useTypesenseStudio } from "../../components/typesense/use-typesense-studio"

const TypesenseOverviewPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const studio = useTypesenseStudio()

  const totalDocuments = studio.collections.reduce(
    (sum, col) => sum + (col.numDocuments ?? 0),
    0
  )

  return (
    <LayoutComposer
      widgetsZonePrefix="typesense.overview"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <div
            className="flex flex-col gap-y-4"
            dir={studio.isRtl ? "rtl" : "ltr"}
          >
            <LayoutComposer.Entry id="TypesenseOverviewHeader">
              <TypesenseHeaderBar
                healthy={studio.healthy}
                nodeInfo={studio.nodeInfo}
                loading={studio.loading}
                syncingAll={studio.syncingEntity === "all"}
                onRefresh={() => void studio.fetchOverview()}
                onRebuildAll={() => void studio.handleSyncEntity()}
              />
            </LayoutComposer.Entry>

            <LayoutComposer.Entry id="TypesenseOverviewStats">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  title={
                    studio.healthy
                      ? t("header.healthy")
                      : t("header.unreachable")
                  }
                  value={
                    studio.nodeInfo
                      ? `${studio.nodeInfo.host}:${studio.nodeInfo.port}`
                      : studio.healthy
                        ? "OK"
                        : "—"
                  }
                  icon={<CheckCircle />}
                  loading={studio.loading}
                  onClick={() => navigate("/typesense/collections")}
                />

                <StatCard
                  title={t("tabs.entities")}
                  value={studio.collections.length}
                  icon={<Swatch />}
                  loading={studio.loading}
                  onClick={() => navigate("/typesense/entities")}
                />

                <StatCard
                  title={t("overview.documents")}
                  value={totalDocuments}
                  icon={<DocumentText />}
                  loading={studio.loading}
                  onClick={() => navigate("/typesense/collections")}
                />

                <StatCard
                  title={t("analytics.totalSearches")}
                  value={studio.analytics?.totalSearches ?? 0}
                  icon={<ChartBar />}
                  loading={studio.loading}
                  onClick={() => navigate("/typesense/analytics")}
                />
              </div>
            </LayoutComposer.Entry>

            <LayoutComposer.Entry id="TypesenseOverviewNavigation">
              <Container className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-ui-border-base">
                  <Heading level="h2">{t("header.title")}</Heading>
                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.defaultSubtitle")}
                  </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <NavigationCard
                    icon={<Swatch />}
                    title={t("tabs.entities")}
                    description={t("entities.subtitle")}
                    onClick={() => navigate("/typesense/entities")}
                    position="top-left"
                  />

                  <NavigationCard
                    icon={<Tag />}
                    title={t("tabs.merchandising")}
                    description={`${t("merchandising.synonymsTitle")} • ${t("merchandising.curationsTitle")}`}
                    onClick={() => navigate("/typesense/merchandising")}
                    position="top-right"
                  />

                  <NavigationCard
                    icon={<CommandLine />}
                    title={t("tabs.playground")}
                    description={t("playground.queryPlaceholder")}
                    onClick={() => navigate("/typesense/playground")}
                    position="bottom-left"
                  />

                  <NavigationCard
                    icon={<Sparkles />}
                    title={t("tabs.analytics")}
                    description={`${t("analytics.popularQueriesTitle")} • ${t("analytics.zeroResultTitle")}`}
                    onClick={() => navigate("/typesense/analytics")}
                    position="bottom-right"
                  />
                </div>
              </Container>
            </LayoutComposer.Entry>

            <LayoutComposer.Entry id="TypesenseOverviewCollections">
              <OverviewTab
                collections={studio.collections}
                syncJobs={studio.syncJobs}
                syncingEntity={studio.syncingEntity}
                onSyncEntity={(entity) => void studio.handleSyncEntity(entity)}
                onDeleteCustomEntity={(entity) =>
                  void studio.handleDeleteCustomEntity(entity)
                }
              />
            </LayoutComposer.Entry>
          </div>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("nav.label")
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "typesense",
  icon: MagnifyingGlass,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default TypesenseOverviewPage

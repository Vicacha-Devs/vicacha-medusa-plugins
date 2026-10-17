import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import {
  ArrowPath,
  BuildingStorefront,
  CheckCircle,
  DocumentText,
  Tag,
} from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  NavigationCard,
  OdooHeader,
  OverviewTab,
  StatCard,
} from "../../components"
import { useOdooDashboard } from "../../hooks/use-odoo-dashboard"

const OdooAdminPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const {
    statusQuery,
    connectionForm,
    triggerSyncMutation,
    handleSync,
  } = useOdooDashboard()

  const overview = statusQuery.data
  const isLoading = statusQuery.isPending

  return (
    <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <OdooHeader
        overview={overview}
        protocolFallback={connectionForm.protocol}
        isSyncing={triggerSyncMutation.isPending}
        onRefresh={() => void statusQuery.refetch()}
        onSyncAll={() => void handleSync("all")}
      />

      <LayoutComposer
        widgetsZonePrefix="odoo.overview"
        preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
        sections={{
          main: (
            <>
              <LayoutComposer.Entry id="OdooOverviewStats">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title={t("tabs.connection")}
                    value={
                      overview
                        ? `${overview.status.toUpperCase()} (${overview.protocol})`
                        : connectionForm.protocol.toUpperCase()
                    }
                    icon={<BuildingStorefront />}
                    loading={isLoading}
                    onClick={() => navigate("/odoo/connection")}
                  />

                  <StatCard
                    title={t("overviewTab.mappingsLabel")}
                    value={overview?.totalMappings ?? 0}
                    icon={<Tag />}
                    loading={isLoading}
                    onClick={() => navigate("/odoo/settings")}
                  />

                  <StatCard
                    title={t("overviewTab.failuresLabel")}
                    value={overview?.openFailures ?? 0}
                    icon={<DocumentText />}
                    loading={isLoading}
                    onClick={() => navigate("/odoo/logs")}
                  />

                  <StatCard
                    title={`${t("overviewTab.conflictsLabel")} / ${t("overviewTab.posQueueLabel")}`}
                    value={`${overview?.openConflicts ?? 0} / ${overview?.pendingPosTransactions ?? 0}`}
                    icon={<CheckCircle />}
                    loading={isLoading}
                    onClick={() => navigate("/odoo/barcode")}
                  />
                </div>
              </LayoutComposer.Entry>

              <LayoutComposer.Entry id="OdooOverviewNavigation">
                <Container className="p-0 overflow-hidden">
                  <div className="border-b border-ui-border-base px-6 py-5">
                    <Heading level="h2">{t("tabs.overview")}</Heading>
                    <Text className="text-ui-fg-subtle mt-1">
                      {t("header.subtitle")}
                    </Text>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <NavigationCard
                      icon={<BuildingStorefront />}
                      title={t("tabs.connection")}
                      description={t("connectionTab.protocolLabel")}
                      onClick={() => navigate("/odoo/connection")}
                      position="top-left"
                    />

                    <NavigationCard
                      icon={<Tag />}
                      title={t("tabs.settings")}
                      description={`${t("settingsTab.productTitle")} • ${t("settingsTab.inventoryTitle")} • ${t("settingsTab.ordersTitle")}`}
                      onClick={() => navigate("/odoo/settings")}
                      position="top-right"
                    />

                    <NavigationCard
                      icon={<DocumentText />}
                      title={t("tabs.logs")}
                      description={t("logsTab.recentRunsTitle", {
                        logsCount: overview?.openFailures ?? 0,
                        mappingsCount: overview?.totalMappings ?? 0,
                      })}
                      onClick={() => navigate("/odoo/logs")}
                      position="bottom-left"
                    />

                    <NavigationCard
                      icon={<CheckCircle />}
                      title={t("tabs.barcode")}
                      description={t("barcodeTab.title")}
                      onClick={() => navigate("/odoo/barcode")}
                      position="bottom-right"
                    />
                  </div>
                </Container>
              </LayoutComposer.Entry>

              <LayoutComposer.Entry id="OdooOverviewManualSync">
                <OverviewTab
                  overview={overview}
                  isSyncing={triggerSyncMutation.isPending}
                  onSync={(entity, direction) =>
                    void handleSync(entity, direction)
                  }
                />
              </LayoutComposer.Entry>
            </>
          ),
        }}
      />
    </div>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("nav.label")
}

export const config = defineRouteConfig({
  label: "nav.label",
  icon: ArrowPath,
  translationNs: "odoo",
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default OdooAdminPage

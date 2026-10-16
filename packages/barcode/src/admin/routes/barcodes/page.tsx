import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import {
  Buildings,
  BuildingStorefront,
  CheckCircle,
  DocumentText,
  MagnifyingGlass,
  Tag,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Toaster,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { NavigationCard, StatCard } from "../../components"
import { useBarcodeStudio } from "../../hooks/use-barcode-studio"

const BarcodesOverviewPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const studio = useBarcodeStudio()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")
  const providers = Array.isArray(studio.overview.active_providers)
    ? (studio.overview.active_providers as string[])
    : []

  return (
    <LayoutComposer
      widgetsZonePrefix="barcodes.overview"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="BarcodesOverviewMain">
            <div
              className="flex flex-col gap-y-4"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Heading className="font-sans font-medium h1-core">
                      {t("header.title")}
                    </Heading>
                    <StatusBadge color="green">
                      {t("header.providersBadge")}
                    </StatusBadge>
                    {studio.lastScanned ? (
                      <Badge color="blue">
                        {t("header.lastHidScan", {
                          code: studio.lastScanned,
                        })}
                      </Badge>
                    ) : null}
                  </div>
                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => void studio.handleBulkGenerateBarcodes()}
                  >
                    {t("header.bulkGenerateButton")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={studio.onRefresh}
                  >
                    {t("header.refreshButton")}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  title={t("header.linkedProductsStat")}
                  value={Number(studio.overview.total_barcode_products ?? 0)}
                  icon={<MagnifyingGlass />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/barcodes/lookup")}
                />

                <StatCard
                  title={t("header.dynamicTagsStat")}
                  value={Number(studio.overview.total_barcode_tags ?? 0)}
                  icon={<Tag />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/barcodes/tags")}
                />

                <StatCard
                  title={t("header.totalScansStat")}
                  value={Number(studio.overview.total_tag_scans ?? 0)}
                  icon={<CheckCircle />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/barcodes/tags")}
                />

                <StatCard
                  title={t("header.cachedLookupsStat")}
                  value={`${String(studio.overview.total_cached_lookups ?? 0)} (${String(studio.overview.total_cache_hits ?? 0)})`}
                  icon={<DocumentText />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/barcodes/providers")}
                />

                <StatCard
                  title={t("header.activeProvidersStat")}
                  value={providers.length}
                  icon={<BuildingStorefront />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/barcodes/providers")}
                />
              </div>

              <Container className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-ui-border-base">
                  <Heading level="h2">{t("nav.label")}</Heading>
                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <NavigationCard
                    icon={<MagnifyingGlass />}
                    title={t("tabs.lookup", {
                      count: studio.barcodes.length,
                    })}
                    description={t("lookupTab.lookupSubtitle")}
                    onClick={() => navigate("/barcodes/lookup")}
                    position="top-left"
                  />

                  <NavigationCard
                    icon={<Tag />}
                    title={t("tabs.tags", { count: studio.tags.length })}
                    description={t("tagsTab.createTitle")}
                    onClick={() => navigate("/barcodes/tags")}
                    position="top-right"
                  />

                  <NavigationCard
                    icon={<DocumentText />}
                    title={t("tabs.print")}
                    description={t("printTab.designerTitle")}
                    onClick={() => navigate("/barcodes/print")}
                    position="middle-left"
                  />

                  <NavigationCard
                    icon={<Buildings />}
                    title={t("tabs.stockTake", {
                      count: studio.sessions.length,
                    })}
                    description={t("stockTakeTab.createTitle")}
                    onClick={() => navigate("/barcodes/stock-take")}
                    position="middle-right"
                  />

                  <NavigationCard
                    icon={<CheckCircle />}
                    title={t("tabs.providers", {
                      count: studio.cacheEntries.length,
                    })}
                    description={t("providersTab.providersTitle")}
                    onClick={() => navigate("/barcodes/providers")}
                    position="bottom-left"
                  />
                </div>
              </Container>
            </div>
          </LayoutComposer.Entry>
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
  translationNs: "barcodes",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default BarcodesOverviewPage

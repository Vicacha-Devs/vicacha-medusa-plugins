import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import {
  ArrowPath,
  BuildingStorefront,
  CheckCircle,
  DocumentText,
  Tag,
  Users,
} from "@medusajs/icons"
import { Button, Container, Heading, Text, Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { NavigationCard, StatCard } from "../../components/overview-cards"
import { useStoriesStudio } from "../../hooks/use-stories-studio"

const StoriesOverviewPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const studio = useStoriesStudio()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")
  const totalImpressions = studio.analytics?.total_impressions ?? 0
  const conversionRate = studio.analytics?.overall_conversion_rate_pct ?? 0

  return (
    <LayoutComposer
      widgetsZonePrefix="stories.overview"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="StoriesOverviewContent">
            <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
              <Toaster />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Heading className="font-sans font-medium h1-core">
                    {t("header.title")}
                  </Heading>
                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>

                <Button
                  variant="secondary"
                  size="small"
                  onClick={studio.onRefresh}
                >
                  <ArrowPath />
                  {t("header.refresh")}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  title={t("analyticsTab.colHighlightRing")}
                  value={studio.groups.length}
                  icon={<BuildingStorefront />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/stories/rings")}
                />

                <StatCard
                  title={t("analyticsTab.colSlides")}
                  value={studio.slides.length}
                  icon={<DocumentText />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/stories/canvas")}
                />

                <StatCard
                  title={t("analyticsTab.colImpressions")}
                  value={totalImpressions}
                  icon={<Users />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/stories/analytics")}
                />

                <StatCard
                  title={t("analyticsTab.colAddToCartRate")}
                  value={`${conversionRate}%`}
                  icon={<CheckCircle />}
                  loading={studio.isLoading}
                  onClick={() => navigate("/stories/analytics")}
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
                    icon={<DocumentText />}
                    title={t("canvasTab.canvasTitle")}
                    description={t("canvasTab.emptyCanvasPrompt")}
                    onClick={() => navigate("/stories/canvas")}
                    position="top-left"
                  />

                  <NavigationCard
                    icon={<BuildingStorefront />}
                    title={t("ringsTab.previewTitle")}
                    description={t("ringsTab.createTitle")}
                    onClick={() => navigate("/stories/rings")}
                    position="top-right"
                  />

                  <NavigationCard
                    icon={<Tag />}
                    title={t("tabs.stickers")}
                    description={t("stickersTab.activeTitle")}
                    onClick={() => navigate("/stories/stickers")}
                    position="bottom-left"
                  />

                  <NavigationCard
                    icon={<CheckCircle />}
                    title={t("tabs.analytics")}
                    description={t("analyticsTab.funnelSubtitle")}
                    onClick={() => navigate("/stories/analytics")}
                    position="bottom-right"
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
  translationNs: "stories",
  icon: BuildingStorefront,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default StoriesOverviewPage

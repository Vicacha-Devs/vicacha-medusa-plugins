import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import {
  Channels,
  Photo,
  PlaySolid,
  Sparkles,
  Tag,
  Users,
} from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  DashboardHeader,
  NavigationCard,
  StatCard,
} from "../../components/index.js"
import { useSocialDashboard } from "../../hooks/use-social-dashboard.js"

const SocialCommerceOverview = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const {
    platformFilter,
    setPlatformFilter,
    accounts,
    posts,
    storiesList,
    liveSessions,
    catalogItems,
    loading,
    handleTriggerSync,
  } = useSocialDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="social_commerce.overview"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="SocialCommerceOverviewSection">
            <div
              className="flex flex-col gap-y-4"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <DashboardHeader
                platformFilter={platformFilter}
                onPlatformFilterChange={setPlatformFilter}
                onSyncNow={() => void handleTriggerSync()}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title={t("tabs.accounts", { count: accounts.length })}
                  value={accounts.length}
                  icon={<Users />}
                  loading={loading}
                  onClick={() => navigate("/social-commerce/accounts")}
                />

                <StatCard
                  title={t("tabs.feed", { count: posts.length })}
                  value={posts.length}
                  icon={<Photo />}
                  loading={loading}
                  onClick={() => navigate("/social-commerce/feed")}
                />

                <StatCard
                  title={t("tabs.stories", { count: storiesList.length })}
                  value={storiesList.length}
                  icon={<Sparkles />}
                  loading={loading}
                  onClick={() => navigate("/social-commerce/stories")}
                />

                <StatCard
                  title={t("tabs.live", { count: liveSessions.length })}
                  value={liveSessions.length}
                  icon={<PlaySolid />}
                  loading={loading}
                  onClick={() => navigate("/social-commerce/live")}
                />
              </div>

              <Container className="p-0 overflow-hidden">
                <div className="border-b border-ui-border-base px-6 py-5">
                  <Heading level="h2">{t("header.title")}</Heading>
                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <NavigationCard
                    icon={<Users />}
                    title={t("tabs.accounts", { count: accounts.length })}
                    description={t("accountsTab.connectInstagram")}
                    onClick={() => navigate("/social-commerce/accounts")}
                    position="top-left"
                  />

                  <NavigationCard
                    icon={<Photo />}
                    title={t("tabs.feed", { count: posts.length })}
                    description={t("feedTab.taggedProducts", {
                      count: posts.length,
                    })}
                    onClick={() => navigate("/social-commerce/feed")}
                    position="top-right"
                  />

                  <NavigationCard
                    icon={<Sparkles />}
                    title={t("tabs.stories", { count: storiesList.length })}
                    description={t("storiesTab.publishButton")}
                    onClick={() => navigate("/social-commerce/stories")}
                    position="middle-left"
                  />

                  <NavigationCard
                    icon={<PlaySolid />}
                    title={t("tabs.live", { count: liveSessions.length })}
                    description={t("liveTab.scheduleButton")}
                    onClick={() => navigate("/social-commerce/live")}
                    position="middle-right"
                  />

                  <NavigationCard
                    icon={<Tag />}
                    title={t("tabs.catalog", { count: catalogItems.length })}
                    description={t("catalogTab.publicFeedsLabel")}
                    onClick={() => navigate("/social-commerce/catalog")}
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
  translationNs: "social-commerce",
  icon: Channels,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default SocialCommerceOverview


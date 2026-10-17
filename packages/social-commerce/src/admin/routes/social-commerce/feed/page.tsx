import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Photo } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { FeedTab } from "../../../components/index.js"
import { useSocialDashboard } from "../../../hooks/use-social-dashboard.js"

const SocialFeedPage = () => {
  const { posts } = useSocialDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="social_commerce.feed.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="SocialFeedListSection">
            <Toaster />
            <FeedTab posts={posts} />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.feed", { count: 0 })
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "social-commerce",
  icon: Photo,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default SocialFeedPage

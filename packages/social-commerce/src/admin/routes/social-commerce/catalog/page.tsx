import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Tag } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { CatalogTab } from "../../../components/index.js"
import { useSocialDashboard } from "../../../hooks/use-social-dashboard.js"

const SocialCatalogPage = () => {
  const { catalogItems } = useSocialDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="social_commerce.catalog.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="SocialCatalogListTable">
            <Toaster />
            <CatalogTab catalogItems={catalogItems} />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.catalog", { count: 0 })
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "social-commerce",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default SocialCatalogPage

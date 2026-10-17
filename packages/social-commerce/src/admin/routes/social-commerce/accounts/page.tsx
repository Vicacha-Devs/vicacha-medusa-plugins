import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Users } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { AccountsTab } from "../../../components/index.js"
import { useSocialDashboard } from "../../../hooks/use-social-dashboard.js"

const SocialAccountsPage = () => {
  const { accounts, handleConnectPlatform } = useSocialDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="social_commerce.accounts.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="SocialAccountsListTable">
            <Toaster />
            <AccountsTab
              accounts={accounts}
              onConnectPlatform={(platform) =>
                void handleConnectPlatform(platform)
              }
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.accounts", { count: 0 })
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "social-commerce",
  icon: Users,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default SocialAccountsPage

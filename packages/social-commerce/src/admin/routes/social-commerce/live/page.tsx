import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { PlaySolid } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { LiveTab } from "../../../components/index.js"
import { useSocialDashboard } from "../../../hooks/use-social-dashboard.js"

const SocialLivePage = () => {
  const navigate = useNavigate()
  const {
    liveSessions,
    liveForm,
    setLiveForm,
    handleCreateLiveSession,
    handleLiveTransition,
  } = useSocialDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="social_commerce.live.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="SocialLiveListTable">
            <Toaster />
            <LiveTab
              liveSessions={liveSessions}
              liveForm={liveForm}
              onLiveFormChange={setLiveForm}
              onCreateLiveSession={(e) => void handleCreateLiveSession(e)}
              onLiveTransition={(sessionId, action) =>
                void handleLiveTransition(sessionId, action)
              }
              onCreateClick={() => navigate("create")}
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.live", { count: 0 })
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "social-commerce",
  icon: PlaySolid,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default SocialLivePage

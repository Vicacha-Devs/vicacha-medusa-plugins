import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Sparkles } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { StoriesTab } from "../../../components/index.js"
import { useSocialDashboard } from "../../../hooks/use-social-dashboard.js"

const SocialStoriesPage = () => {
  const navigate = useNavigate()
  const { storiesList, storyForm, setStoryForm, handleCreateLocalStory } =
    useSocialDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="social_commerce.stories.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="SocialStoriesListTable">
            <Toaster />
            <StoriesTab
              stories={storiesList}
              storyForm={storyForm}
              onStoryFormChange={setStoryForm}
              onCreateStory={(e) => void handleCreateLocalStory(e)}
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
  return t("tabs.stories", { count: 0 })
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "social-commerce",
  icon: Sparkles,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default SocialStoriesPage

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { BuildingStorefront } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  StoryRingsInlineCreateSection,
  StoryRingsPreviewSection,
  StoryRingsTableSection,
} from "../../../components/story-rings-tab"
import { useStoriesStudio } from "../../../hooks/use-stories-studio"

const StoriesRingsPage = () => {
  const navigate = useNavigate()
  const studio = useStoriesStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="stories.rings"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <>
              <LayoutComposer.Entry id="StoryRingsPreviewSection">
                <StoryRingsPreviewSection
                  groups={studio.groups}
                  selectedGroupId={studio.selectedGroupId}
                  onSelectGroup={studio.setSelectedGroupId}
                  onOpenCreateDrawer={() => navigate("create")}
                />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="StoryRingsTableSection">
                <StoryRingsTableSection
                  groups={studio.groups}
                  selectedGroupId={studio.selectedGroupId}
                  onSelectGroup={studio.setSelectedGroupId}
                  onToggleGroupActive={(id, isActive) =>
                    void studio.handleToggleGroupActive(id, isActive)
                  }
                  onDeleteGroup={(id) => void studio.handleDeleteGroup(id)}
                />
              </LayoutComposer.Entry>
            </>
          ),
          side: (
            <LayoutComposer.Entry id="StoryRingsInlineCreateSection">
              <StoryRingsInlineCreateSection
                form={studio.groupForm}
                onFormChange={studio.setGroupForm}
                isSaving={studio.isSavingGroup}
                onCreateGroup={() => void studio.handleCreateGroup()}
              />
            </LayoutComposer.Entry>
          ),
        }}
      />
    </>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("ringsTab.previewTitle")
}

export const config = defineRouteConfig({
  label: "ringsTab.previewTitle",
  translationNs: "stories",
  icon: BuildingStorefront,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default StoriesRingsPage

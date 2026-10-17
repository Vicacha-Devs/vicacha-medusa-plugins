import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { DocumentText } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  CanvasHotspotPinnerSection,
  CanvasPreviewSection,
  CanvasSlideBuilderSection,
  CanvasTimelineSection,
} from "../../../components/canvas-editor-tab"
import { useStoriesStudio } from "../../../hooks/use-stories-studio"

const StoriesCanvasPage = () => {
  const studio = useStoriesStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="stories.canvas"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        data={studio.selectedSlide as any}
        sections={{
          main: (
            <>
              <LayoutComposer.Entry id="CanvasSlideBuilderSection">
                <CanvasSlideBuilderSection
                  groups={studio.groups}
                  slideForm={studio.slideForm}
                  onSlideFormChange={studio.setSlideForm}
                  isSavingSlide={studio.isSavingSlide}
                  onCreateSlide={() => void studio.handleCreateSlide()}
                />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="CanvasHotspotPinnerSection">
                <CanvasHotspotPinnerSection
                  selectedSlide={studio.selectedSlide}
                  hotspotForm={studio.hotspotForm}
                  onHotspotFormChange={studio.setHotspotForm}
                  isSavingHotspot={studio.isSavingHotspot}
                  onAddHotspot={() => void studio.handleAddHotspot()}
                  onRemoveHotspot={(hotspotId) =>
                    void studio.handleRemoveHotspot(hotspotId)
                  }
                />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="CanvasTimelineSection">
                <CanvasTimelineSection
                  slides={studio.slides}
                  selectedSlide={studio.selectedSlide}
                  onSelectSlide={studio.setSelectedSlideId}
                  onToggleSlideActive={(id, isActive) =>
                    void studio.handleToggleSlideActive(id, isActive)
                  }
                  onDeleteSlide={(id) => void studio.handleDeleteSlide(id)}
                />
              </LayoutComposer.Entry>
            </>
          ),
          side: (
            <LayoutComposer.Entry id="CanvasPreviewSection">
              <CanvasPreviewSection
                selectedSlide={studio.selectedSlide}
                slideForm={studio.slideForm}
                hotspotForm={studio.hotspotForm}
                onCanvasCoordinateClick={studio.handleCanvasCoordinateClick}
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
  return t("canvasTab.canvasTitle")
}

export const config = defineRouteConfig({
  label: "canvasTab.canvasTitle",
  translationNs: "stories",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default StoriesCanvasPage

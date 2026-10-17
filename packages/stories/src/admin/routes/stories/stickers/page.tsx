import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Tag } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  StickerActiveListSection,
  StickerBuilderSection,
} from "../../../components/stickers-tab"
import { useStoriesStudio } from "../../../hooks/use-stories-studio"

const StoriesStickersPage = () => {
  const studio = useStoriesStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="stories.stickers"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        data={studio.selectedSlide as any}
        sections={{
          main: (
            <LayoutComposer.Entry id="StickerBuilderSection">
              <StickerBuilderSection
                selectedSlide={studio.selectedSlide}
                stickerForm={studio.stickerForm}
                onStickerFormChange={studio.setStickerForm}
                isSaving={studio.isSavingSticker}
                onAddSticker={() => void studio.handleAddSticker()}
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="StickerActiveListSection">
              <StickerActiveListSection
                selectedSlide={studio.selectedSlide}
                onRemoveSticker={(stickerId) =>
                  void studio.handleRemoveSticker(stickerId)
                }
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
  return t("tabs.stickers")
}

export const config = defineRouteConfig({
  label: "tabs.stickers",
  translationNs: "stories",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default StoriesStickersPage

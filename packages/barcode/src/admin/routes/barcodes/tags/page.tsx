import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Tag } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  DynamicQrTagCreateSection,
  DynamicQrTagsTableSection,
} from "../../../components"
import { useBarcodeStudio } from "../../../hooks/use-barcode-studio"

const BarcodeTagsPage = () => {
  const navigate = useNavigate()
  const studio = useBarcodeStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="barcodes.tags.list"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="BarcodeTagsTableSection">
              <DynamicQrTagsTableSection
                tags={studio.tags}
                onDeleteTag={(id) => void studio.handleDeleteTag(id)}
                onOpenCreateDrawer={() => navigate("create")}
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="BarcodeTagCreateSection">
              <DynamicQrTagCreateSection
                form={studio.tagForm}
                onFormChange={studio.setTagForm}
                onCreateTag={() => void studio.handleCreateTag()}
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
  return t("tagsTab.createTitle")
}

export const config = defineRouteConfig({
  label: "tagsTab.createTitle",
  translationNs: "barcodes",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default BarcodeTagsPage

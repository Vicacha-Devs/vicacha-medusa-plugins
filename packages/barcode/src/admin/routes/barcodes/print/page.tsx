import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { DocumentText } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  LabelPrintDesignerSection,
  LabelPrintOutputSection,
} from "../../../components"
import { useBarcodeStudio } from "../../../hooks/use-barcode-studio"

const BarcodePrintCenterPage = () => {
  const studio = useBarcodeStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="barcodes.print.details"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="BarcodePrintDesignerSection">
              <LabelPrintDesignerSection
                form={studio.printForm}
                onFormChange={studio.setPrintForm}
                templates={studio.templates}
                onRenderLabels={() => void studio.handleRenderLabels()}
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="BarcodePrintOutputSection">
              <LabelPrintOutputSection output={studio.printOutput} />
            </LayoutComposer.Entry>
          ),
        }}
      />
    </>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.print")
}

export const config = defineRouteConfig({
  label: "tabs.print",
  translationNs: "barcodes",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default BarcodePrintCenterPage

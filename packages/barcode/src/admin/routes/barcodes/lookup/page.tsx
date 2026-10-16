import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { MagnifyingGlass } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  GtinLookupBatchSection,
  GtinLookupLookupSection,
} from "../../../components"
import { useBarcodeStudio } from "../../../hooks/use-barcode-studio"

const BarcodeLookupPage = () => {
  const studio = useBarcodeStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="barcodes.lookup.details"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="BarcodeLookupMainSection">
              <GtinLookupLookupSection
                form={studio.lookupForm}
                onFormChange={studio.setLookupForm}
                lookupResult={studio.lookupResult}
                onLookup={() => void studio.handleLookupBarcode()}
                onCreateProduct={() =>
                  void studio.handleCreateProductFromBarcode()
                }
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="BarcodeLookupBatchSection">
              <GtinLookupBatchSection
                form={studio.lookupForm}
                onFormChange={studio.setLookupForm}
                barcodes={studio.barcodes}
                onBatchImport={() => void studio.handleBatchImport()}
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
  return t("lookupTab.lookupTitle")
}

export const config = defineRouteConfig({
  label: "lookupTab.lookupTitle",
  translationNs: "barcodes",
  icon: MagnifyingGlass,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default BarcodeLookupPage

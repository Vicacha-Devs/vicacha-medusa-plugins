import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Buildings } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  StockTakeControlsSection,
  StockTakeSessionsSection,
} from "../../../components"
import { useBarcodeStudio } from "../../../hooks/use-barcode-studio"

const BarcodeStockTakePage = () => {
  const studio = useBarcodeStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="barcodes.stock_take.details"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="StockTakeControlsSection">
              <StockTakeControlsSection
                form={studio.countForm}
                onFormChange={studio.setCountForm}
                onCreateSession={() => void studio.handleCreateCountSession()}
                onScanDelta={(delta) =>
                  void studio.handleScanIntoSession(delta)
                }
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="StockTakeSessionsSection">
              <StockTakeSessionsSection
                sessions={studio.sessions}
                selectedSessionId={studio.selectedSessionId}
                onSelectSession={studio.setSelectedSessionId}
                onApplySession={(id) =>
                  void studio.handleApplyCountSession(id)
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
  return t("stockTakeTab.createTitle")
}

export const config = defineRouteConfig({
  label: "stockTakeTab.createTitle",
  translationNs: "barcodes",
  icon: Buildings,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default BarcodeStockTakePage

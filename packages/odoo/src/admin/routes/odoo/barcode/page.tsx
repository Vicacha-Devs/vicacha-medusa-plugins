import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  BarcodeLookupSection,
  PosTransactionsSection,
} from "../../../components"
import { useOdooDashboard } from "../../../hooks/use-odoo-dashboard"

const OdooBarcodePage = () => {
  const { i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const {
    barcodeInput,
    setBarcodeInput,
    barcodeContext,
    setBarcodeContext,
    barcodeMutation,
    posQuery,
  } = useOdooDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="odoo.barcode"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      dir={isRtl ? "rtl" : "ltr"}
      sections={{
        main: (
          <LayoutComposer.Entry id="OdooBarcodeLookupSection">
            <BarcodeLookupSection
              barcodeInput={barcodeInput}
              onBarcodeInputChange={setBarcodeInput}
              barcodeContext={barcodeContext}
              onToggleContext={() =>
                setBarcodeContext(
                  barcodeContext === "pos" ? "warehouse" : "pos"
                )
              }
              onContextChange={setBarcodeContext}
              isResolving={barcodeMutation.isPending}
              onResolve={() =>
                void barcodeMutation.mutateAsync({
                  barcode: barcodeInput,
                  context: barcodeContext,
                })
              }
              barcodeResult={barcodeMutation.data}
            />
          </LayoutComposer.Entry>
        ),
        side: (
          <LayoutComposer.Entry id="OdooPosTransactionsSection">
            <PosTransactionsSection
              posTransactions={posQuery.data?.transactions ?? []}
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.barcode")
}

export const config = defineRouteConfig({
  label: "tabs.barcode",
  translationNs: "odoo",
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default OdooBarcodePage

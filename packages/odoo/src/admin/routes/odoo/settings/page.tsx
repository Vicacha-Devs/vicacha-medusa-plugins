import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  InventorySyncSettingsSection,
  OrderSyncSettingsSection,
  ProductSyncSettingsSection,
  ReconciliationSettingsSection,
} from "../../../components"
import { useOdooDashboard } from "../../../hooks/use-odoo-dashboard"

const OdooSettingsPage = () => {
  const { i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const {
    optionsQuery,
    productSettingsQuery,
    inventorySettingsQuery,
    orderSettingsQuery,
    reconciliationSettingsQuery,
    saveProductMutation,
    saveInventoryMutation,
    saveOrderMutation,
    saveReconciliationMutation,
  } = useOdooDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="odoo.settings"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      dir={isRtl ? "rtl" : "ltr"}
      sections={{
        main: (
          <>
            <LayoutComposer.Entry id="OdooProductSyncSettings">
              <ProductSyncSettingsSection
                productSettings={productSettingsQuery.data?.settings}
                onSaveProductSettings={(patch) =>
                  saveProductMutation.mutateAsync(patch)
                }
              />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="OdooOrderSyncSettings">
              <OrderSyncSettingsSection
                orderSettings={orderSettingsQuery.data?.settings}
                onSaveOrderSettings={(patch) =>
                  saveOrderMutation.mutateAsync(patch)
                }
              />
            </LayoutComposer.Entry>
          </>
        ),
        side: (
          <>
            <LayoutComposer.Entry id="OdooInventorySyncSettings">
              <InventorySyncSettingsSection
                inventorySettings={inventorySettingsQuery.data?.settings}
                odooWarehousesCount={
                  optionsQuery.data?.odoo?.warehouses?.length ?? 0
                }
                medusaLocationsCount={
                  optionsQuery.data?.medusa?.stockLocations?.length ?? 0
                }
                onSaveInventorySettings={(patch) =>
                  saveInventoryMutation.mutateAsync(patch)
                }
              />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="OdooReconciliationSettings">
              <ReconciliationSettingsSection
                reconciliationSettings={
                  reconciliationSettingsQuery.data?.settings
                }
                onSaveReconciliationSettings={(patch) =>
                  saveReconciliationMutation.mutateAsync(patch)
                }
              />
            </LayoutComposer.Entry>
          </>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.settings")
}

export const config = defineRouteConfig({
  label: "tabs.settings",
  translationNs: "odoo",
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default OdooSettingsPage

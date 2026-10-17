import type {
  OdooInventorySyncSettings,
  OdooOrderSyncSettings,
  OdooProductSyncSettings,
  OdooReconciliationSettings,
} from "../../modules/odoo/types"
import { InventorySyncSettingsSection } from "./inventory-settings-section"
import { OrderSyncSettingsSection } from "./order-settings-section"
import { ProductSyncSettingsSection } from "./product-settings-section"
import { ReconciliationSettingsSection } from "./reconciliation-settings-section"

export interface SettingsTabProps {
  productSettings?: OdooProductSyncSettings
  inventorySettings?: OdooInventorySyncSettings
  orderSettings?: OdooOrderSyncSettings
  reconciliationSettings?: OdooReconciliationSettings
  odooWarehousesCount: number
  medusaLocationsCount: number
  onSaveProductSettings: (
    patch: Partial<OdooProductSyncSettings>
  ) => Promise<unknown>
  onSaveInventorySettings: (
    patch: Partial<OdooInventorySyncSettings>
  ) => Promise<unknown>
  onSaveOrderSettings: (
    patch: Partial<OdooOrderSyncSettings>
  ) => Promise<unknown>
  onSaveReconciliationSettings: (
    patch: Partial<OdooReconciliationSettings>
  ) => Promise<unknown>
}

export const SettingsTab = ({
  productSettings,
  inventorySettings,
  orderSettings,
  reconciliationSettings,
  odooWarehousesCount,
  medusaLocationsCount,
  onSaveProductSettings,
  onSaveInventorySettings,
  onSaveOrderSettings,
  onSaveReconciliationSettings,
}: SettingsTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ProductSyncSettingsSection
        productSettings={productSettings}
        onSaveProductSettings={onSaveProductSettings}
      />
      <InventorySyncSettingsSection
        inventorySettings={inventorySettings}
        odooWarehousesCount={odooWarehousesCount}
        medusaLocationsCount={medusaLocationsCount}
        onSaveInventorySettings={onSaveInventorySettings}
      />
      <OrderSyncSettingsSection
        orderSettings={orderSettings}
        onSaveOrderSettings={onSaveOrderSettings}
      />
      <ReconciliationSettingsSection
        reconciliationSettings={reconciliationSettings}
        onSaveReconciliationSettings={onSaveReconciliationSettings}
      />
    </div>
  )
}

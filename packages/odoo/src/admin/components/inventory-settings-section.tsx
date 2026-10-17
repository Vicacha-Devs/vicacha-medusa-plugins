import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Container,
  Heading,
  StatusBadge,
  Switch,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { OdooInventorySyncSettings } from "../../modules/odoo/types"

export interface InventorySyncSettingsSectionProps {
  inventorySettings?: OdooInventorySyncSettings
  odooWarehousesCount: number
  medusaLocationsCount: number
  onSaveInventorySettings: (
    patch: Partial<OdooInventorySyncSettings>
  ) => Promise<unknown>
}

export const InventorySyncSettingsSection = ({
  inventorySettings,
  odooWarehousesCount,
  medusaLocationsCount,
  onSaveInventorySettings,
}: InventorySyncSettingsSectionProps) => {
  const { t } = useTranslation()

  const handlePatch = async (patch: Partial<OdooInventorySyncSettings>) => {
    try {
      await onSaveInventorySettings(patch)
      toast.success(t("settingsTab.inventoryTitle"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.syncError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("settingsTab.inventoryTitle")}</Heading>
        <StatusBadge
          color={inventorySettings?.enableStock !== false ? "green" : "grey"}
        >
          {inventorySettings?.enableStock !== false ? "ON" : "OFF"}
        </StatusBadge>
      </div>
      <SectionRow
        title={t("settingsTab.enableStockSync")}
        value={
          <Switch
            checked={inventorySettings?.enableStock !== false}
            onCheckedChange={(checked) =>
              void handlePatch({ enableStock: checked })
            }
          />
        }
      />
      <SectionRow
        title={t("settingsTab.useForecastedQty")}
        value={
          <Switch
            checked={inventorySettings?.qtyType === "forecasted"}
            onCheckedChange={(checked) =>
              void handlePatch({
                qtyType: checked ? "forecasted" : "on_hand",
              })
            }
          />
        }
      />
      <SectionRow
        title={t("settingsTab.inventoryTitle")}
        value={
          <Badge size="2xsmall" color="blue">
            {t("settingsTab.warehousesSummary", {
              odooCount: odooWarehousesCount,
              medusaCount: medusaLocationsCount,
            })}
          </Badge>
        }
      />
    </Container>
  )
}

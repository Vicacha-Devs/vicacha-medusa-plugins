import { SectionRow } from "@medusajs/dashboard/components"
import { Container, Heading, StatusBadge, Switch, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { OdooOrderSyncSettings } from "../../modules/odoo/types"

export interface OrderSyncSettingsSectionProps {
  orderSettings?: OdooOrderSyncSettings
  onSaveOrderSettings: (
    patch: Partial<OdooOrderSyncSettings>
  ) => Promise<unknown>
}

export const OrderSyncSettingsSection = ({
  orderSettings,
  onSaveOrderSettings,
}: OrderSyncSettingsSectionProps) => {
  const { t } = useTranslation()

  const handlePatch = async (patch: Partial<OdooOrderSyncSettings>) => {
    try {
      await onSaveOrderSettings(patch)
      toast.success(t("settingsTab.ordersTitle"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.syncError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("settingsTab.ordersTitle")}</Heading>
        <StatusBadge
          color={orderSettings?.orderSync !== false ? "green" : "grey"}
        >
          {orderSettings?.orderSync !== false ? "ON" : "OFF"}
        </StatusBadge>
      </div>
      <SectionRow
        title={t("settingsTab.autoSyncOrders")}
        value={
          <Switch
            checked={orderSettings?.orderSync !== false}
            onCheckedChange={(checked) =>
              void handlePatch({ orderSync: checked })
            }
          />
        }
      />
      <SectionRow
        title={t("settingsTab.exportInvoice")}
        value={
          <Switch
            checked={Boolean(orderSettings?.exportInvoice)}
            onCheckedChange={(checked) =>
              void handlePatch({ exportInvoice: checked })
            }
          />
        }
      />
      <SectionRow
        title={t("settingsTab.registerPayment")}
        value={
          <Switch
            checked={Boolean(orderSettings?.createPayment)}
            onCheckedChange={(checked) =>
              void handlePatch({
                createPayment: checked,
                markInvoicePaid: checked,
              })
            }
          />
        }
      />
    </Container>
  )
}

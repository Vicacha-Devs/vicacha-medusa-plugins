import { SectionRow } from "@medusajs/dashboard/components"
import { Container, Heading, StatusBadge, Switch, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { OdooProductSyncSettings } from "../../modules/odoo/types"

export interface ProductSyncSettingsSectionProps {
  productSettings?: OdooProductSyncSettings
  onSaveProductSettings: (
    patch: Partial<OdooProductSyncSettings>
  ) => Promise<unknown>
}

export const ProductSyncSettingsSection = ({
  productSettings,
  onSaveProductSettings,
}: ProductSyncSettingsSectionProps) => {
  const { t } = useTranslation()

  const handlePatch = async (patch: Partial<OdooProductSyncSettings>) => {
    try {
      await onSaveProductSettings(patch)
      toast.success(t("settingsTab.productTitle"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.syncError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("settingsTab.productTitle")}</Heading>
        <StatusBadge
          color={productSettings?.enableProductSync !== false ? "green" : "grey"}
        >
          {productSettings?.enableProductSync !== false ? "ON" : "OFF"}
        </StatusBadge>
      </div>
      <SectionRow
        title={t("settingsTab.enableProductSync")}
        value={
          <Switch
            checked={productSettings?.enableProductSync !== false}
            onCheckedChange={(checked) =>
              void handlePatch({ enableProductSync: checked })
            }
          />
        }
      />
      <SectionRow
        title={t("settingsTab.autoPublish")}
        value={
          <Switch
            checked={Boolean(productSettings?.autoPublish)}
            onCheckedChange={(checked) =>
              void handlePatch({
                autoPublish: checked,
                createDraft: !checked,
              })
            }
          />
        }
      />
      <SectionRow
        title={t("settingsTab.syncImages")}
        value={
          <Switch
            checked={Boolean(productSettings?.syncImages)}
            onCheckedChange={(checked) =>
              void handlePatch({ syncImages: checked })
            }
          />
        }
      />
    </Container>
  )
}

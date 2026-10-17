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
import type { OdooReconciliationSettings } from "../../modules/odoo/types"

export interface ReconciliationSettingsSectionProps {
  reconciliationSettings?: OdooReconciliationSettings
  onSaveReconciliationSettings: (
    patch: Partial<OdooReconciliationSettings>
  ) => Promise<unknown>
}

export const ReconciliationSettingsSection = ({
  reconciliationSettings,
  onSaveReconciliationSettings,
}: ReconciliationSettingsSectionProps) => {
  const { t } = useTranslation()

  const handlePatch = async (patch: Partial<OdooReconciliationSettings>) => {
    try {
      await onSaveReconciliationSettings(patch)
      toast.success(t("settingsTab.reconciliationTitle"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.syncError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("settingsTab.reconciliationTitle")}</Heading>
        <StatusBadge
          color={
            reconciliationSettings?.enableScheduledReconciliation !== false
              ? "green"
              : "grey"
          }
        >
          {reconciliationSettings?.enableScheduledReconciliation !== false
            ? "ON"
            : "OFF"}
        </StatusBadge>
      </div>
      <SectionRow
        title={t("settingsTab.enableScheduledReconciliation")}
        value={
          <Switch
            checked={
              reconciliationSettings?.enableScheduledReconciliation !== false
            }
            onCheckedChange={(checked) =>
              void handlePatch({
                enableScheduledReconciliation: checked,
              })
            }
          />
        }
      />
      <SectionRow
        title={t("settingsTab.reconciliationTitle")}
        value={
          <Badge size="2xsmall" color="grey">
            {t("settingsTab.activeStrategy", {
              strategy: reconciliationSettings?.strategy ?? "odoo_wins",
            })}
          </Badge>
        }
      />
    </Container>
  )
}

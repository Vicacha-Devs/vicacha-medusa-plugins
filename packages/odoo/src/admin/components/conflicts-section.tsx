import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface DriftConflictsSectionProps {
  conflicts: Array<Record<string, unknown>>
  onResolveConflict: (
    id: string,
    resolution: "odoo_wins" | "medusa_wins"
  ) => Promise<unknown>
}

export const DriftConflictsSection = ({
  conflicts,
  onResolveConflict,
}: DriftConflictsSectionProps) => {
  const { t } = useTranslation()

  const handleResolve = async (
    id: string,
    resolution: "odoo_wins" | "medusa_wins"
  ) => {
    try {
      await onResolveConflict(id, resolution)
      toast.success(
        resolution === "odoo_wins"
          ? t("logsTab.odooWins")
          : t("logsTab.medusaWins")
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.syncError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("logsTab.conflictsTitle", { count: conflicts.length })}
        </Heading>
        <StatusBadge color={conflicts.length > 0 ? "orange" : "green"}>
          {conflicts.length}
        </StatusBadge>
      </div>
      {conflicts.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("logsTab.noConflicts")}
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("overviewTab.conflictsLabel")}</Table.HeaderCell>
              <Table.HeaderCell>{t("overviewTab.mappingsLabel")}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                {t("settingsTab.reconciliationTitle")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {conflicts.map((c) => (
              <Table.Row key={String(c.id)}>
                <Table.Cell>
                  <Text size="small" weight="plus">
                    {t("logsTab.conflictHeader", {
                      medusaId: String(c.medusa_id),
                      odooId: String(c.odoo_id),
                    })}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {t("logsTab.conflictValues", {
                      medusaValue: JSON.stringify(c.medusa_value),
                      odooValue: JSON.stringify(c.odoo_value),
                    })}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-x-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() =>
                        void handleResolve(String(c.id), "odoo_wins")
                      }
                    >
                      {t("logsTab.odooWins")}
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() =>
                        void handleResolve(String(c.id), "medusa_wins")
                      }
                    >
                      {t("logsTab.medusaWins")}
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface SyncFailuresSectionProps {
  failures: Array<Record<string, unknown>>
  onResolveFailure: (id: string) => Promise<unknown>
}

export const SyncFailuresSection = ({
  failures,
  onResolveFailure,
}: SyncFailuresSectionProps) => {
  const { t } = useTranslation()

  const handleResolve = async (id: string) => {
    try {
      await onResolveFailure(id)
      toast.success(t("logsTab.markResolved"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("messages.syncError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("logsTab.failuresTitle", { count: failures.length })}
        </Heading>
        <StatusBadge color={failures.length > 0 ? "red" : "green"}>
          {failures.length}
        </StatusBadge>
      </div>
      {failures.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("logsTab.noFailures")}
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("overviewTab.failuresLabel")}</Table.HeaderCell>
              <Table.HeaderCell>{t("overviewTab.mappingsLabel")}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                {t("logsTab.markResolved")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {failures.map((f) => (
              <Table.Row key={String(f.id)}>
                <Table.Cell>
                  <div className="flex items-center gap-x-2">
                    <Badge size="2xsmall" color="red">
                      {String(f.entity_type)}
                    </Badge>
                    <Text size="small" weight="plus">
                      {String(f.error_message)}
                    </Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {t("logsTab.failureIds", {
                      medusaId: String(
                        f.medusa_id ?? t("logsTab.notAvailable")
                      ),
                      odooId: String(f.odoo_id ?? t("logsTab.notAvailable")),
                    })}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => void handleResolve(String(f.id))}
                  >
                    {t("logsTab.markResolved")}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

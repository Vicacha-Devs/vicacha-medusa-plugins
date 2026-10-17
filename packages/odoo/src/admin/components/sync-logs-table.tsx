import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface RecentSyncRunsSectionProps {
  logs: Array<Record<string, unknown>>
  mappingsCount: number
}

export const RecentSyncRunsSection = ({
  logs,
  mappingsCount,
}: RecentSyncRunsSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("logsTab.recentRunsTitle", {
            logsCount: logs.length,
            mappingsCount,
          })}
        </Heading>
        <Badge size="2xsmall" color="grey">
          {mappingsCount}
        </Badge>
      </div>
      <SectionRow
        title={t("overviewTab.mappingsLabel")}
        value={
          <Badge size="2xsmall" color="blue">
            {mappingsCount}
          </Badge>
        }
      />
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("tabs.logs")}</Table.HeaderCell>
            <Table.HeaderCell>{t("overviewTab.manualSyncTitle")}</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {logs.slice(0, 15).map((log) => (
            <Table.Row key={String(log.id)}>
              <Table.Cell>
                <div className="flex items-center gap-x-2">
                  <Badge size="2xsmall" color="grey">
                    {String(log.entity_type)} / {String(log.direction)}
                  </Badge>
                  <Text size="small" weight="plus">
                    {String(log.message ?? "")}
                  </Text>
                </div>
              </Table.Cell>
              <Table.Cell>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("logsTab.durationLabel", {
                    durationMs: String(log.duration_ms ?? 0),
                  })}
                </Text>
              </Table.Cell>
              <Table.Cell className="text-right">
                <StatusBadge
                  color={
                    log.status === "success"
                      ? "green"
                      : log.status === "failed"
                        ? "red"
                        : "grey"
                  }
                >
                  {String(log.status)}
                </StatusBadge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

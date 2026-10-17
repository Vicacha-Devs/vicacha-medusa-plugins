import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Container,
  Heading,
  StatusBadge,
  Table,
  Toaster,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

interface DeliveryLogsTabProps {
  logs: Array<Record<string, any>>
}

export const DeliveryLogsTab: React.FC<DeliveryLogsTabProps> = ({ logs }) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("logs.title")}</Heading>
        <StatusBadge color="green">{logs.length}</StatusBadge>
      </div>

      <SectionRow title={t("logs.colStatus")} value={logs.length} />

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("logs.colEvent")}</Table.HeaderCell>
            <Table.HeaderCell>{t("logs.colChannel")}</Table.HeaderCell>
            <Table.HeaderCell>{t("logs.colRecipient")}</Table.HeaderCell>
            <Table.HeaderCell>{t("logs.colStatus")}</Table.HeaderCell>
            <Table.HeaderCell>{t("logs.colExternalId")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {logs.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>{row.event_name}</Table.Cell>
              <Table.Cell>
                <Badge size="2xsmall" color="blue">
                  {row.channel}
                </Badge>
              </Table.Cell>
              <Table.Cell>{row.recipient_masked}</Table.Cell>
              <Table.Cell>
                <StatusBadge
                  color={
                    row.status === "sent" || row.status === "delivered"
                      ? "green"
                      : row.status === "failed"
                        ? "red"
                        : "orange"
                  }
                >
                  {row.status}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{row.external_message_id || "—"}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

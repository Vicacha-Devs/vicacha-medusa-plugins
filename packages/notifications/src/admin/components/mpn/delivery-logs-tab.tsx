import { Badge, Container, Heading, Table } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

interface DeliveryLogsTabProps {
  logs: Array<Record<string, any>>
}

export const DeliveryLogsTab: React.FC<DeliveryLogsTabProps> = ({ logs }) => {
  const { t } = useTranslation()

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">
        {t("logs.title")}
      </Heading>
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
                <Badge color="blue">{row.channel}</Badge>
              </Table.Cell>
              <Table.Cell>{row.recipient_masked}</Table.Cell>
              <Table.Cell>
                <Badge
                  color={
                    row.status === "sent" || row.status === "delivered"
                      ? "green"
                      : row.status === "failed"
                        ? "red"
                        : "orange"
                  }
                >
                  {row.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>{row.external_message_id || "—"}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Table, Button } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useBoldTerminals } from "../../hooks"


const BoldTerminalStatusWidget = () => {
  const { t } = useTranslation()
  const { data: terminals = [], isLoading, isRefetching, refetch } = useBoldTerminals()

  return (
    <Container className="p-4 rounded-lg border bg-card space-y-3 mb-4">
      <div className="flex items-center justify-between border-b pb-3">
        <Heading level="h2" className="text-base font-semibold">
          {t("bold.admin.terminal_status.title")}
        </Heading>
        <Button
          size="small"
          variant="secondary"
          isLoading={isLoading || isRefetching}
          onClick={() => refetch()}
        >
          {t("bold.admin.terminal_status.refresh")}
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("bold.admin.terminal_status.serial")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.terminal_status.model")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.terminal_status.status")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.terminal_status.battery")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.terminal_status.connectivity")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {terminals.map((item) => (
            <Table.Row key={item.terminal_serial}>
              <Table.Cell className="font-mono text-xs font-semibold">
                {item.terminal_serial}
              </Table.Cell>
              <Table.Cell>{item.terminal_model}</Table.Cell>
              <Table.Cell>
                <Badge
                  color={
                    item.status === "ONLINE"
                      ? "green"
                      : item.status === "BUSY"
                      ? "orange"
                      : "grey"
                  }
                >
                  {item.status || t("bold.admin.terminal_status.unknown")}
                </Badge>
              </Table.Cell>
              <Table.Cell>{item.battery || "N/A"}</Table.Cell>
              <Table.Cell className="text-xs text-ui-fg-subtle">
                {item.signal || "N/A"}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default BoldTerminalStatusWidget

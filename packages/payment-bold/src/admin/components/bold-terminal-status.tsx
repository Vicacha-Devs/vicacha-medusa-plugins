import { Container, Heading, Badge, Table, Button, Alert } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useBoldTerminals } from "../../hooks"
import { isUnauthorizedError } from "../../lib"

const BoldTerminalStatusWidget = () => {
  const { t } = useTranslation()
  const {
    data: terminals = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useBoldTerminals()

  const isUnauthorized = isUnauthorizedError(error)

  return (
    <Container className="p-4 rounded-lg border bg-card space-y-3 mb-4">
      <div className="flex items-center justify-between border-b pb-3">
        <Heading level="h2" className="text-base font-semibold">
          {t("bold.admin.terminal_status.title", {
            defaultValue: "Bold POS Terminal Status",
          })}
        </Heading>
        <Button
          size="small"
          variant="secondary"
          isLoading={isLoading || isRefetching}
          onClick={() => refetch()}
        >
          {t("bold.admin.terminal_status.refresh", {
            defaultValue: "Refresh Fleet",
          })}
        </Button>
      </div>

      {isUnauthorized && (
        <Alert variant="warning" className="p-3 text-xs">
          <div className="flex items-start justify-between w-full gap-x-3">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="font-semibold text-ui-fg-base block leading-tight">
                {t("bold.admin.settings.unauthorized_terminals_title", {
                  defaultValue: "POS Terminal Integration Authorization Required (403)",
                })}
              </span>
              <p className="text-ui-fg-subtle text-xs leading-normal">
                {t("bold.admin.settings.unauthorized_terminals_desc", {
                  defaultValue:
                    "Datáfono POS transactions must be explicitly authorized for API Integrations in your Bold merchant portal.",
                })}
              </p>
            </div>
            <a
              href="https://developers.bold.co/api-integrations/integration#4-habilitar-terminales-para-api-integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ui-fg-interactive hover:underline shrink-0 whitespace-nowrap pt-0.5"
            >
              {t("bold.admin.settings.enable_terminals_link", {
                defaultValue: "Authorize Terminals →",
              })}
            </a>
          </div>
        </Alert>
      )}

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>
              {t("bold.admin.terminal_status.serial", {
                defaultValue: "Serial Number",
              })}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("bold.admin.terminal_status.model", {
                defaultValue: "Hardware Model",
              })}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("bold.admin.terminal_status.status", {
                defaultValue: "Status",
              })}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("bold.admin.terminal_status.battery", {
                defaultValue: "Battery",
              })}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("bold.admin.terminal_status.connectivity", {
                defaultValue: "Connectivity",
              })}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {terminals.map((item: any) => (
            <Table.Row key={item.terminal_serial || item.id}>
              <Table.Cell className="font-mono text-xs font-semibold">
                {item.terminal_serial || item.id}
              </Table.Cell>
              <Table.Cell>{item.terminal_model || item.model || "Smart POS"}</Table.Cell>
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
                  {item.status ||
                    t("bold.admin.terminal_status.unknown", {
                      defaultValue: "OFFLINE",
                    })}
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

export default BoldTerminalStatusWidget

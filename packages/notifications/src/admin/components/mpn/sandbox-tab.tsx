import { Badge, Button, Container, Heading, Table, Text } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { useClearMpnSandbox } from "../../../hooks"

interface DummySandboxTabProps {
  sandboxMessages: Array<Record<string, any>>
  onRefresh: () => Promise<void>
}

export const DummySandboxTab: React.FC<DummySandboxTabProps> = ({
  sandboxMessages,
  onRefresh,
}) => {
  const { t } = useTranslation()
  const clearSandboxMutation = useClearMpnSandbox()

  const handleClearSandbox = async () => {
    try {
      await clearSandboxMutation.mutateAsync()
      await onRefresh()
    } catch {
      // Ignore clear error
    }
  }

  return (
    <Container className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Heading level="h2">{t("sandbox.title")}</Heading>
          <Text className="text-ui-fg-subtle text-xs">
            {t("sandbox.subtitle")}
          </Text>
        </div>
        <Button variant="secondary" onClick={() => void handleClearSandbox()}>
          {t("sandbox.clearButton")}
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("sandbox.colChannel")}</Table.HeaderCell>
            <Table.HeaderCell>{t("sandbox.colRecipient")}</Table.HeaderCell>
            <Table.HeaderCell>{t("sandbox.colOtp")}</Table.HeaderCell>
            <Table.HeaderCell>{t("sandbox.colBody")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sandboxMessages.map((msg) => (
            <Table.Row key={msg.id}>
              <Table.Cell>
                <Badge color="blue">{msg.channel}</Badge>
              </Table.Cell>
              <Table.Cell>{msg.recipient}</Table.Cell>
              <Table.Cell>
                {msg.otp_code ? (
                  <Badge color="green">{msg.otp_code}</Badge>
                ) : (
                  "—"
                )}
              </Table.Cell>
              <Table.Cell className="max-w-md truncate">{msg.body}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

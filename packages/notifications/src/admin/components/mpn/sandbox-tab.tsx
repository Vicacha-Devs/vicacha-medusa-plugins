import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  Toaster,
  toast,
} from "@medusajs/ui"
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
      toast.success(t("sandbox.clearButton"))
      await onRefresh()
    } catch (err: any) {
      toast.error(err?.message || t("messages.loadStudioError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("sandbox.title")}</Heading>
          <Text className="text-ui-fg-subtle text-xs mt-1">
            {t("sandbox.subtitle")}
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          isLoading={clearSandboxMutation.isPending}
          onClick={() => void handleClearSandbox()}
        >
          {t("sandbox.clearButton")}
        </Button>
      </div>

      <SectionRow title={t("sandbox.colOtp")} value={sandboxMessages.length} />

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
                <Badge size="2xsmall" color="blue">
                  {msg.channel}
                </Badge>
              </Table.Cell>
              <Table.Cell>{msg.recipient}</Table.Cell>
              <Table.Cell>
                {msg.otp_code ? (
                  <StatusBadge color="green">{msg.otp_code}</StatusBadge>
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

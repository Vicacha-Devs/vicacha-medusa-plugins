import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Switch,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useOrderNotificationsWidgetState } from "../../hooks"

const OrderNotificationsActivityWidget = ({ data }: { data?: any }) => {
  const { t, i18n } = useTranslation()
  const {
    orderId,
    logs,
    templates,
    selectedChannel,
    setSelectedChannel,
    selectedTemplateId,
    setSelectedTemplateId,
    attachInvoicePdf,
    setAttachInvoicePdf,
    sending,
    statusMessage,
    handleSendOrderNotification,
  } = useOrderNotificationsWidgetState({
    order: data,
    t,
  })

  if (!orderId) return null

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <Container className="p-6" dir={isRtl ? "rtl" : "ltr"}>
      <Heading level="h2">
        {t("widget.title", { count: logs.length })}
      </Heading>
      <Text className="text-ui-fg-subtle text-xs mt-1">
        {t("widget.subtitle")}
      </Text>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="w-40">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <Select.Trigger>
              <Select.Value placeholder={t("widget.channelPlaceholder")} />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="email">EMAIL</Select.Item>
              <Select.Item value="whatsapp">WHATSAPP / OPENWA</Select.Item>
              <Select.Item value="telegram">TELEGRAM</Select.Item>
              <Select.Item value="sms">SMS</Select.Item>
              <Select.Item value="dummy">DUMMY SANDBOX</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div className="w-64">
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("widget.templatePlaceholder")} />
            </Select.Trigger>
            <Select.Content>
              {templates.map((tpl) => (
                <Select.Item key={tpl.id} value={tpl.id}>
                  [{tpl.channel.toUpperCase()}] {tpl.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="flex items-center gap-x-2">
          <Switch
            checked={attachInvoicePdf}
            onCheckedChange={setAttachInvoicePdf}
          />
          <Text className="text-xs">{t("widget.attachInvoiceLabel")}</Text>
        </div>

        <Button
          size="small"
          variant="primary"
          disabled={sending}
          onClick={() => void handleSendOrderNotification()}
        >
          {sending ? t("widget.sending") : t("widget.sendResendButton")}
        </Button>

        {statusMessage && <Badge color="green">{statusMessage}</Badge>}
      </div>

      <Table className="mt-4">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("widget.colChannel")}</Table.HeaderCell>
            <Table.HeaderCell>{t("widget.colEventTemplate")}</Table.HeaderCell>
            <Table.HeaderCell>{t("widget.colRecipient")}</Table.HeaderCell>
            <Table.HeaderCell>{t("widget.colStatus")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {logs.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>
                <Badge color="blue">{row.channel}</Badge>
              </Table.Cell>
              <Table.Cell>
                {row.event_name} ({row.template_id || "—"})
              </Table.Cell>
              <Table.Cell>{row.recipient_masked}</Table.Cell>
              <Table.Cell>
                <Badge
                  color={
                    row.status === "sent" || row.status === "delivered"
                      ? "green"
                      : "orange"
                  }
                >
                  {row.status}
                </Badge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderNotificationsActivityWidget

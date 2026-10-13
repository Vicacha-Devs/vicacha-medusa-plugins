import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
} from "@medusajs/ui"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useCreateMpnBroadcast } from "../../../hooks"
import type { StatusBannerState } from "./constants"

interface BroadcastsConsentTabProps {
  broadcasts: Array<Record<string, any>>
  consentSummary: Record<string, any> | null
  templates: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus: (status: StatusBannerState) => void
}

export const BroadcastsConsentTab: React.FC<BroadcastsConsentTabProps> = ({
  broadcasts,
  consentSummary,
  templates,
  onRefresh,
  onStatus,
}) => {
  const { t } = useTranslation()
  const [broadcastName, setBroadcastName] = useState<string>("")
  const [broadcastChannel, setBroadcastChannel] = useState<string>("sms")
  const [broadcastTemplateId, setBroadcastTemplateId] = useState<string>(
    "system_sms_order_placed"
  )

  const createBroadcastMutation = useCreateMpnBroadcast()

  const handleSendBroadcast = async () => {
    if (!broadcastName.trim()) return
    try {
      await createBroadcastMutation.mutateAsync({
        name: broadcastName,
        channel: broadcastChannel,
        template_id: broadcastTemplateId,
        send_now: true,
      })
      setBroadcastName("")
      onStatus({
        type: "success",
        text: t("messages.broadcastSentSuccess"),
      })
      await onRefresh()
    } catch {
      // Ignore broadcast error
    }
  }

  return (
    <Container className="p-6">
      <Heading level="h2">{t("broadcasts.title")}</Heading>
      {consentSummary && (
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge color="green">
            {t("broadcasts.smsOptedIn", {
              count: consentSummary.opted_in_sms,
            })}
          </Badge>
          <Badge color="green">
            {t("broadcasts.whatsappOptedIn", {
              count: consentSummary.opted_in_whatsapp,
            })}
          </Badge>
          <Badge color="blue">
            {t("broadcasts.telegramLinked", {
              count: consentSummary.opted_in_telegram,
            })}
          </Badge>
          <Badge color="red">
            {t("broadcasts.optedOut", {
              count: consentSummary.opted_out_total,
            })}
          </Badge>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <Label>{t("broadcasts.campaignNameLabel")}</Label>
          <Input
            placeholder={t("broadcasts.campaignNamePlaceholder")}
            value={broadcastName}
            onChange={(e) => setBroadcastName(e.target.value)}
          />
        </div>
        <div>
          <Label>{t("broadcasts.channelLabel")}</Label>
          <Select value={broadcastChannel} onValueChange={setBroadcastChannel}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="sms">SMS</Select.Item>
              <Select.Item value="whatsapp">WhatsApp</Select.Item>
              <Select.Item value="telegram">Telegram</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div>
          <Label>{t("broadcasts.templateLabel")}</Label>
          <Select
            value={broadcastTemplateId}
            onValueChange={setBroadcastTemplateId}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {templates.map((tpl) => (
                <Select.Item key={tpl.id} value={tpl.id}>
                  [{tpl.channel}] {tpl.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="primary" onClick={() => void handleSendBroadcast()}>
            {t("broadcasts.sendNowButton")}
          </Button>
        </div>
      </div>

      <Table className="mt-6">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("broadcasts.colCampaign")}</Table.HeaderCell>
            <Table.HeaderCell>{t("broadcasts.colChannel")}</Table.HeaderCell>
            <Table.HeaderCell>{t("broadcasts.colStatus")}</Table.HeaderCell>
            <Table.HeaderCell>{t("broadcasts.colSentTotal")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {broadcasts.map((b) => (
            <Table.Row key={b.id}>
              <Table.Cell>{b.name}</Table.Cell>
              <Table.Cell>{b.channel}</Table.Cell>
              <Table.Cell>
                <Badge color="green">{b.status}</Badge>
              </Table.Cell>
              <Table.Cell>
                {b.sent_count} / {b.total_recipients}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

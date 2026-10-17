import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  StatusBadge,
  Table,
  Toaster,
  toast,
} from "@medusajs/ui"
import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useCreateMpnBroadcast } from "../../../hooks"
import { BroadcastConsentSection } from "./broadcast-consent-section"
import type { StatusBannerState } from "./constants"

export interface BroadcastsConsentTabProps {
  broadcasts: Array<Record<string, any>>
  consentSummary: Record<string, any> | null
  templates: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus?: (status: StatusBannerState) => void
  section?: "main" | "side" | "all"
}

export const BroadcastsConsentTab: React.FC<BroadcastsConsentTabProps> = ({
  broadcasts,
  consentSummary,
  templates,
  onRefresh,
  onStatus,
  section = "all",
}) => {
  const { t } = useTranslation()
  const [broadcastName, setBroadcastName] = useState<string>("")
  const [broadcastChannel, setBroadcastChannel] = useState<string>("sms")
  const [broadcastTemplateId, setBroadcastTemplateId] = useState<string>(
    "system_sms_order_placed"
  )

  const form = useForm({
    defaultValues: {
      name: "",
      channel: "sms",
      template_id: "system_sms_order_placed",
    },
  })

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
      const msg = t("messages.broadcastSentSuccess")
      toast.success(msg)
      onStatus?.({
        type: "success",
        text: msg,
      })
      await onRefresh()
    } catch (err: any) {
      toast.error(err?.message || t("messages.loadStudioError"))
    }
  }

  const mainSection = (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("broadcasts.title")}</Heading>
        <StatusBadge color="green">{broadcasts.length}</StatusBadge>
      </div>

      <Form {...form}>
        <KeyboundForm
          onSubmit={(e) => {
            e.preventDefault()
            void handleSendBroadcast()
          }}
          className="px-6 py-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-y-2">
              <Label size="small">{t("broadcasts.campaignNameLabel")}</Label>
              <Input
                size="small"
                placeholder={t("broadcasts.campaignNamePlaceholder")}
                value={broadcastName}
                onChange={(e) => setBroadcastName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">{t("broadcasts.channelLabel")}</Label>
              <Select
                size="small"
                value={broadcastChannel}
                onValueChange={setBroadcastChannel}
              >
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
            <div className="flex flex-col gap-y-2">
              <Label size="small">{t("broadcasts.templateLabel")}</Label>
              <Select
                size="small"
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
              <Button
                size="small"
                variant="primary"
                type="submit"
                isLoading={createBroadcastMutation.isPending}
              >
                {t("broadcasts.sendNowButton")}
              </Button>
            </div>
          </div>
        </KeyboundForm>
      </Form>

      <Table>
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
              <Table.Cell>
                <Badge size="2xsmall" color="blue">
                  {b.channel}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color="green">{b.status}</StatusBadge>
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

  const sideSection = (
    <BroadcastConsentSection consentSummary={consentSummary} />
  )

  if (section === "main") {
    return (
      <>
        <Toaster />
        {mainSection}
      </>
    )
  }

  if (section === "side") {
    return sideSection
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Toaster />
      <div className="lg:col-span-2">{mainSection}</div>
      <div>{sideSection}</div>
    </div>
  )
}

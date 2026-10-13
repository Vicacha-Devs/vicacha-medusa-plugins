import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
} from "@medusajs/ui"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useCreateMpnMapping, useDeleteMpnMapping } from "../../../hooks"
import { CHANNELS, type StatusBannerState } from "./constants"

interface EventMappingsTabProps {
  mappings: Array<Record<string, any>>
  supportedEvents: string[]
  templates: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus: (status: StatusBannerState) => void
}

export const EventMappingsTab: React.FC<EventMappingsTabProps> = ({
  mappings,
  supportedEvents,
  templates,
  onRefresh,
  onStatus,
}) => {
  const { t } = useTranslation()
  const [newMappingEvent, setNewMappingEvent] = useState<string>("order.placed")
  const [newMappingChannel, setNewMappingChannel] = useState<string>("email")
  const [newMappingTemplateId, setNewMappingTemplateId] = useState<string>(
    "system_email_order_placed"
  )
  const [newMappingRecipientRule, setNewMappingRecipientRule] =
    useState<string>("customer_auto")
  const [newMappingAttachInvoice, setNewMappingAttachInvoice] =
    useState<boolean>(false)
  const [newMappingThreadId, setNewMappingThreadId] = useState<string>("")

  const createMappingMutation = useCreateMpnMapping()
  const deleteMappingMutation = useDeleteMpnMapping()

  const handleCreateMapping = async () => {
    try {
      await createMappingMutation.mutateAsync({
        event_name: newMappingEvent,
        channel: newMappingChannel,
        template_id: newMappingTemplateId,
        recipient_rule: newMappingRecipientRule,
        telegram_thread_id: newMappingThreadId
          ? Number(newMappingThreadId)
          : null,
        attach_document_types: newMappingAttachInvoice ? ["invoice"] : null,
        is_active: true,
      })
      onStatus({
        type: "success",
        text: t("messages.createdMappingSuccess", {
          event: newMappingEvent,
          channel: newMappingChannel,
        }),
      })
      await onRefresh()
    } catch {
      onStatus({
        type: "error",
        text: t("messages.createMappingError"),
      })
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await deleteMappingMutation.mutateAsync({ id: mappingId })
      await onRefresh()
    } catch {
      // Ignore delete error
    }
  }

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">
        {t("mappings.title")}
      </Heading>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div>
          <Label>{t("mappings.eventLabel")}</Label>
          <Select value={newMappingEvent} onValueChange={setNewMappingEvent}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {supportedEvents.map((ev) => (
                <Select.Item key={ev} value={ev}>
                  {ev}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label>{t("mappings.channelLabel")}</Label>
          <Select
            value={newMappingChannel}
            onValueChange={setNewMappingChannel}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {CHANNELS.map((ch) => (
                <Select.Item key={ch} value={ch}>
                  {ch.toUpperCase()}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label>{t("mappings.templateLabel")}</Label>
          <Select
            value={newMappingTemplateId}
            onValueChange={setNewMappingTemplateId}
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

        <div>
          <Label>{t("mappings.recipientRuleLabel")}</Label>
          <Select
            value={newMappingRecipientRule}
            onValueChange={setNewMappingRecipientRule}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="customer_auto">
                {t("mappings.ruleCustomerAuto")}
              </Select.Item>
              <Select.Item value="order_email">
                {t("mappings.ruleOrderEmail")}
              </Select.Item>
              <Select.Item value="order_phone">
                {t("mappings.ruleOrderPhone")}
              </Select.Item>
              <Select.Item value="customer_telegram">
                {t("mappings.ruleCustomerTelegram")}
              </Select.Item>
              <Select.Item value="merchant_channel">
                {t("mappings.ruleMerchantChannel")}
              </Select.Item>
              <Select.Item value="b2b_accounting_contact">
                {t("mappings.ruleB2bAccounting")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label>{t("mappings.threadIdLabel")}</Label>
          <Input
            placeholder={t("mappings.threadIdPlaceholder")}
            value={newMappingThreadId}
            onChange={(e) => setNewMappingThreadId(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Switch
            checked={newMappingAttachInvoice}
            onCheckedChange={setNewMappingAttachInvoice}
          />
          <Label>{t("mappings.attachInvoiceLabel")}</Label>
        </div>
        <Button variant="primary" onClick={() => void handleCreateMapping()}>
          {t("mappings.addMappingButton")}
        </Button>
      </div>

      <Table className="mt-6">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("mappings.colEvent")}</Table.HeaderCell>
            <Table.HeaderCell>{t("mappings.colChannel")}</Table.HeaderCell>
            <Table.HeaderCell>{t("mappings.colTemplate")}</Table.HeaderCell>
            <Table.HeaderCell>
              {t("mappings.colRecipientRule")}
            </Table.HeaderCell>
            <Table.HeaderCell>{t("mappings.colAttachments")}</Table.HeaderCell>
            <Table.HeaderCell>{t("mappings.colAction")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {mappings.map((m) => (
            <Table.Row key={m.id}>
              <Table.Cell>{m.event_name}</Table.Cell>
              <Table.Cell>
                <Badge color="blue">{m.channel}</Badge>
              </Table.Cell>
              <Table.Cell>{m.template_id}</Table.Cell>
              <Table.Cell>{m.recipient_rule}</Table.Cell>
              <Table.Cell>
                {Array.isArray(m.attach_document_types)
                  ? m.attach_document_types.join(", ")
                  : "—"}
              </Table.Cell>
              <Table.Cell>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => void handleDeleteMapping(m.id)}
                >
                  {t("mappings.deleteButton")}
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

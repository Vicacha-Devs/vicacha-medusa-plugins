import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Toaster,
  toast,
} from "@medusajs/ui"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useCreateMpnMapping, useDeleteMpnMapping } from "../../../hooks"
import type { StatusBannerState } from "./constants"
import { EventMappingForm } from "./event-mapping-form"

export interface EventMappingsTabProps {
  mappings: Array<Record<string, any>>
  supportedEvents: string[]
  templates: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus?: (status: StatusBannerState) => void
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
      const msg = t("messages.createdMappingSuccess", {
        event: newMappingEvent,
        channel: newMappingChannel,
      })
      toast.success(msg)
      onStatus?.({ type: "success", text: msg })
      await onRefresh()
    } catch {
      const msg = t("messages.createMappingError")
      toast.error(msg)
      onStatus?.({ type: "error", text: msg })
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
    <Container className="divide-y p-0">
      <Toaster />
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("mappings.title")}</Heading>
        <StatusBadge color="green">{mappings.length}</StatusBadge>
      </div>

      <SectionRow
        title={t("mappings.eventLabel")}
        value={
          <Badge size="2xsmall" color="grey">
            {supportedEvents.length}
          </Badge>
        }
      />

      <EventMappingForm
        supportedEvents={supportedEvents}
        templates={templates}
        newMappingEvent={newMappingEvent}
        newMappingChannel={newMappingChannel}
        newMappingTemplateId={newMappingTemplateId}
        newMappingRecipientRule={newMappingRecipientRule}
        newMappingAttachInvoice={newMappingAttachInvoice}
        newMappingThreadId={newMappingThreadId}
        isSubmitting={createMappingMutation.isPending}
        onEventChange={setNewMappingEvent}
        onChannelChange={setNewMappingChannel}
        onTemplateChange={setNewMappingTemplateId}
        onRecipientRuleChange={setNewMappingRecipientRule}
        onAttachInvoiceChange={setNewMappingAttachInvoice}
        onThreadIdChange={setNewMappingThreadId}
        onSubmit={() => void handleCreateMapping()}
      />

      <Table>
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
                <Badge size="2xsmall" color="blue">
                  {m.channel}
                </Badge>
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
                  isLoading={deleteMappingMutation.isPending}
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

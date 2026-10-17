import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import { Button, Input, Label, Select, Switch } from "@medusajs/ui"
import React from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { CHANNELS } from "./constants"

export interface EventMappingFormProps {
  supportedEvents: string[]
  templates: Array<Record<string, any>>
  newMappingEvent: string
  newMappingChannel: string
  newMappingTemplateId: string
  newMappingRecipientRule: string
  newMappingAttachInvoice: boolean
  newMappingThreadId: string
  isSubmitting?: boolean
  onEventChange: (event: string) => void
  onChannelChange: (channel: string) => void
  onTemplateChange: (templateId: string) => void
  onRecipientRuleChange: (rule: string) => void
  onAttachInvoiceChange: (attach: boolean) => void
  onThreadIdChange: (threadId: string) => void
  onSubmit: () => void
}

export const EventMappingForm: React.FC<EventMappingFormProps> = ({
  supportedEvents,
  templates,
  newMappingEvent,
  newMappingChannel,
  newMappingTemplateId,
  newMappingRecipientRule,
  newMappingAttachInvoice,
  newMappingThreadId,
  isSubmitting = false,
  onEventChange,
  onChannelChange,
  onTemplateChange,
  onRecipientRuleChange,
  onAttachInvoiceChange,
  onThreadIdChange,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const form = useForm({
    defaultValues: {
      event_name: newMappingEvent,
      channel: newMappingChannel,
      template_id: newMappingTemplateId,
      recipient_rule: newMappingRecipientRule,
      telegram_thread_id: newMappingThreadId,
      attach_invoice: newMappingAttachInvoice,
    },
  })

  return (
    <Form {...form}>
      <KeyboundForm
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        className="px-6 py-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="flex flex-col gap-y-2">
            <Label size="small">{t("mappings.eventLabel")}</Label>
            <Select
              size="small"
              value={newMappingEvent}
              onValueChange={onEventChange}
            >
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

          <div className="flex flex-col gap-y-2">
            <Label size="small">{t("mappings.channelLabel")}</Label>
            <Select
              size="small"
              value={newMappingChannel}
              onValueChange={onChannelChange}
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

          <div className="flex flex-col gap-y-2">
            <Label size="small">{t("mappings.templateLabel")}</Label>
            <Select
              size="small"
              value={newMappingTemplateId}
              onValueChange={onTemplateChange}
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

          <div className="flex flex-col gap-y-2">
            <Label size="small">{t("mappings.recipientRuleLabel")}</Label>
            <Select
              size="small"
              value={newMappingRecipientRule}
              onValueChange={onRecipientRuleChange}
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

          <div className="flex flex-col gap-y-2">
            <Label size="small">{t("mappings.threadIdLabel")}</Label>
            <Input
              size="small"
              placeholder={t("mappings.threadIdPlaceholder")}
              value={newMappingThreadId}
              onChange={(e) => onThreadIdChange(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <Switch
              checked={newMappingAttachInvoice}
              onCheckedChange={onAttachInvoiceChange}
            />
            <Label size="small">{t("mappings.attachInvoiceLabel")}</Label>
          </div>
          <Button
            size="small"
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
          >
            {t("mappings.addMappingButton")}
          </Button>
        </div>
      </KeyboundForm>
    </Form>
  )
}

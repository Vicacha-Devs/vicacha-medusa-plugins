import { Form, KeyboundForm, SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  StatusBadge,
  Text,
} from "@medusajs/ui"
import React from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

export interface ChannelsMainSectionProps {
  whatsappDriverInput: string
  openWaUrlInput: string
  telegramChannelInput: string
  tgVerified: boolean
  verifyCooldown: boolean
  isPending: boolean
  onWhatsappDriverChange: (driver: string) => void
  onOpenWaUrlChange: (url: string) => void
  onTelegramChannelChange: (channelId: string) => void
  onSaveOrVerify: (
    channel: string,
    driver: string,
    configJson: Record<string, any>,
    action: "save" | "verify"
  ) => void
}

export const ChannelsMainSection: React.FC<ChannelsMainSectionProps> = ({
  whatsappDriverInput,
  openWaUrlInput,
  telegramChannelInput,
  tgVerified,
  verifyCooldown,
  isPending,
  onWhatsappDriverChange,
  onOpenWaUrlChange,
  onTelegramChannelChange,
  onSaveOrVerify,
}) => {
  const { t } = useTranslation()
  const form = useForm({
    defaultValues: {
      whatsapp_driver: whatsappDriverInput,
      gateway_url: openWaUrlInput,
      merchant_channel_id: telegramChannelInput,
    },
  })

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("channels.whatsappTitle")}</Heading>
            <Text className="text-ui-fg-subtle text-xs mt-1">
              {t("channels.whatsappSubtitle")}
            </Text>
          </div>
          <Badge size="2xsmall" color="blue">
            {whatsappDriverInput}
          </Badge>
        </div>

        <SectionRow
          title={t("channels.activeDriverLabel")}
          value={whatsappDriverInput}
        />

        <Form {...form}>
          <KeyboundForm
            onSubmit={(e) => {
              e.preventDefault()
              onSaveOrVerify(
                "whatsapp",
                whatsappDriverInput,
                { gateway_url: openWaUrlInput },
                "save"
              )
            }}
            className="flex flex-col gap-y-3 px-6 py-4"
          >
            <div className="flex flex-col gap-y-2">
              <Label size="small">{t("channels.activeDriverLabel")}</Label>
              <Select
                size="small"
                value={whatsappDriverInput}
                onValueChange={onWhatsappDriverChange}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="meta-cloud">
                    {t("channels.driverMetaCloud")}
                  </Select.Item>
                  <Select.Item value="openwa">
                    {t("channels.driverOpenWa")}
                  </Select.Item>
                  <Select.Item value="waha">
                    {t("channels.driverWaha")}
                  </Select.Item>
                  <Select.Item value="evolution">
                    {t("channels.driverEvolution")}
                  </Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">{t("channels.gatewayUrlLabel")}</Label>
              <Input
                size="small"
                placeholder="http://127.0.0.1:8082"
                value={openWaUrlInput}
                onChange={(e) => onOpenWaUrlChange(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="small"
                variant="primary"
                type="submit"
                isLoading={isPending}
              >
                {t("channels.saveWhatsappButton")}
              </Button>
            </div>
          </KeyboundForm>
        </Form>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("channels.telegramTitle")}</Heading>
            <Text className="text-ui-fg-subtle text-xs mt-1">
              {t("channels.telegramSubtitle")}
            </Text>
          </div>
          <StatusBadge color={tgVerified ? "green" : "orange"}>
            {tgVerified
              ? t("channels.verifiedBadge")
              : t("channels.unverifiedBadge")}
          </StatusBadge>
        </div>

        <SectionRow
          title={t("channels.merchantChannelLabel")}
          value={telegramChannelInput || "—"}
        />

        <div className="flex flex-col gap-y-3 px-6 py-4">
          <div className="flex flex-col gap-y-2">
            <Label size="small">{t("channels.merchantChannelLabel")}</Label>
            <Input
              size="small"
              placeholder={t("channels.merchantChannelPlaceholder")}
              value={telegramChannelInput}
              onChange={(e) => onTelegramChannelChange(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-x-2">
            <Button
              size="small"
              variant="secondary"
              isLoading={isPending}
              onClick={() =>
                onSaveOrVerify(
                  "telegram",
                  "telegram-bot",
                  { merchant_channel_id: telegramChannelInput },
                  "save"
                )
              }
            >
              {t("channels.saveChannelIdButton")}
            </Button>
            <Button
              size="small"
              variant="primary"
              disabled={verifyCooldown}
              isLoading={isPending}
              onClick={() =>
                onSaveOrVerify(
                  "telegram",
                  "telegram-bot",
                  { merchant_channel_id: telegramChannelInput },
                  "verify"
                )
              }
            >
              {t("channels.sendTestButton")}
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

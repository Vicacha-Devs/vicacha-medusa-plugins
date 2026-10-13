import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
} from "@medusajs/ui"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSaveOrVerifyMpnChannel } from "../../../hooks"
import type { StatusBannerState } from "./constants"

interface ChannelsConfigTabProps {
  channelsConfig: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus: (status: StatusBannerState) => void
}

export const ChannelsConfigTab: React.FC<ChannelsConfigTabProps> = ({
  channelsConfig,
  onRefresh,
  onStatus,
}) => {
  const { t } = useTranslation()
  const [telegramChannelInput, setTelegramChannelInput] = useState<string>("")
  const [openWaUrlInput, setOpenWaUrlInput] = useState<string>("")
  const [whatsappDriverInput, setWhatsappDriverInput] =
    useState<string>("meta-cloud")
  const [smsDriverInput, setSmsDriverInput] = useState<string>("twilio")
  const [verifyCooldown, setVerifyCooldown] = useState<boolean>(false)

  const saveOrVerifyMutation = useSaveOrVerifyMpnChannel()

  useEffect(() => {
    const tg = channelsConfig.find((c) => c.channel === "telegram")
    if (tg?.config_json?.merchant_channel_id) {
      setTelegramChannelInput(String(tg.config_json.merchant_channel_id))
    }
    const wa = channelsConfig.find((c) => c.channel === "whatsapp")
    if (wa?.driver) setWhatsappDriverInput(String(wa.driver))
    if (wa?.config_json?.gateway_url) {
      setOpenWaUrlInput(String(wa.config_json.gateway_url))
    }
    const sms = channelsConfig.find((c) => c.channel === "sms")
    if (sms?.driver) setSmsDriverInput(String(sms.driver))
  }, [channelsConfig])

  const handleSaveOrVerifyChannel = async (
    channel: string,
    driver: string,
    configJson: Record<string, any>,
    action: "save" | "verify"
  ) => {
    if (action === "verify") {
      setVerifyCooldown(true)
      setTimeout(() => setVerifyCooldown(false), 3000)
    }
    try {
      await saveOrVerifyMutation.mutateAsync({
        channel,
        driver,
        config_json: configJson,
        action,
      })
      onStatus({
        type: "success",
        text:
          action === "verify"
            ? t("messages.verifiedChannelSuccess", { channel })
            : t("messages.savedChannelSuccess", { channel }),
      })
      await onRefresh()
    } catch (err: any) {
      onStatus({
        type: "error",
        text:
          err?.message || t("messages.channelActionError", { action, channel }),
      })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* WHATSAPP / OPENWA CARD */}
      <Container className="p-5">
        <Heading level="h2">{t("channels.whatsappTitle")}</Heading>
        <Text className="text-ui-fg-subtle text-xs mt-1">
          {t("channels.whatsappSubtitle")}
        </Text>
        <div className="mt-4 flex flex-col gap-y-3">
          <div>
            <Label>{t("channels.activeDriverLabel")}</Label>
            <Select
              value={whatsappDriverInput}
              onValueChange={setWhatsappDriverInput}
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
          <div>
            <Label>{t("channels.gatewayUrlLabel")}</Label>
            <Input
              placeholder="http://127.0.0.1:8082"
              value={openWaUrlInput}
              onChange={(e) => setOpenWaUrlInput(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            onClick={() =>
              void handleSaveOrVerifyChannel(
                "whatsapp",
                whatsappDriverInput,
                { gateway_url: openWaUrlInput },
                "save"
              )
            }
          >
            {t("channels.saveWhatsappButton")}
          </Button>
        </div>
      </Container>

      {/* TELEGRAM CARD */}
      <Container className="p-5">
        <div className="flex items-center justify-between">
          <Heading level="h2">{t("channels.telegramTitle")}</Heading>
          {channelsConfig.find((c) => c.channel === "telegram")?.is_verified ? (
            <Badge color="green">{t("channels.verifiedBadge")}</Badge>
          ) : (
            <Badge color="orange">{t("channels.unverifiedBadge")}</Badge>
          )}
        </div>
        <Text className="text-ui-fg-subtle text-xs mt-1">
          {t("channels.telegramSubtitle")}
        </Text>
        <div className="mt-4 flex flex-col gap-y-3">
          <div>
            <Label>{t("channels.merchantChannelLabel")}</Label>
            <Input
              placeholder={t("channels.merchantChannelPlaceholder")}
              value={telegramChannelInput}
              onChange={(e) => setTelegramChannelInput(e.target.value)}
            />
          </div>
          <div className="flex gap-x-2">
            <Button
              variant="secondary"
              onClick={() =>
                void handleSaveOrVerifyChannel(
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
              variant="primary"
              disabled={verifyCooldown}
              onClick={() =>
                void handleSaveOrVerifyChannel(
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

      {/* SMS DRIVER CARD */}
      <Container className="p-5">
        <Heading level="h2">{t("channels.smsTitle")}</Heading>
        <Text className="text-ui-fg-subtle text-xs mt-1">
          {t("channels.smsSubtitle")}
        </Text>
        <div className="mt-4 flex flex-col gap-y-3">
          <div>
            <Label>{t("channels.smsDriverLabel")}</Label>
            <Select value={smsDriverInput} onValueChange={setSmsDriverInput}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="twilio">
                  {t("channels.driverTwilio")}
                </Select.Item>
                <Select.Item value="signalhouse">
                  {t("channels.driverSignalHouse")}
                </Select.Item>
                <Select.Item value="msg91">
                  {t("channels.driverMsg91")}
                </Select.Item>
                <Select.Item value="smsapi">
                  {t("channels.driverSmsApi")}
                </Select.Item>
                <Select.Item value="dummy">
                  {t("channels.driverDummy")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
          <Button
            variant="primary"
            onClick={() =>
              void handleSaveOrVerifyChannel("sms", smsDriverInput, {}, "save")
            }
          >
            {t("channels.saveSmsButton")}
          </Button>
        </div>
      </Container>
    </div>
  )
}

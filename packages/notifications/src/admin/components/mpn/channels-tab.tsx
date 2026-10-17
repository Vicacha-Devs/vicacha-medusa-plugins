import { Toaster, toast } from "@medusajs/ui"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSaveOrVerifyMpnChannel } from "../../../hooks"
import { ChannelsMainSection } from "./channels-main-section"
import { ChannelsSideSection } from "./channels-side-section"
import type { StatusBannerState } from "./constants"

export interface ChannelsConfigTabProps {
  channelsConfig: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus?: (status: StatusBannerState) => void
  section?: "main" | "side" | "all"
}

export const ChannelsConfigTab: React.FC<ChannelsConfigTabProps> = ({
  channelsConfig,
  onRefresh,
  onStatus,
  section = "all",
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
      const msg =
        action === "verify"
          ? t("messages.verifiedChannelSuccess", { channel })
          : t("messages.savedChannelSuccess", { channel })
      toast.success(msg)
      onStatus?.({ type: "success", text: msg })
      await onRefresh()
    } catch (err: any) {
      const msg =
        err?.message || t("messages.channelActionError", { action, channel })
      toast.error(msg)
      onStatus?.({ type: "error", text: msg })
    }
  }

  const tgVerified = Boolean(
    channelsConfig.find((c) => c.channel === "telegram")?.is_verified
  )

  const mainCards = (
    <ChannelsMainSection
      whatsappDriverInput={whatsappDriverInput}
      openWaUrlInput={openWaUrlInput}
      telegramChannelInput={telegramChannelInput}
      tgVerified={tgVerified}
      verifyCooldown={verifyCooldown}
      isPending={saveOrVerifyMutation.isPending}
      onWhatsappDriverChange={setWhatsappDriverInput}
      onOpenWaUrlChange={setOpenWaUrlInput}
      onTelegramChannelChange={setTelegramChannelInput}
      onSaveOrVerify={(ch, drv, cfg, act) =>
        void handleSaveOrVerifyChannel(ch, drv, cfg, act)
      }
    />
  )

  const sideCard = (
    <ChannelsSideSection
      smsDriverInput={smsDriverInput}
      isPending={saveOrVerifyMutation.isPending}
      onSmsDriverChange={setSmsDriverInput}
      onSaveSms={() =>
        void handleSaveOrVerifyChannel("sms", smsDriverInput, {}, "save")
      }
    />
  )

  if (section === "main") {
    return (
      <>
        <Toaster />
        {mainCards}
      </>
    )
  }

  if (section === "side") {
    return sideCard
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Toaster />
      <div className="lg:col-span-2">{mainCards}</div>
      <div>{sideCard}</div>
    </div>
  )
}

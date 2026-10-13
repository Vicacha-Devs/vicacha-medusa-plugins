import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import type {
  TelegramInlineButton,
  TelegramProviderOptions,
} from "../../types"
import {
  ChannelRateLimiter,
  isValidTelegramRecipient,
  sanitizeTelegramHtml,
} from "../../modules/notifications/utils/security"

export const MPN_TELEGRAM_PROVIDER_ID = "mpn-telegram"
export type { TelegramProviderOptions } from "../../types"

type InjectedDependencies = {
  logger?: Logger
}

export class TelegramNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = MPN_TELEGRAM_PROVIDER_ID
  protected readonly logger_?: Logger
  protected readonly options_: TelegramProviderOptions
  public readonly rateLimiter: ChannelRateLimiter

  constructor(
    container: InjectedDependencies,
    options?: TelegramProviderOptions
  ) {
    super()
    this.logger_ = container?.logger
    this.options_ = options ?? {}
    this.rateLimiter = new ChannelRateLimiter()
  }

  buildTelegramPayload(params: {
    chatId: string
    text: string
    messageThreadId?: number | null
    inlineKeyboard?: TelegramInlineButton[][]
    disableWebPagePreview?: boolean
  }): Record<string, any> {
    if (!isValidTelegramRecipient(params.chatId)) {
      throw new Error(
        `Invalid Telegram recipient '${params.chatId}'. Expected -100... supergroup/channel ID, @channel_username, or numeric chat_id.`
      )
    }

    const payload: Record<string, any> = {
      chat_id: params.chatId.trim(),
      text: sanitizeTelegramHtml(params.text),
      parse_mode: "HTML",
      disable_web_page_preview: params.disableWebPagePreview ?? true,
    }

    if (
      typeof params.messageThreadId === "number" &&
      Number.isInteger(params.messageThreadId) &&
      params.messageThreadId > 0
    ) {
      payload.message_thread_id = params.messageThreadId
    }

    if (
      Array.isArray(params.inlineKeyboard) &&
      params.inlineKeyboard.length > 0
    ) {
      payload.reply_markup = {
        inline_keyboard: params.inlineKeyboard,
      }
    }

    return payload
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const data = (notification.data || {}) as Record<string, any>
    const content = (notification.content || {}) as Record<string, any>
    const tgOpts = (data.telegram_options || {}) as Record<string, any>

    const chatId =
      notification.to?.trim() ||
      this.options_.defaultChannelId ||
      process.env.TELEGRAM_MERCHANT_CHANNEL_ID ||
      ""

    const text =
      content.html ||
      content.text ||
      (data.html as string) ||
      (data.text as string) ||
      ""

    const payload = this.buildTelegramPayload({
      chatId,
      text,
      messageThreadId:
        tgOpts.message_thread_id ?? (data.telegram_thread_id as number | null),
      inlineKeyboard: tgOpts.inline_keyboard,
      disableWebPagePreview: tgOpts.disable_web_page_preview,
    })

    // Rate-limit calculation (30 msg/sec global, 1 msg/sec per chat — never drops messages)
    const schedule = this.rateLimiter.scheduleSend({
      recipient: chatId,
      globalRatePerSec: this.options_.globalRateLimitPerSec ?? 30,
      perRecipientRatePerSec: this.options_.perChatRateLimitPerSec ?? 1,
    })
    if (schedule.delayMs > 0 && schedule.delayMs <= 2000) {
      await new Promise((resolve) => setTimeout(resolve, schedule.delayMs))
    }

    const botToken =
      this.options_.botToken || process.env.TELEGRAM_BOT_TOKEN || ""
    if (!botToken) {
      this.logger_?.warn(
        "[mpn-telegram] TELEGRAM_BOT_TOKEN is not set; returning dry-run ID."
      )
      return { id: `tg_dryrun_${Date.now()}` }
    }

    const attachments = Array.isArray(notification.attachments)
      ? notification.attachments
      : []

    // If a PDF document attachment is included (e.g. from medusa-documents-plugin),
    // send the message and then upload the document via Telegram's `sendDocument` API.
    const apiBase = `https://api.telegram.org/bot${botToken}`
    const response = await fetch(`${apiBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const json = (await response.json().catch(() => ({}))) as Record<
      string,
      any
    >
    if (!response.ok || json.ok === false) {
      const description =
        json.description || `Telegram HTTP ${response.status}`
      throw new Error(`Telegram Bot API error: ${description}`)
    }

    const messageId = json.result?.message_id || `tg_${Date.now()}`

    if (attachments.length > 0 && attachments[0]?.content) {
      try {
        const att = attachments[0] as any
        const form = new FormData()
        form.append("chat_id", chatId)
        if (payload.message_thread_id) {
          form.append("message_thread_id", String(payload.message_thread_id))
        }
        const pdfBytes = Buffer.from(att.content, "base64")
        const blob = new Blob([pdfBytes], {
          type: att.content_type || "application/pdf",
        })
        form.append("document", blob, att.filename || "document.pdf")
        await fetch(`${apiBase}/sendDocument`, {
          method: "POST",
          body: form,
        })
      } catch (err: any) {
        this.logger_?.warn(
          `[mpn-telegram] sendDocument attachment warning: ${err?.message || "failed"}`
        )
      }
    }

    return {
      id: String(messageId),
    }
  }
}

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [TelegramNotificationProviderService],
})

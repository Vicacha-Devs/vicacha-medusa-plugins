import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import {
  type CapturedSandboxEntry,
  type DummySandboxProviderOptions,
  NOTIFICATIONS_MODULE,
  type NotificationChannel,
} from "../../types"
import { extractOtpCode } from "../../modules/notifications/utils/security"

export const MPN_DUMMY_SANDBOX_PROVIDER_ID = "mpn-dummy-sandbox"
export type {
  CapturedSandboxEntry,
  DummySandboxProviderOptions,
} from "../../types"

const inMemorySandboxStore: CapturedSandboxEntry[] = []

export function getInMemorySandboxMessages(limit = 50, offset = 0): {
  messages: CapturedSandboxEntry[]
  count: number
} {
  return {
    messages: inMemorySandboxStore.slice(offset, offset + limit),
    count: inMemorySandboxStore.length,
  }
}

export function clearInMemorySandboxMessages(): void {
  inMemorySandboxStore.length = 0
}

type InjectedDependencies = {
  logger?: Logger
  [key: string]: unknown
}

/**
 * Dummy Sandbox Notification Provider (inspired by `medusa-dummy-sms`, expanded to all channels).
 * Captures SMS, OTPs, WhatsApp, Telegram, and Email notifications in memory + DB (`mpn_sandbox_message`)
 * so local/staging environments can inspect OTPs and message payloads in Medusa Admin without carrier cost.
 */
export class DummySandboxNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = MPN_DUMMY_SANDBOX_PROVIDER_ID
  protected readonly container_: InjectedDependencies
  protected readonly logger_?: Logger
  protected readonly options_: DummySandboxProviderOptions

  constructor(
    container: InjectedDependencies,
    options?: DummySandboxProviderOptions
  ) {
    super()
    this.container_ = container || {}
    this.logger_ = container?.logger
    this.options_ = options ?? {}
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const data = (notification.data || {}) as Record<string, any>
    const content = (notification.content || {}) as Record<string, any>
    const body =
      content.text ||
      (data.text as string) ||
      (data.body as string) ||
      content.html ||
      ""
    const html = content.html || (data.html as string) || null
    const subject = content.subject || (data.subject as string) || null
    const otpCode = extractOtpCode(body) || extractOtpCode(subject)

    const mediaUrls: string[] = Array.isArray(data.mediaUrl)
      ? data.mediaUrl
      : []
    const attachmentsMeta = Array.isArray(notification.attachments)
      ? notification.attachments.map((a: any) => ({
          filename: String(a.filename || "attachment.pdf"),
          content_type: String(a.content_type || "application/pdf"),
        }))
      : []

    const id = `sbx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const entry: CapturedSandboxEntry = {
      id,
      channel: notification.channel || "sms",
      recipient: notification.to,
      sender: (notification as any).from || null,
      subject,
      body,
      html,
      otp_code: otpCode,
      media_urls: mediaUrls,
      attachments_meta: attachmentsMeta,
      created_at: new Date().toISOString(),
    }

    const maxStored = Math.max(
      10,
      Number(this.options_.maxStoredMessages ?? 200)
    )
    inMemorySandboxStore.unshift(entry)
    if (inMemorySandboxStore.length > maxStored) {
      inMemorySandboxStore.length = maxStored
    }

    try {
      const mpnService = this.container_?.[NOTIFICATIONS_MODULE] as any
      if (
        mpnService &&
        typeof mpnService.captureSandboxMessage === "function"
      ) {
        await mpnService.captureSandboxMessage({
          channel: (notification.channel || "sms") as NotificationChannel,
          recipient: notification.to,
          sender: entry.sender,
          subject,
          body,
          html,
          media_urls: mediaUrls,
          attachments_meta: attachmentsMeta,
          metadata: { provider: MPN_DUMMY_SANDBOX_PROVIDER_ID },
        })
      }
    } catch {
      // In-memory store already captured the message
    }

    return { id }
  }
}

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [DummySandboxNotificationProviderService],
})

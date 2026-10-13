import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import type { SmtpEmailProviderOptions } from "../../types"
import { validateSafeExternalUrl } from "../../modules/notifications/utils/security"

export const MPN_EMAIL_PROVIDER_ID = "mpn-email"
export type { SmtpEmailProviderOptions } from "../../types"

type InjectedDependencies = {
  logger?: Logger
}

export class SmtpEmailNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = MPN_EMAIL_PROVIDER_ID
  protected readonly logger_?: Logger
  protected readonly options_: SmtpEmailProviderOptions

  constructor(
    container: InjectedDependencies,
    options?: SmtpEmailProviderOptions
  ) {
    super()
    this.logger_ = container?.logger
    this.options_ = options ?? {}
  }

  resolveSenderProfile(profileIndex = 1): {
    name: string
    address: string
    replyTo?: string
  } {
    const idx = Math.min(5, Math.max(1, Number(profileIndex || 1)))
    const envName =
      process.env[`MAILER_FROM_NAME_${idx}`] ||
      process.env.MAILER_FROM_NAME_1 ||
      this.options_.from_name ||
      process.env.STORE_NAME ||
      "Medusa Store"
    const envAddress =
      process.env[`MAILER_FROM_ADDRESS_${idx}`] ||
      process.env.MAILER_FROM_ADDRESS_1 ||
      this.options_.from_address ||
      process.env.SMTP_FROM ||
      "no-reply@example.com"
    const replyTo = process.env[`MAILER_REPLY_TO_${idx}`] || undefined

    return {
      name: envName,
      address: envAddress,
      replyTo,
    }
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const to = notification.to?.trim()
    if (!to || !to.includes("@")) {
      throw new Error("Invalid recipient email address")
    }

    const data = (notification.data || {}) as Record<string, any>
    const content = (notification.content || {}) as Record<string, any>
    const profileIdx = Number(data.sender_profile_index || 1)
    const sender = this.resolveSenderProfile(profileIdx)
    const fromHeader = `${sender.name} <${sender.address}>`

    const subject =
      content.subject ||
      (data.subject as string) ||
      `Notification from ${sender.name}`
    const html =
      content.html ||
      (data.html as string) ||
      `<p>${content.text || data.text || ""}</p>`
    const text =
      content.text ||
      (data.text as string) ||
      html.replace(/<[^>]+>/g, " ").trim()

    const attachments = Array.isArray(notification.attachments)
      ? notification.attachments.map((att: any) => ({
          filename: att.filename || "attachment.pdf",
          content: att.content,
          encoding: "base64" as const,
          contentType: att.content_type || "application/pdf",
        }))
      : []

    // 1. Optional HTTP Email API relay (Resend / Unsend / Postmark / Custom Webhook)
    const webhookUrl =
      this.options_.webhook_url || process.env.MAILER_HTTP_WEBHOOK_URL
    if (webhookUrl) {
      const urlCheck = validateSafeExternalUrl(webhookUrl, {
        allowLocalhost:
          this.options_.allow_localhost ??
          process.env.NODE_ENV !== "production",
      })
      if (!urlCheck.valid) {
        throw new Error(`Unsafe Email Webhook URL: ${urlCheck.reason}`)
      }
      const apiKey = this.options_.api_key || process.env.MAILER_HTTP_API_KEY
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          from: fromHeader,
          to: [to],
          reply_to: sender.replyTo,
          subject,
          html,
          text,
          attachments,
        }),
      })

      if (!response.ok) {
        throw new Error(`Email HTTP relay failed with status ${response.status}`)
      }
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        any
      >
      return {
        id: String(body.id || body.messageId || `email_http_${Date.now()}`),
      }
    }

    // 2. Nodemailer SMTP transport (if configured & available)
    const smtpHost = this.options_.host || process.env.MAILER_SMTP_HOST
    const smtpUser = this.options_.user || process.env.MAILER_SMTP_USER
    const smtpPass = this.options_.pass || process.env.MAILER_SMTP_PASS
    const smtpPort = Number(
      this.options_.port || process.env.MAILER_SMTP_PORT || 587
    )
    const smtpSecure =
      this.options_.secure ??
      (process.env.MAILER_SMTP_SECURE === "true" || smtpPort === 465)

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const dynamicImport = new Function("specifier", "return import(specifier)")
        const nodemailerMod: any = await dynamicImport("nodemailer")
        const nodemailer = nodemailerMod.default || nodemailerMod
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })

        const info = await transporter.sendMail({
          from: fromHeader,
          to,
          replyTo: sender.replyTo,
          subject,
          text,
          html,
          attachments,
        })

        return {
          id: String(info?.messageId || `smtp_${Date.now()}`),
        }
      } catch (err: any) {
        this.logger_?.warn(
          `[mpn-email] SMTP send error: ${err?.message || "Unknown SMTP error"}`
        )
        throw err
      }
    }

    // 3. Graceful fallback when SMTP is not configured in local dev (matches @sam-ael/medusa-plugin-mailer)
    this.logger_?.warn(
      "[mpn-email] SMTP environment variables are not fully configured; skipping live SMTP dispatch and returning dry-run ID."
    )
    return {
      id: `email_dryrun_${Date.now()}`,
    }
  }
}

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SmtpEmailNotificationProviderService],
})

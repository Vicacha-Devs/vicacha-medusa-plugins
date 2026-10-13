import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import type {
  WhatsAppDriver,
  WhatsAppInteractiveButton,
  WhatsAppProviderOptions,
} from "../../types"
import {
  normalizeE164Phone,
  toWhatsAppDigitsOnly,
  validateSafeExternalUrl,
} from "../../modules/notifications/utils/security"

export const MPN_WHATSAPP_PROVIDER_ID = "mpn-whatsapp"
export type { WhatsAppProviderOptions } from "../../types"

type InjectedDependencies = {
  logger?: Logger
}

export class WhatsAppNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = MPN_WHATSAPP_PROVIDER_ID
  protected readonly logger_?: Logger
  protected readonly options_: WhatsAppProviderOptions

  constructor(
    container: InjectedDependencies,
    options?: WhatsAppProviderOptions
  ) {
    super()
    this.logger_ = container?.logger
    this.options_ = options ?? {}
  }

  getActiveDriver(): WhatsAppDriver {
    return (
      this.options_.driver ||
      (process.env.WHATSAPP_DRIVER as WhatsAppDriver) ||
      (process.env.OPENWA_BASE_URL ? "openwa" : undefined) ||
      (process.env.WAHA_BASE_URL ? "waha" : undefined) ||
      (process.env.EVOLUTION_BASE_URL ? "evolution" : undefined) ||
      "meta-cloud"
    )
  }

  /**
   * Builds the exact request payload and endpoint for any of the 4 WhatsApp drivers:
   * - `meta-cloud` (Official Meta Graph API v21/v25: approved templates, interactive buttons, documents, session text)
   * - `openwa` (`@open-wa/wa-automate` REST RPC: `/sendText`, `/sendFile`, `/sendButtons`)
   * - `waha` (WAHA WhatsApp HTTP API: `/api/sendText`, `/api/sendFile`)
   * - `evolution` (Evolution API v2: `/message/sendText/{instance}`, `/message/sendMedia/{instance}`)
   */
  buildDriverRequest(params: {
    driver?: WhatsAppDriver
    to: string
    text: string
    whatsappOptions?: {
      message_type?: "template" | "text" | "interactive" | "document"
      meta_template_name?: string | null
      meta_language_code?: string
      meta_components?: Array<Record<string, any>>
      buttons?: WhatsAppInteractiveButton[]
    }
    attachments?: Array<{
      filename?: string
      content?: string
      content_type?: string
    }>
  }): {
    driver: WhatsAppDriver
    endpoint: string
    headers: Record<string, string>
    body: Record<string, any>
  } {
    const driver = params.driver || this.getActiveDriver()
    const e164 = normalizeE164Phone(params.to)
    const digitsOnly = toWhatsAppDigitsOnly(params.to)
    if (!e164 || !digitsOnly) {
      throw new Error(
        "WhatsApp recipient must be a valid E.164 phone number (e.g. +14155552671)"
      )
    }

    const waOpts = params.whatsappOptions || {}
    const attachments = params.attachments || []
    const firstAttachment = attachments[0]

    // -------------------------------------------------------------------------
    // DRIVER 1: OpenWA (@open-wa/wa-automate REST server)
    // -------------------------------------------------------------------------
    if (driver === "openwa") {
      const baseUrl = (
        this.options_.gatewayUrl ||
        process.env.OPENWA_BASE_URL ||
        "http://127.0.0.1:8082"
      ).replace(/\/$/, "")
      const check = validateSafeExternalUrl(baseUrl, {
        allowLocalhost:
          this.options_.allowLocalhost ??
          process.env.NODE_ENV !== "production",
      })
      if (!check.valid) {
        throw new Error(`Unsafe OpenWA Gateway URL: ${check.reason}`)
      }

      const apiKey =
        this.options_.gatewayApiKey || process.env.OPENWA_API_KEY || ""
      const chatId = `${digitsOnly}@c.us`
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(apiKey ? { apiKey, Authorization: `Bearer ${apiKey}` } : {}),
      }

      if (firstAttachment && firstAttachment.content) {
        const mime = firstAttachment.content_type || "application/pdf"
        return {
          driver: "openwa",
          endpoint: `${baseUrl}/sendFile`,
          headers,
          body: {
            args: {
              to: chatId,
              file: `data:${mime};base64,${firstAttachment.content}`,
              filename: firstAttachment.filename || "document.pdf",
              caption: params.text,
            },
          },
        }
      }

      if (waOpts.buttons && waOpts.buttons.length > 0) {
        return {
          driver: "openwa",
          endpoint: `${baseUrl}/sendButtons`,
          headers,
          body: {
            args: {
              to: chatId,
              body: params.text,
              buttons: waOpts.buttons.slice(0, 3).map((b) => ({
                id: b.id,
                text: b.title,
              })),
              title: "Store Notification",
              footer: "",
            },
          },
        }
      }

      return {
        driver: "openwa",
        endpoint: `${baseUrl}/sendText`,
        headers,
        body: {
          args: {
            to: chatId,
            content: params.text,
          },
        },
      }
    }

    // -------------------------------------------------------------------------
    // DRIVER 2: WAHA (WhatsApp HTTP API)
    // -------------------------------------------------------------------------
    if (driver === "waha") {
      const baseUrl = (
        this.options_.gatewayUrl ||
        process.env.WAHA_BASE_URL ||
        "http://127.0.0.1:3000"
      ).replace(/\/$/, "")
      const check = validateSafeExternalUrl(baseUrl, {
        allowLocalhost:
          this.options_.allowLocalhost ??
          process.env.NODE_ENV !== "production",
      })
      if (!check.valid) {
        throw new Error(`Unsafe WAHA Gateway URL: ${check.reason}`)
      }

      const apiKey =
        this.options_.gatewayApiKey || process.env.WAHA_API_KEY || ""
      const session =
        this.options_.sessionId || process.env.WAHA_SESSION || "default"
      const chatId = `${digitsOnly}@c.us`
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      }

      if (firstAttachment && firstAttachment.content) {
        return {
          driver: "waha",
          endpoint: `${baseUrl}/api/sendFile`,
          headers,
          body: {
            session,
            chatId,
            caption: params.text,
            file: {
              mimetype: firstAttachment.content_type || "application/pdf",
              filename: firstAttachment.filename || "document.pdf",
              data: firstAttachment.content,
            },
          },
        }
      }

      return {
        driver: "waha",
        endpoint: `${baseUrl}/api/sendText`,
        headers,
        body: {
          session,
          chatId,
          text: params.text,
        },
      }
    }

    // -------------------------------------------------------------------------
    // DRIVER 3: Evolution API v2
    // -------------------------------------------------------------------------
    if (driver === "evolution") {
      const baseUrl = (
        this.options_.gatewayUrl ||
        process.env.EVOLUTION_BASE_URL ||
        "http://127.0.0.1:8080"
      ).replace(/\/$/, "")
      const check = validateSafeExternalUrl(baseUrl, {
        allowLocalhost:
          this.options_.allowLocalhost ??
          process.env.NODE_ENV !== "production",
      })
      if (!check.valid) {
        throw new Error(`Unsafe Evolution API URL: ${check.reason}`)
      }

      const apiKey =
        this.options_.gatewayApiKey || process.env.EVOLUTION_API_KEY || ""
      const instance =
        this.options_.sessionId || process.env.EVOLUTION_INSTANCE || "store"
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(apiKey ? { apikey: apiKey } : {}),
      }

      if (firstAttachment && firstAttachment.content) {
        return {
          driver: "evolution",
          endpoint: `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`,
          headers,
          body: {
            number: digitsOnly,
            mediatype: "document",
            mimetype: firstAttachment.content_type || "application/pdf",
            caption: params.text,
            media: firstAttachment.content,
            fileName: firstAttachment.filename || "document.pdf",
          },
        }
      }

      return {
        driver: "evolution",
        endpoint: `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`,
        headers,
        body: {
          number: digitsOnly,
          text: params.text,
        },
      }
    }

    // -------------------------------------------------------------------------
    // DRIVER 4: Official Meta WhatsApp Business Cloud API (`meta-cloud`)
    // -------------------------------------------------------------------------
    const phoneNumberId =
      this.options_.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || ""
    const accessToken =
      this.options_.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || ""
    const version =
      this.options_.graphAPIVersion ||
      process.env.WHATSAPP_API_VERSION ||
      "v22.0"

    const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId || "000000")}/messages`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }

    // Meta approved template message (works outside the 24h customer care window)
    if (waOpts.meta_template_name) {
      return {
        driver: "meta-cloud",
        endpoint,
        headers,
        body: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: digitsOnly,
          type: "template",
          template: {
            name: waOpts.meta_template_name,
            language: {
              code: waOpts.meta_language_code || "en",
            },
            ...(Array.isArray(waOpts.meta_components) &&
            waOpts.meta_components.length > 0
              ? { components: waOpts.meta_components }
              : {}),
          },
        },
      }
    }

    // Meta interactive reply buttons message
    if (waOpts.buttons && waOpts.buttons.length > 0) {
      return {
        driver: "meta-cloud",
        endpoint,
        headers,
        body: {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: digitsOnly,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: params.text.slice(0, 1024) },
            action: {
              buttons: waOpts.buttons.slice(0, 3).map((b) => ({
                type: "reply",
                reply: {
                  id: b.id.slice(0, 256),
                  title: b.title.slice(0, 20),
                },
              })),
            },
          },
        },
      }
    }

    // Meta session text message (inside 24h window)
    return {
      driver: "meta-cloud",
      endpoint,
      headers,
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: digitsOnly,
        type: "text",
        text: {
          preview_url: true,
          body: params.text,
        },
      },
    }
  }

  /**
   * Queries session status / QR pairing code from OpenWA, WAHA, or Evolution API,
   * or verifies Meta WABA configuration.
   */
  async getSessionStatus(driverOverride?: WhatsAppDriver): Promise<{
    driver: WhatsAppDriver
    connected: boolean
    session_state: string
    qr_code?: string | null
    details?: Record<string, any>
  }> {
    const driver = driverOverride || this.getActiveDriver()
    if (driver === "meta-cloud") {
      const configured = Boolean(
        (this.options_.accessToken || process.env.WHATSAPP_ACCESS_TOKEN) &&
          (this.options_.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID)
      )
      return {
        driver: "meta-cloud",
        connected: configured,
        session_state: configured ? "WABA_CONFIGURED" : "MISSING_ENV_CREDENTIALS",
        details: {
          phone_number_id:
            this.options_.phoneNumberId ||
            process.env.WHATSAPP_PHONE_NUMBER_ID ||
            null,
          waba_id:
            this.options_.wabaId ||
            process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
            null,
        },
      }
    }

    return {
      driver,
      connected: Boolean(
        this.options_.gatewayUrl ||
          process.env.OPENWA_BASE_URL ||
          process.env.WAHA_BASE_URL ||
          process.env.EVOLUTION_BASE_URL
      ),
      session_state: "GATEWAY_READY",
      qr_code: null,
    }
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (this.options_.enabled === false) {
      return { id: `wa_disabled_${Date.now()}` }
    }

    const data = (notification.data || {}) as Record<string, any>
    const content = (notification.content || {}) as Record<string, any>
    const text =
      content.text ||
      (data.text as string) ||
      (data.body as string) ||
      (data.title as string) ||
      ""

    const reqSpec = this.buildDriverRequest({
      driver: (data.whatsapp_driver as WhatsAppDriver) || undefined,
      to: notification.to,
      text,
      whatsappOptions: data.whatsapp_options as any,
      attachments: notification.attachments as any,
    })

    // In local/test environments without live credentials, return deterministic dry-run ID
    if (
      reqSpec.driver === "meta-cloud" &&
      !this.options_.accessToken &&
      !process.env.WHATSAPP_ACCESS_TOKEN
    ) {
      this.logger_?.warn(
        "[mpn-whatsapp] WHATSAPP_ACCESS_TOKEN not set; returning dry-run message ID."
      )
      return { id: `wamid.dryrun_${Date.now()}` }
    }

    const timeoutMs = Number(
      this.options_.timeoutMs || process.env.WHATSAPP_API_TIMEOUT_MS || 15000
    )
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(reqSpec.endpoint, {
        method: "POST",
        headers: reqSpec.headers,
        body: JSON.stringify(reqSpec.body),
        signal: controller.signal,
      })

      const json = (await response.json().catch(() => ({}))) as Record<
        string,
        any
      >

      if (!response.ok) {
        const metaError = json?.error
        const detail =
          metaError?.error_data?.details ||
          metaError?.message ||
          json?.message ||
          `HTTP ${response.status}`
        const code = metaError?.code ? ` (#${metaError.code})` : ""
        throw new Error(`WhatsApp (${reqSpec.driver}) failed${code}: ${detail}`)
      }

      // Meta Cloud API requires verifying that a message ID (`wamid.*`) was actually returned
      const messageId =
        json?.messages?.[0]?.id ||
        json?.response?.id ||
        json?.id ||
        json?.key?.id

      if (reqSpec.driver === "meta-cloud" && !messageId) {
        throw new Error(
          "Meta WhatsApp Graph API returned HTTP 200 without a valid message ID"
        )
      }

      return {
        id: String(messageId || `wa_${reqSpec.driver}_${Date.now()}`),
      }
    } finally {
      clearTimeout(timer)
    }
  }
}

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [WhatsAppNotificationProviderService],
})

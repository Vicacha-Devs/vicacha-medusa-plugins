import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import type { SmsDriver, SmsProviderOptions } from "../../types"
import {
  calculateSmsSegments,
  normalizeE164Phone,
  validateSafeExternalUrl,
} from "../../modules/notifications/utils/security"

export const MPN_SMS_PROVIDER_ID = "mpn-sms"
export type { SmsProviderOptions } from "../../types"

type InjectedDependencies = {
  logger?: Logger
}

export class SmsNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = MPN_SMS_PROVIDER_ID
  protected readonly logger_?: Logger
  protected readonly options_: SmsProviderOptions

  constructor(container: InjectedDependencies, options?: SmsProviderOptions) {
    super()
    this.logger_ = container?.logger
    this.options_ = options ?? {}
  }

  getActiveDriver(): SmsDriver {
    return (
      this.options_.driver ||
      (process.env.SMS_DRIVER as SmsDriver) ||
      (process.env.SIGNALHOUSE_API_KEY ? "signalhouse" : undefined) ||
      (process.env.MSG91_AUTH_KEY ? "msg91" : undefined) ||
      (process.env.SMSAPI_TOKEN ? "smsapi" : undefined) ||
      (process.env.TWILIO_ACCOUNT_SID ? "twilio" : undefined) ||
      "twilio"
    )
  }

  /**
   * Distinguishes permanent Twilio validation errors (`20000`–`21999` except `20429`, or HTTP 400)
   * from transient network/rate-limit errors so retries are only performed when appropriate.
   */
  isRetryableSmsError(err: any): boolean {
    const code = Number(err?.code || err?.status || 0)
    if (code >= 20000 && code <= 21999 && code !== 20429) {
      return false
    }
    if (code === 400 || code === 401 || code === 403 || code === 422) {
      return false
    }
    return true
  }

  buildDriverRequest(params: {
    driver?: SmsDriver
    to: string
    text: string
    mediaUrls?: string[]
    fromOverride?: string
  }): {
    driver: SmsDriver
    endpoint: string
    headers: Record<string, string>
    body: string | Record<string, any>
    isFormEncoded?: boolean
  } {
    const driver = params.driver || this.getActiveDriver()
    const e164 = normalizeE164Phone(params.to)
    if (!e164) {
      const err: any = new Error(
        `Invalid E.164 phone number '${params.to}'. Expected format +1234567890.`
      )
      err.code = 20001
      throw err
    }

    // Validate optional MMS media URLs
    const validMediaUrls: string[] = []
    if (Array.isArray(params.mediaUrls)) {
      for (const rawMedia of params.mediaUrls) {
        const check = validateSafeExternalUrl(rawMedia, {
          allowLocalhost: false,
        })
        if (check.valid) {
          validMediaUrls.push(rawMedia.trim())
        }
      }
    }

    // 1. Signal House (@signalhouse-sms/medusa-plugin)
    if (driver === "signalhouse") {
      const baseUrl = (
        this.options_.signalhouse_base_url ||
        process.env.SIGNALHOUSE_API_BASE_URL ||
        "https://v2.signalhouse.io"
      ).replace(/\/$/, "")
      const apiKey =
        this.options_.signalhouse_api_key ||
        process.env.SIGNALHOUSE_API_KEY ||
        ""
      const from =
        params.fromOverride ||
        this.options_.signalhouse_sender_number ||
        process.env.SIGNALHOUSE_SENDER_NUMBER ||
        "+15550000000"

      return {
        driver: "signalhouse",
        endpoint: `${baseUrl}/message/sendSMS`,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: {
          to: e164,
          from,
          message: params.text,
          ...(validMediaUrls.length > 0 ? { mediaUrl: validMediaUrls } : {}),
        },
      }
    }

    // 2. MSG91 Flow API
    if (driver === "msg91") {
      const authKey =
        this.options_.msg91_auth_key || process.env.MSG91_AUTH_KEY || ""
      const flowId =
        this.options_.msg91_flow_id || process.env.MSG91_FLOW_ID || "flow_default"
      const senderId =
        this.options_.msg91_sender_id || process.env.MSG91_SENDER_ID || "MEDUSA"

      return {
        driver: "msg91",
        endpoint: "https://control.msg91.com/api/v5/flow/",
        headers: {
          "Content-Type": "application/json",
          ...(authKey ? { authkey: authKey } : {}),
        },
        body: {
          flow_id: flowId,
          sender: senderId,
          mobiles: e164.slice(1),
          message: params.text,
        },
      }
    }

    // 3. SMSAPI (@yanchesky/medusa-smsapi)
    if (driver === "smsapi") {
      const token =
        this.options_.smsapi_token || process.env.SMSAPI_TOKEN || ""
      const from =
        this.options_.smsapi_from || process.env.SMSAPI_FROM || "Medusa"
      return {
        driver: "smsapi",
        endpoint: "https://api.smsapi.com/sms.do",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: {
          to: e164.slice(1),
          from,
          message: params.text,
          format: "json",
        },
      }
    }

    // 4. Generic HTTP Webhook SMS Gateway
    if (driver === "webhook") {
      const webhookUrl =
        this.options_.webhook_url || process.env.SMS_WEBHOOK_URL || ""
      const check = validateSafeExternalUrl(webhookUrl, {
        allowLocalhost:
          this.options_.allow_localhost ??
          process.env.NODE_ENV !== "production",
      })
      if (!check.valid) {
        throw new Error(`Unsafe SMS Webhook URL: ${check.reason}`)
      }
      const apiKey =
        this.options_.webhook_api_key || process.env.SMS_WEBHOOK_API_KEY || ""
      return {
        driver: "webhook",
        endpoint: webhookUrl,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: {
          to: e164,
          text: params.text,
          mediaUrls: validMediaUrls,
        },
      }
    }

    // 5. Twilio SMS / MMS (medusa-twilio-sms v2.0.2 compatible)
    const accountSid =
      this.options_.account_sid || process.env.TWILIO_ACCOUNT_SID || "AC000000"
    const authToken =
      this.options_.auth_token || process.env.TWILIO_AUTH_TOKEN || ""
    const fromNumber =
      params.fromOverride ||
      this.options_.from_number ||
      process.env.TWILIO_FROM_NUMBER
    const messagingServiceSid =
      this.options_.messaging_service_sid ||
      process.env.TWILIO_MESSAGE_SERVICE_SID

    const formParams = new URLSearchParams()
    formParams.set("To", e164)
    formParams.set("Body", params.text)
    if (messagingServiceSid && !fromNumber) {
      formParams.set("MessagingServiceSid", messagingServiceSid)
    } else {
      formParams.set("From", fromNumber || "+15550000000")
    }
    for (const mUrl of validMediaUrls) {
      formParams.append("MediaUrl", mUrl)
    }

    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64"
    )
    return {
      driver: "twilio",
      endpoint: `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(authToken ? { Authorization: `Basic ${basicAuth}` } : {}),
      },
      body: formParams.toString(),
      isFormEncoded: true,
    }
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const data = (notification.data || {}) as Record<string, any>
    const content = (notification.content || {}) as Record<string, any>
    const text =
      content.text || (data.text as string) || (data.body as string) || ""

    const mediaUrls: string[] = Array.isArray(data.mediaUrl)
      ? data.mediaUrl
      : Array.isArray(data.sms_options?.media_urls)
        ? data.sms_options.media_urls
        : []

    const reqSpec = this.buildDriverRequest({
      driver: (data.sms_driver as SmsDriver) || undefined,
      to: notification.to,
      text,
      mediaUrls,
      fromOverride: (notification as any).from || (data.from as string),
    })

    const segInfo = calculateSmsSegments(text)

    // In local/test environments without live carrier credentials, return dry-run ID
    if (
      (reqSpec.driver === "twilio" &&
        !this.options_.auth_token &&
        !process.env.TWILIO_AUTH_TOKEN) ||
      (reqSpec.driver === "signalhouse" &&
        !this.options_.signalhouse_api_key &&
        !process.env.SIGNALHOUSE_API_KEY) ||
      reqSpec.driver === "dummy"
    ) {
      this.logger_?.info(
        `[mpn-sms] Dry-run SMS (${reqSpec.driver}, ${segInfo.encoding}, ${segInfo.segments} seg)`
      )
      return {
        id: `sms_dryrun_${reqSpec.driver}_${Date.now()}`,
      }
    }

    const maxRetries = Math.max(1, Number(this.options_.max_retries ?? 3))
    const baseDelayMs = Math.max(50, Number(this.options_.retry_delay ?? 500))

    let lastError: any
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(reqSpec.endpoint, {
          method: "POST",
          headers: reqSpec.headers,
          body:
            typeof reqSpec.body === "string"
              ? reqSpec.body
              : JSON.stringify(reqSpec.body),
        })

        const json = (await response.json().catch(() => ({}))) as Record<
          string,
          any
        >

        if (!response.ok) {
          const err: any = new Error(
            json.message ||
              json.error_message ||
              `SMS (${reqSpec.driver}) failed with HTTP ${response.status}`
          )
          err.status = response.status
          err.code = json.code || response.status
          throw err
        }

        return {
          id: String(
            json.sid ||
              json.messageId ||
              json.id ||
              `sms_${reqSpec.driver}_${Date.now()}`
          ),
        }
      } catch (err: any) {
        lastError = err
        if (!this.isRetryableSmsError(err) || attempt === maxRetries) {
          break
        }
        const backoff = baseDelayMs * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, backoff))
      }
    }

    throw lastError
  }
}

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SmsNotificationProviderService],
})

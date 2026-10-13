import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import type { SlackProviderOptions } from "../../types"
import { validateSafeExternalUrl } from "../../modules/notifications/utils/security"

export const MPN_SLACK_PROVIDER_ID = "mpn-slack"
export type { SlackProviderOptions } from "../../types"

type InjectedDependencies = {
  logger?: Logger
}

export class SlackNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = MPN_SLACK_PROVIDER_ID
  protected readonly logger_?: Logger
  protected readonly options_: SlackProviderOptions

  constructor(container: InjectedDependencies, options?: SlackProviderOptions) {
    super()
    this.logger_ = container?.logger
    this.options_ = options ?? {}
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const data = (notification.data || {}) as Record<string, any>
    const content = (notification.content || {}) as Record<string, any>
    const text =
      content.text ||
      (data.text as string) ||
      "Medusa Store Notification"
    const blocks = Array.isArray(data.blocks_json)
      ? data.blocks_json
      : Array.isArray(data.blocks)
        ? data.blocks
        : []

    const webhookUrl =
      (notification.to?.startsWith("http") ? notification.to : undefined) ||
      this.options_.webhook_url ||
      process.env.SLACK_WEBHOOK_URL

    if (!webhookUrl) {
      this.logger_?.warn(
        "[mpn-slack] SLACK_WEBHOOK_URL not configured; returning dry-run ID."
      )
      return { id: `slack_dryrun_${Date.now()}` }
    }

    const check = validateSafeExternalUrl(webhookUrl, {
      allowLocalhost:
        this.options_.allow_localhost ?? process.env.NODE_ENV !== "production",
    })
    if (!check.valid) {
      throw new Error(`Unsafe Slack Webhook URL: ${check.reason}`)
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        ...(blocks.length > 0 ? { blocks } : {}),
      }),
    })

    if (!response.ok) {
      throw new Error(`Slack webhook failed with HTTP ${response.status}`)
    }

    return {
      id: `slack_${Date.now()}`,
    }
  }
}

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SlackNotificationProviderService],
})

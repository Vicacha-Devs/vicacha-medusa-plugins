import { MedusaService } from "@medusajs/framework/utils"
import { getNotificationTranslations, normalizeLocale } from "./i18n"
import type { B2BNotificationContacts } from "./integrations/documents-and-b2b-resolver"
import {
  MpnBroadcastCampaign,
  MpnChannelConfig,
  MpnConsentRecord,
  MpnDeliveryLog,
  MpnEventMapping,
  MpnSandboxMessage,
  MpnTemplate,
  MpnTemplateBlock,
} from "./models"
import { renderNotificationTemplate } from "./renderer"
import {
  buildDefaultChannelConfig,
  mergeChannelConfigUpdate,
} from "./service-helpers/channel-config"
import {
  evaluateConsent,
  normalizeConsentIdentifier,
  parseConsentKeyword,
} from "./service-helpers/consent"
import {
  buildDeliveryLogRow,
  type DeliveryLogParams,
} from "./service-helpers/delivery-log"
import { evaluateEventConditions } from "./service-helpers/event-conditions"
import {
  loadExternalTemplates,
  type LoadedExternalTemplate,
  type ModuleLogger,
} from "./service-helpers/external-templates"
import { resolveRecipientForRule } from "./service-helpers/recipient-resolution"
import { resolveSenderProfiles } from "./service-helpers/sender-profiles"
import {
  buildClonedTemplateRow,
  createBlocksFromInput,
  createPresetBlocks,
  type BlockInput,
} from "./service-helpers/template-blocks"
import {
  listExternalTemplates,
  listSystemTemplates,
  mergeTemplateTranslations,
  resolveExternalTemplate,
  resolveSystemPreset,
  type TemplateListFilters,
} from "./service-helpers/template-catalog"
import {
  buildRenderInput,
  renderWithExternalService,
  type RenderTemplateByIdParams,
} from "./service-helpers/template-render"
import type {
  EventMappingCondition,
  NotificationChannel,
  NotificationsPluginOptions,
  RecipientRule,
  RenderedNotificationPayload,
  SenderProfileConfig,
  TemplateBlockNode,
} from "./types"
import { buildIdempotencyKey, ChannelRateLimiter, extractOtpCode } from "./utils/security"
import {
  buildBlockTreeFromFlatBlocks,
  getSystemPresetById,
} from "./utils/system-presets"
import { getMockContextByType } from "./utils/transformers"

type InjectedDependencies = {
  logger?: ModuleLogger
  [key: string]: unknown
}

export class NotificationsModuleService extends MedusaService({
  MpnTemplate,
  MpnTemplateBlock,
  MpnEventMapping,
  MpnDeliveryLog,
  MpnConsentRecord,
  MpnBroadcastCampaign,
  MpnChannelConfig,
  MpnSandboxMessage,
}) {
  protected readonly options_: NotificationsPluginOptions
  protected readonly logger_?: InjectedDependencies["logger"]
  protected readonly externalTemplates_: Map<string, LoadedExternalTemplate>
  public readonly rateLimiter: ChannelRateLimiter

  constructor(
    container: InjectedDependencies,
    options?: NotificationsPluginOptions
  ) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.options_ = options ?? {}
    this.logger_ = container?.logger
    this.rateLimiter = new ChannelRateLimiter()
    this.externalTemplates_ = loadExternalTemplates(this.options_, this.logger_)
  }

  getPluginOptions(): NotificationsPluginOptions {
    return this.options_
  }

  getSenderProfiles(): SenderProfileConfig[] {
    return resolveSenderProfiles(this.options_)
  }

  /**
   * Lists all templates across System Presets (`system_*`), External Services (`external_*`), and Database (`mpntpl_*`).
   */
  async listAllTemplates(
    filters?: TemplateListFilters
  ): Promise<Array<Record<string, any>>> {
    const results: Array<Record<string, any>> = []

    if (!filters?.source || filters.source === "system") {
      results.push(...listSystemTemplates(filters))
    }

    if (!filters?.source || filters.source === "external") {
      results.push(
        ...listExternalTemplates(this.externalTemplates_, this.options_, filters)
      )
    }

    if (!filters?.source || filters.source === "db") {
      const dbQuery: Record<string, any> = {}
      if (filters?.channel) dbQuery.channel = filters.channel
      if (filters?.locale) dbQuery.locale = filters.locale
      const dbTemplates = await this.listMpnTemplates(dbQuery)
      for (const t of dbTemplates) {
        const blocks = await this.listMpnTemplateBlocks({ template_id: t.id })
        results.push({
          ...t,
          source: "db",
          blocks_count: blocks.length,
        })
      }
    }

    return results
  }

  /**
   * Retrieves a single template (System Preset, External Template, or DB Template) with its hierarchical block tree.
   */
  async getTemplateWithBlocks(templateId: string): Promise<{
    template: Record<string, any>
    blocks: TemplateBlockNode[]
    flatBlocks: Array<Record<string, any>>
  } | null> {
    if (!templateId) return null

    const extTpl = this.externalTemplates_.get(templateId)
    if (extTpl) return resolveExternalTemplate(extTpl)

    const preset = getSystemPresetById(templateId)
    if (preset) return resolveSystemPreset(preset)

    const dbList = await this.listMpnTemplates({ id: templateId })
    if (dbList.length === 0) {
      const byName = await this.listMpnTemplates({ name: templateId })
      if (byName.length === 0) return null
      dbList.push(byName[0])
    }

    const tpl = dbList[0]
    const flatBlocks = await this.listMpnTemplateBlocks({
      template_id: tpl.id,
    })
    return {
      template: { ...tpl, source: "db" },
      blocks: buildBlockTreeFromFlatBlocks(flatBlocks as any),
      flatBlocks,
    }
  }

  /**
   * 1-Click Clone: Copies a read-only `system_*` preset and its hierarchical block tree
   * into editable `mpn_template` + `mpn_template_block` database rows.
   */
  async cloneSystemPresetToDb(
    presetId: string,
    overrides?: {
      name?: string
      label?: string
      locale?: string
    }
  ): Promise<{
    template: Record<string, any>
    blocks: TemplateBlockNode[]
  }> {
    const preset = getSystemPresetById(presetId)
    if (!preset) {
      throw new Error(`System preset '${presetId}' not found`)
    }

    const createdTemplate = await this.createMpnTemplates(
      buildClonedTemplateRow(preset, overrides)
    )
    const createdBlocks = await createPresetBlocks(
      (data) => this.createMpnTemplateBlocks(data),
      createdTemplate.id,
      preset.blocks
    )

    return {
      template: { ...createdTemplate, source: "db" },
      blocks: buildBlockTreeFromFlatBlocks(createdBlocks as any),
    }
  }

  /**
   * Replaces all blocks for an editable DB template with a new list of blocks.
   */
  async replaceTemplateBlocks(
    templateId: string,
    blocks: BlockInput[]
  ): Promise<TemplateBlockNode[]> {
    const existing = await this.listMpnTemplateBlocks({
      template_id: templateId,
    })
    if (existing.length > 0) {
      await this.deleteMpnTemplateBlocks(existing.map((b: any) => b.id))
    }

    const created = await createBlocksFromInput(
      (data) => this.createMpnTemplateBlocks(data),
      templateId,
      blocks
    )
    return buildBlockTreeFromFlatBlocks(created as any)
  }

  /**
   * Renders any System, External, or DB template by ID against either provided entity data
   * or a mock context for `contextType`.
   */
  async renderTemplateById(
    params: RenderTemplateByIdParams
  ): Promise<RenderedNotificationPayload> {
    const locale = normalizeLocale(
      params.locale || this.options_.defaultLocale || "en"
    )
    const baseTranslations = getNotificationTranslations(
      locale,
      this.options_.customTranslations
    )

    const contextData =
      params.data ||
      getMockContextByType(params.context_type || "order", this.options_, locale)

    // Check external template service `render` callback first if prefixed with `external_` and not in `externalTemplates_`
    if (
      params.template_id.startsWith("external_") &&
      !this.externalTemplates_.has(params.template_id)
    ) {
      const external = await renderWithExternalService(
        this.options_,
        params,
        contextData,
        locale,
        baseTranslations
      )
      if (external) return external
    }

    const resolved = await this.getTemplateWithBlocks(params.template_id)
    if (!resolved) {
      throw new Error(`Template '${params.template_id}' not found`)
    }

    const { template, blocks } = resolved

    // Merge external template module translations (fallback to `en`) if provided
    const translations = mergeTemplateTranslations(
      baseTranslations,
      template.translations,
      locale
    )

    return renderNotificationTemplate(
      buildRenderInput({
        template,
        blocks,
        params,
        options: this.options_,
        locale,
        translations,
        contextData,
      })
    )
  }

  evaluateEventConditions(
    conditions: EventMappingCondition | null | undefined,
    data: Record<string, any>
  ): boolean {
    return evaluateEventConditions(conditions, data)
  }

  resolveRecipientForRule(params: {
    rule: RecipientRule | string
    custom_recipient?: string | null
    channel: NotificationChannel
    data: Record<string, any>
    b2b_contacts?: B2BNotificationContacts
    channel_config?: Record<string, any> | null
  }): string | null {
    return resolveRecipientForRule(params)
  }

  /**
   * TCPA / 10DLC / WhatsApp / Telegram Consent Ledger Manager.
   * Supports `JOIN` / `START` opt-ins and `STOP` / `UNSUBSCRIBE` / `CANCEL` / `END` / `QUIT` opt-outs.
   */
  async upsertConsent(params: {
    identifier: string
    channel: "sms" | "whatsapp" | "telegram"
    customer_id?: string | null
    action: "opt_in" | "opt_out"
    source?: string
    metadata?: Record<string, any>
  }): Promise<Record<string, any>> {
    const cleanId = normalizeConsentIdentifier(params.channel, params.identifier)
    const existing = await this.listMpnConsentRecords({
      identifier: cleanId,
      channel: params.channel,
    })

    const now = new Date()
    if (existing.length > 0) {
      const current = existing[0]
      return await this.updateMpnConsentRecords({
        id: current.id,
        customer_id: params.customer_id ?? current.customer_id,
        status: params.action === "opt_in" ? "opted_in" : "opted_out",
        source: params.source || current.source,
        opted_in_at: params.action === "opt_in" ? now : current.opted_in_at,
        opted_out_at: params.action === "opt_out" ? now : current.opted_out_at,
        metadata: {
          ...(current.metadata || {}),
          ...(params.metadata || {}),
        },
      })
    }

    return await this.createMpnConsentRecords({
      identifier: cleanId,
      channel: params.channel,
      customer_id: params.customer_id ?? null,
      status: params.action === "opt_in" ? "opted_in" : "opted_out",
      source: params.source || "checkout",
      first_message_sent: false,
      opted_in_at: params.action === "opt_in" ? now : null,
      opted_out_at: params.action === "opt_out" ? now : null,
      metadata: params.metadata ?? null,
    })
  }

  /**
   * Parses an inbound SMS/WhatsApp keyword reply (`JOIN`, `START`, `YES` vs `STOP`, `END`, `QUIT`, `CANCEL`, `UNSUBSCRIBE`)
   * and updates the consent ledger accordingly.
   */
  async processInboundConsentKeyword(params: {
    from: string
    body: string
    channel?: "sms" | "whatsapp"
  }): Promise<{
    handled: boolean
    action?: "opt_in" | "opt_out"
    record?: Record<string, any>
    autoReplyText?: string
  }> {
    const action = parseConsentKeyword(params.body)
    if (!action) return { handled: false }

    const channel = params.channel || "sms"
    const record = await this.upsertConsent({
      identifier: params.from,
      channel,
      action,
      source: action === "opt_in" ? "webhook_join" : "webhook_stop",
    })

    if (action === "opt_out") {
      return { handled: true, action, record }
    }

    const storeName =
      this.options_.storeName || process.env.STORE_NAME || "Medusa Store"
    return {
      handled: true,
      action,
      record,
      autoReplyText: `${storeName}: You are now opted in to receive notifications. Reply STOP at any time to opt out.`,
    }
  }

  /**
   * Checks whether sending is permitted for a recipient on SMS/WhatsApp based on consent state,
   * and indicates whether the `"Reply STOP to opt out."` footer should be appended.
   */
  async verifyRecipientConsent(params: {
    recipient: string
    channel: NotificationChannel
    requireExplicitOptIn?: boolean
  }): Promise<{
    allowed: boolean
    reason?: string
    appendStopFooter: boolean
    consentRecordId?: string
  }> {
    if (params.channel !== "sms" && params.channel !== "whatsapp") {
      return { allowed: true, appendStopFooter: false }
    }

    const cleanId = normalizeConsentIdentifier(params.channel, params.recipient)
    const records = await this.listMpnConsentRecords({
      identifier: cleanId,
      channel: params.channel,
    })
    return evaluateConsent(records, params, this.options_)
  }

  /**
   * Checks idempotency for `(event_name, entity_id, channel, template_id, recipient)`.
   * Returns `{ duplicate: true, existingLog }` if already `pending`, `sent`, or `delivered`.
   */
  async checkIdempotency(params: {
    event_name: string
    entity_id?: string | null
    channel: NotificationChannel
    template_id: string
    recipient: string
  }): Promise<{
    idempotencyKey: string
    duplicate: boolean
    existingLog?: Record<string, any>
  }> {
    const idempotencyKey = buildIdempotencyKey(params)
    const existing = await this.listMpnDeliveryLogs({
      idempotency_key: idempotencyKey,
    })

    const activeMatch = existing.find((row: any) =>
      ["pending", "sent", "delivered"].includes(row.status)
    )

    return {
      idempotencyKey,
      duplicate: Boolean(activeMatch),
      existingLog: activeMatch,
    }
  }

  /**
   * Records a delivery log entry with masked PII and redacted payload.
   */
  async recordDeliveryLog(
    params: DeliveryLogParams
  ): Promise<Record<string, any>> {
    return await this.createMpnDeliveryLogs(buildDeliveryLogRow(params))
  }

  /**
   * Captures a message in the Dummy Sandbox table (`mpn_sandbox_message`) and extracts any OTP code.
   */
  async captureSandboxMessage(params: {
    channel: NotificationChannel
    recipient: string
    sender?: string | null
    subject?: string | null
    body: string
    html?: string | null
    media_urls?: string[] | null
    attachments_meta?: Array<Record<string, any>> | null
    metadata?: Record<string, any> | null
  }): Promise<Record<string, any>> {
    const otpCode = extractOtpCode(params.body) || extractOtpCode(params.subject)
    return await this.createMpnSandboxMessages({
      channel: params.channel,
      recipient: params.recipient,
      sender: params.sender ?? null,
      subject: params.subject ?? null,
      body: params.body,
      html: params.html ?? null,
      otp_code: otpCode,
      media_urls: (params.media_urls as any) ?? null,
      attachments_meta: (params.attachments_meta as any) ?? null,
      metadata: params.metadata ?? null,
    })
  }

  /**
   * Retrieves or initializes non-secret operational configuration for a channel.
   */
  async getOrCreateChannelConfig(
    channel: NotificationChannel,
    defaultDriver = "default"
  ): Promise<Record<string, any>> {
    const existing = await this.listMpnChannelConfigs({ channel })
    if (existing.length > 0) {
      return existing[0]
    }
    return await this.createMpnChannelConfigs(
      buildDefaultChannelConfig(channel, defaultDriver)
    )
  }

  /**
   * Updates non-secret operational configuration for a channel.
   */
  async saveChannelConfig(params: {
    channel: NotificationChannel
    driver?: string
    is_enabled?: boolean
    is_verified?: boolean
    rate_limit_per_sec?: number
    config_json?: Record<string, any>
  }): Promise<Record<string, any>> {
    const current = await this.getOrCreateChannelConfig(
      params.channel,
      params.driver || "default"
    )
    const { nextConfigJson, isVerified } = mergeChannelConfigUpdate(
      current,
      params
    )

    return await this.updateMpnChannelConfigs({
      id: current.id,
      driver: params.driver ?? current.driver,
      is_enabled: params.is_enabled ?? current.is_enabled,
      is_verified: isVerified,
      verified_at: isVerified ? new Date() : current.verified_at,
      rate_limit_per_sec:
        params.rate_limit_per_sec ?? current.rate_limit_per_sec,
      config_json: nextConfigJson,
    })
  }

  /**
   * Deletes delivery logs older than `retentionDays` (default 30 days).
   */
  async pruneExpiredDeliveryLogs(retentionDays?: number): Promise<number> {
    const days =
      retentionDays ??
      this.options_.logRetentionDays ??
      Number(process.env.WHATSAPP_LOG_RETENTION_DAYS || 30)
    const cutoff = new Date(Date.now() - Math.max(1, days) * 86400 * 1000)

    const allLogs = await this.listMpnDeliveryLogs({})
    const expiredIds = allLogs
      .filter((row: any) => row.created_at && new Date(row.created_at) < cutoff)
      .map((row: any) => row.id)

    if (expiredIds.length > 0) {
      await this.deleteMpnDeliveryLogs(expiredIds)
    }
    return expiredIds.length
  }
}

export default NotificationsModuleService

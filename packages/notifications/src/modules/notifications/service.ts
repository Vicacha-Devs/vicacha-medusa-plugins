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
import type {
  BlockType,
  ContextType,
  EventMappingCondition,
  NotificationAttachment,
  NotificationChannel,
  NotificationsPluginOptions,
  RecipientRule,
  RenderedNotificationPayload,
  SenderProfileConfig,
  TemplateBlockNode,
  TemplateMode,
} from "./types"
import {
  buildIdempotencyKey,
  ChannelRateLimiter,
  extractOtpCode,
  hashRecipient,
  maskRecipientPii,
  normalizeE164Phone,
  redactSensitivePayload,
} from "./utils/security"
import {
  buildBlockTreeFromFlatBlocks,
  getSystemPresetById,
  SYSTEM_TEMPLATE_PRESETS,
} from "./utils/system-presets"
import { getMockContextByType } from "./utils/transformers"

type InjectedDependencies = Record<string, unknown>

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
  public readonly rateLimiter: ChannelRateLimiter

  constructor(
    container: InjectedDependencies,
    options?: NotificationsPluginOptions
  ) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.options_ = options ?? {}
    this.rateLimiter = new ChannelRateLimiter()
  }

  getPluginOptions(): NotificationsPluginOptions {
    return this.options_
  }

  /**
   * Resolves configured SMTP sender profiles (1..5) from environment variables (`@sam-ael/medusa-plugin-mailer` pattern).
   */
  getSenderProfiles(): SenderProfileConfig[] {
    const profiles: SenderProfileConfig[] = []
    for (let i = 1; i <= 5; i++) {
      const name = process.env[`MAILER_FROM_NAME_${i}`]
      const addr = process.env[`MAILER_FROM_ADDRESS_${i}`]
      if (addr) {
        profiles.push({
          index: i,
          name: name || this.options_.storeName || "Medusa Store",
          from_address: addr,
          reply_to: process.env[`MAILER_REPLY_TO_${i}`] || undefined,
        })
      }
    }
    if (profiles.length === 0) {
      profiles.push({
        index: 1,
        name:
          process.env.MAILER_FROM_NAME_1 ||
          this.options_.storeName ||
          "Medusa Store",
        from_address:
          process.env.MAILER_FROM_ADDRESS_1 ||
          process.env.SMTP_FROM ||
          "no-reply@example.com",
      })
    }
    return profiles
  }

  /**
   * Lists all templates across System Presets (`system_*`), External Services (`external_*`), and Database (`mpntpl_*`).
   */
  async listAllTemplates(filters?: {
    channel?: NotificationChannel
    source?: "system" | "db" | "external"
    locale?: string
  }): Promise<Array<Record<string, any>>> {
    const results: Array<Record<string, any>> = []

    if (!filters?.source || filters.source === "system") {
      for (const preset of SYSTEM_TEMPLATE_PRESETS) {
        if (filters?.channel && preset.channel !== filters.channel) {
          continue
        }
        results.push({
          id: preset.id,
          name: preset.name,
          label: preset.label,
          description: preset.description,
          channel: preset.channel,
          mode: preset.mode,
          locale: filters?.locale || "en",
          subject: preset.subject ?? null,
          raw_content: preset.raw_content ?? null,
          variable_map: preset.variable_map ?? null,
          meta_template_name: preset.meta_template_name ?? null,
          meta_language_code: preset.meta_language_code ?? null,
          is_active: true,
          source: "system",
          default_event: preset.default_event,
          blocks_count: preset.blocks.length,
        })
      }
    }

    if (!filters?.source || filters.source === "external") {
      const extServices = this.options_.extend?.services || []
      for (const svc of extServices) {
        if (filters?.channel && svc.channel !== filters.channel) continue
        const templates = svc.getSystemTemplates ? svc.getSystemTemplates() : []
        for (const tpl of templates) {
          results.push({
            ...tpl,
            id: tpl.id.startsWith("external_") ? tpl.id : `external_${tpl.id}`,
            source: "external",
            mode: "raw",
            is_active: true,
          })
        }
      }
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
   * Retrieves a single template (System Preset or DB Template) with its hierarchical block tree.
   */
  async getTemplateWithBlocks(templateId: string): Promise<{
    template: Record<string, any>
    blocks: TemplateBlockNode[]
    flatBlocks: Array<Record<string, any>>
  } | null> {
    if (!templateId) return null

    const preset = getSystemPresetById(templateId)
    if (preset) {
      return {
        template: {
          id: preset.id,
          name: preset.name,
          label: preset.label,
          description: preset.description,
          channel: preset.channel,
          mode: preset.mode,
          locale: "en",
          subject: preset.subject ?? null,
          raw_content: preset.raw_content ?? null,
          variable_map: preset.variable_map ?? null,
          meta_template_name: preset.meta_template_name ?? null,
          meta_language_code: preset.meta_language_code ?? null,
          is_active: true,
          source: "system",
        },
        blocks: buildBlockTreeFromFlatBlocks(preset.blocks),
        flatBlocks: preset.blocks,
      }
    }

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

    const createdTemplate = await this.createMpnTemplates({
      name: overrides?.name || `${preset.name}-custom`,
      label: overrides?.label || `${preset.label} (Custom)`,
      description: preset.description,
      channel: preset.channel,
      mode: preset.mode,
      locale: normalizeLocale(overrides?.locale || "en"),
      subject: preset.subject ?? null,
      raw_content: preset.raw_content ?? null,
      variable_map: preset.variable_map ?? null,
      meta_template_name: preset.meta_template_name ?? null,
      meta_language_code: preset.meta_language_code ?? null,
      source_preset_id: preset.id,
      is_active: true,
    })

    // Map preset block IDs to newly created DB block IDs while preserving parent_id relationships
    const oldToNewId = new Map<string, string>()
    const createdBlocks: Array<Record<string, any>> = []

    const sortedBlocks = [...preset.blocks].sort(
      (a, b) => a.position - b.position
    )

    // Pass 1: root blocks
    for (const blk of sortedBlocks.filter((b) => !b.parent_id)) {
      const row = await this.createMpnTemplateBlocks({
        template_id: createdTemplate.id,
        type: blk.type,
        position: blk.position,
        parent_id: null,
        metadata: blk.metadata,
      })
      oldToNewId.set(blk.id, row.id)
      createdBlocks.push(row)
    }

    // Pass 2: child blocks
    for (const blk of sortedBlocks.filter((b) => Boolean(b.parent_id))) {
      const mappedParentId = blk.parent_id
        ? oldToNewId.get(blk.parent_id) || null
        : null
      const row = await this.createMpnTemplateBlocks({
        template_id: createdTemplate.id,
        type: blk.type,
        position: blk.position,
        parent_id: mappedParentId,
        metadata: blk.metadata,
      })
      oldToNewId.set(blk.id, row.id)
      createdBlocks.push(row)
    }

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
    blocks: Array<{
      id?: string
      type?: BlockType
      position?: number
      parent_id?: string | null
      metadata?: Record<string, any>
    }>
  ): Promise<TemplateBlockNode[]> {
    const existing = await this.listMpnTemplateBlocks({
      template_id: templateId,
    })
    if (existing.length > 0) {
      await this.deleteMpnTemplateBlocks(existing.map((b: any) => b.id))
    }

    const clientIdToDbId = new Map<string, string>()
    const created: Array<Record<string, any>> = []

    const roots = blocks.filter((b) => !b.parent_id)
    const children = blocks.filter((b) => Boolean(b.parent_id))

    for (let i = 0; i < roots.length; i++) {
      const blk = roots[i]
      const row = await this.createMpnTemplateBlocks({
        template_id: templateId,
        type: blk.type || "text",
        position: blk.position ?? i,
        parent_id: null,
        metadata: blk.metadata ?? {},
      })
      if (blk.id) clientIdToDbId.set(blk.id, row.id)
      created.push(row)
    }

    for (let i = 0; i < children.length; i++) {
      const blk = children[i]
      const parentId = blk.parent_id
        ? clientIdToDbId.get(blk.parent_id) || blk.parent_id
        : null
      const row = await this.createMpnTemplateBlocks({
        template_id: templateId,
        type: blk.type || "text",
        position: blk.position ?? i,
        parent_id: parentId,
        metadata: blk.metadata ?? {},
      })
      if (blk.id) clientIdToDbId.set(blk.id, row.id)
      created.push(row)
    }

    return buildBlockTreeFromFlatBlocks(created as any)
  }

  /**
   * Renders any System, External, or DB template by ID against either provided entity data
   * or a mock context for `contextType`.
   */
  async renderTemplateById(params: {
    template_id: string
    context_type?: ContextType
    data?: Record<string, any>
    locale?: string | null
    variable_map_override?: Record<string, string> | null
    telegram_thread_id?: number | null
    attachments?: NotificationAttachment[]
    append_sms_consent_footer?: boolean
  }): Promise<RenderedNotificationPayload> {
    const locale = normalizeLocale(
      params.locale || this.options_.defaultLocale || "en"
    )
    const translations = getNotificationTranslations(
      locale,
      this.options_.customTranslations
    )

    const contextData =
      params.data ||
      getMockContextByType(params.context_type || "order", this.options_, locale)

    // Check external template service first if prefixed with `external_`
    if (params.template_id.startsWith("external_")) {
      const extServices = this.options_.extend?.services || []
      for (const svc of extServices) {
        const res = await svc.render({
          templateId: params.template_id,
          context: contextData,
          locale,
          translations,
        })
        if (res && res.text) {
          return {
            channel: svc.channel,
            template_id: params.template_id,
            template_name: params.template_id,
            locale,
            text: res.text,
            ...res,
          }
        }
      }
    }

    const resolved = await this.getTemplateWithBlocks(params.template_id)
    if (!resolved) {
      throw new Error(`Template '${params.template_id}' not found`)
    }

    const { template, blocks } = resolved
    const mergedVariableMap = {
      ...(template.variable_map || {}),
      ...(params.variable_map_override || {}),
    }

    return renderNotificationTemplate({
      template_id: template.id,
      template_name: template.name,
      channel: template.channel as NotificationChannel,
      mode: (template.mode || "blocks") as TemplateMode,
      locale: params.locale || template.locale || locale,
      subject: template.subject,
      raw_content: template.raw_content,
      blocks,
      variable_map: mergedVariableMap,
      meta_template_name: template.meta_template_name,
      meta_language_code: template.meta_language_code || locale,
      styles: template.styles,
      data: contextData,
      translations,
      pluginOptions: this.options_,
      attachments: params.attachments,
      telegram_thread_id: params.telegram_thread_id,
      append_sms_consent_footer: params.append_sms_consent_footer,
    })
  }

  /**
   * Evaluates whether an Event Mapping's conditional filters match the current entity context.
   */
  evaluateEventConditions(
    conditions: EventMappingCondition | null | undefined,
    data: Record<string, any>
  ): boolean {
    if (!conditions || typeof conditions !== "object") {
      return true
    }

    if (
      Array.isArray(conditions.region_ids) &&
      conditions.region_ids.length > 0
    ) {
      const regionId = data.region_id || data.region?.id
      if (!regionId || !conditions.region_ids.includes(regionId)) {
        return false
      }
    }

    if (
      Array.isArray(conditions.sales_channel_ids) &&
      conditions.sales_channel_ids.length > 0
    ) {
      const scId = data.sales_channel_id
      if (!scId || !conditions.sales_channel_ids.includes(scId)) {
        return false
      }
    }

    if (
      Array.isArray(conditions.currency_codes) &&
      conditions.currency_codes.length > 0
    ) {
      const code = String(data.currency_code || "").toUpperCase()
      const allowed = conditions.currency_codes.map((c) => c.toUpperCase())
      if (!code || !allowed.includes(code)) {
        return false
      }
    }

    if (
      typeof conditions.min_order_total === "number" &&
      conditions.min_order_total > 0
    ) {
      const total = Number(data.total ?? 0)
      if (total < conditions.min_order_total) {
        return false
      }
    }

    if (
      Array.isArray(conditions.document_types) &&
      conditions.document_types.length > 0
    ) {
      const docType = data.document_type
      if (!docType || !conditions.document_types.includes(docType)) {
        return false
      }
    }

    return true
  }

  /**
   * Resolves the recipient address/phone/chat_id for a given `RecipientRule` and `NotificationChannel`.
   */
  resolveRecipientForRule(params: {
    rule: RecipientRule | string
    custom_recipient?: string | null
    channel: NotificationChannel
    data: Record<string, any>
    b2b_contacts?: B2BNotificationContacts
    channel_config?: Record<string, any> | null
  }): string | null {
    const { rule, custom_recipient, channel, data, b2b_contacts, channel_config } =
      params

    if (rule === "custom_recipient" && custom_recipient) {
      return custom_recipient.trim()
    }

    if (rule === "merchant_channel") {
      const cfgJson = channel_config?.config_json || {}
      return (
        custom_recipient?.trim() ||
        cfgJson.merchant_channel_id ||
        cfgJson.default_recipient ||
        process.env.TELEGRAM_MERCHANT_CHANNEL_ID ||
        process.env.SLACK_WEBHOOK_CHANNEL ||
        null
      )
    }

    if (rule === "b2b_accounting_contact") {
      if (channel === "email") {
        return (
          b2b_contacts?.accounting_email ||
          b2b_contacts?.buyer_contact_email ||
          data.email ||
          null
        )
      }
      if (channel === "sms" || channel === "whatsapp") {
        return normalizeE164Phone(b2b_contacts?.buyer_phone || data.phone)
      }
      if (channel === "telegram") {
        return b2b_contacts?.telegram_chat_id || data.customer?.telegram_chat_id || null
      }
    }

    if (rule === "order_email") {
      return data.email || data.customer?.email || null
    }
    if (rule === "customer_email") {
      return data.customer?.email || data.email || null
    }
    if (rule === "order_phone") {
      return normalizeE164Phone(
        data.phone ||
          data.shipping_address?.phone ||
          data.billing_address?.phone ||
          data.customer?.phone
      )
    }
    if (rule === "customer_phone") {
      return normalizeE164Phone(data.customer?.phone || data.phone)
    }
    if (rule === "customer_telegram") {
      return (
        data.customer?.telegram_chat_id ||
        data.telegram_chat_id ||
        b2b_contacts?.telegram_chat_id ||
        null
      )
    }

    // Default `customer_auto` resolution by channel
    switch (channel) {
      case "email":
        return data.email || data.customer?.email || null
      case "sms":
      case "whatsapp":
        return normalizeE164Phone(
          data.phone ||
            data.customer?.phone ||
            data.shipping_address?.phone ||
            data.billing_address?.phone
        )
      case "telegram":
        return (
          data.customer?.telegram_chat_id ||
          data.telegram_chat_id ||
          channel_config?.config_json?.merchant_channel_id ||
          process.env.TELEGRAM_MERCHANT_CHANNEL_ID ||
          null
        )
      case "slack":
        return (
          custom_recipient ||
          channel_config?.config_json?.webhook_url ||
          process.env.SLACK_WEBHOOK_URL ||
          "default-slack-channel"
        )
      case "dummy":
        return (
          normalizeE164Phone(data.phone || data.customer?.phone) ||
          data.email ||
          "sandbox-recipient"
        )
      default:
        return null
    }
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
    const cleanId =
      params.channel === "sms" || params.channel === "whatsapp"
        ? normalizeE164Phone(params.identifier) || params.identifier.trim()
        : params.identifier.trim()

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
    const keyword = (params.body || "").trim().toUpperCase()
    const channel = params.channel || "sms"

    if (["JOIN", "START", "OPTIN", "UNSTOP", "YES"].includes(keyword)) {
      const record = await this.upsertConsent({
        identifier: params.from,
        channel,
        action: "opt_in",
        source: "webhook_join",
      })
      const storeName =
        this.options_.storeName || process.env.STORE_NAME || "Medusa Store"
      return {
        handled: true,
        action: "opt_in",
        record,
        autoReplyText: `${storeName}: You are now opted in to receive notifications. Reply STOP at any time to opt out.`,
      }
    }

    if (["STOP", "END", "QUIT", "CANCEL", "UNSUBSCRIBE", "OPTOUT"].includes(keyword)) {
      const record = await this.upsertConsent({
        identifier: params.from,
        channel,
        action: "opt_out",
        source: "webhook_stop",
      })
      return {
        handled: true,
        action: "opt_out",
        record,
      }
    }

    return { handled: false }
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

    const cleanId =
      normalizeE164Phone(params.recipient) || params.recipient.trim()
    const records = await this.listMpnConsentRecords({
      identifier: cleanId,
      channel: params.channel,
    })

    if (records.length > 0) {
      const rec = records[0]
      if (rec.status === "opted_out") {
        return {
          allowed: false,
          reason: `Recipient opted out (${rec.source || "STOP"})`,
          appendStopFooter: false,
          consentRecordId: rec.id,
        }
      }
      if (rec.status === "opted_in") {
        return {
          allowed: true,
          appendStopFooter: !rec.first_message_sent && params.channel === "sms",
          consentRecordId: rec.id,
        }
      }
    }

    const strictConsent =
      params.requireExplicitOptIn ??
      (params.channel === "sms"
        ? Boolean(this.options_.requireSmsConsent)
        : Boolean(this.options_.requireWhatsAppConsent))

    if (strictConsent) {
      return {
        allowed: false,
        reason: "No active opt-in consent record found",
        appendStopFooter: false,
      }
    }

    return {
      allowed: true,
      appendStopFooter: params.channel === "sms",
    }
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
  async recordDeliveryLog(params: {
    idempotency_key: string
    event_name: string
    entity_id?: string | null
    channel: NotificationChannel
    provider_id?: string | null
    driver?: string | null
    template_id?: string | null
    mapping_id?: string | null
    recipient: string
    status: string
    attempts?: number
    external_message_id?: string | null
    payload?: unknown
    error_code?: string | null
    error_message?: string | null
  }): Promise<Record<string, any>> {
    return await this.createMpnDeliveryLogs({
      idempotency_key: params.idempotency_key,
      event_name: params.event_name,
      entity_id: params.entity_id ?? null,
      channel: params.channel,
      provider_id: params.provider_id ?? null,
      driver: params.driver ?? null,
      template_id: params.template_id ?? null,
      mapping_id: params.mapping_id ?? null,
      recipient_masked: maskRecipientPii(params.recipient),
      recipient_hash: hashRecipient(params.recipient),
      status: params.status,
      attempts: params.attempts ?? 1,
      external_message_id: params.external_message_id ?? null,
      payload_redacted: redactSensitivePayload(params.payload) as Record<
        string,
        any
      >,
      error_code: params.error_code ?? null,
      error_message: params.error_message ?? null,
      sent_at:
        params.status === "sent" || params.status === "delivered"
          ? new Date()
          : null,
      delivered_at: params.status === "delivered" ? new Date() : null,
    })
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
    const defaultRate =
      channel === "telegram"
        ? 30
        : channel === "whatsapp"
          ? Number(process.env.WHATSAPP_SEND_CONCURRENCY || 5)
          : 10
    return await this.createMpnChannelConfigs({
      channel,
      driver: defaultDriver,
      is_enabled: true,
      is_verified: channel === "email" || channel === "dummy",
      rate_limit_per_sec: defaultRate,
      config_json: {},
    })
  }

  /**
   * Updates non-secret operational configuration for a channel.
   * Resets `is_verified = false` for Telegram if `merchant_channel_id` changes (`medusa-notification-provider` pattern).
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
    const prevConfigJson = (current.config_json || {}) as Record<string, any>
    const nextConfigJson = params.config_json
      ? { ...prevConfigJson, ...params.config_json }
      : prevConfigJson

    // Strip any accidental secret fields before saving to DB
    for (const key of Object.keys(nextConfigJson)) {
      if (/(token|secret|password|api_key|private_key)/i.test(key)) {
        delete nextConfigJson[key]
      }
    }

    let isVerified =
      params.is_verified !== undefined ? params.is_verified : current.is_verified

    if (
      params.channel === "telegram" &&
      params.config_json?.merchant_channel_id &&
      params.config_json.merchant_channel_id !==
        prevConfigJson.merchant_channel_id &&
      params.is_verified === undefined
    ) {
      isVerified = false
    }

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

import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  Document,
  DocumentSettings,
  DocumentTemplate,
  SignatureRequest,
} from "./models"
import {
  AuditLogEntry,
  B2BBuyerContext,
  BUILTIN_PRESETS,
  DocumentRenderContext,
  DocumentsPluginOptions,
  DocumentType,
  SettingsSnapshot,
} from "./types"
import {
  DEFAULT_FORMAT_BY_TYPE,
  DEFAULT_PREFIX_BY_TYPE,
  formatDocumentNumber,
} from "./utils/numbering"
import { normalizeLocale } from "./i18n"
import { renderDocumentPdf, TemplateRenderTarget } from "./renderer"
import { DocusealService } from "./services/docuseal"
import { resolveB2BBuyerContext } from "./integrations/b2b-resolver"

type InjectedDependencies = Record<string, unknown>

class DocumentsModuleService extends MedusaService({
  Document,
  DocumentSettings,
  DocumentTemplate,
  SignatureRequest,
}) {
  protected readonly options_: DocumentsPluginOptions
  public readonly docuseal: DocusealService

  constructor(
    container: InjectedDependencies,
    options?: DocumentsPluginOptions
  ) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.options_ = options ?? {}
    this.docuseal = new DocusealService(this.options_.docuseal)
  }

  async getPluginOptions(): Promise<DocumentsPluginOptions> {
    return this.options_
  }

  /**
   * Retrieves the global default settings row (`region_id = null`),
   * creating it with sensible defaults if none exists yet.
   */
  async getGlobalSettings(): Promise<Record<string, any>> {
    const existing = await this.listDocumentSettings({
      region_id: null,
    })
    if (existing.length > 0) {
      return existing[0]
    }

    return await this.createDocumentSettings({
      region_id: null,
      company_name: "My Store",
      company_address: "",
      invoice_prefix: "INV",
      invoice_number_format: "INV-{year}-{number}",
      next_invoice_number: 1,
      packing_slip_prefix: "PS",
      packing_slip_number_format: "PS-{year}-{number}",
      next_packing_slip_number: 1,
      credit_note_prefix: "CN",
      credit_note_number_format: "CN-{year}-{number}",
      next_credit_note_number: 1,
      receipt_prefix: "RCP",
      receipt_number_format: "RCP-{year}-{number}",
      next_receipt_number: 1,
      default_locale: "en",
    })
  }

  /**
   * Resolves settings for a specific region (`region_id`), falling back to the global
   * settings row (`region_id = null`) if no regional override exists (Phase 4).
   */
  async resolveSettings(
    regionId?: string | null
  ): Promise<Record<string, any>> {
    if (regionId && regionId.trim().length > 0) {
      const regional = await this.listDocumentSettings({
        region_id: regionId.trim(),
      })
      if (regional.length > 0) {
        return regional[0]
      }
    }
    return await this.getGlobalSettings()
  }

  /**
   * Creates or updates global (`regionId = null`) or regional (`regionId = "reg_..."`) settings.
   */
  async upsertSettings(
    payload: Record<string, unknown>,
    regionId?: string | null
  ): Promise<Record<string, any>> {
    const normalizedRegionId =
      regionId && regionId.trim().length > 0 && regionId !== "global"
        ? regionId.trim()
        : null

    const existing = await this.listDocumentSettings({
      region_id: normalizedRegionId,
    })

    const cleanPayload = { ...payload }
    delete cleanPayload.id
    delete cleanPayload.created_at
    delete cleanPayload.updated_at
    delete cleanPayload.deleted_at

    if (existing.length > 0) {
      return await this.updateDocumentSettings({
        id: existing[0].id,
        ...cleanPayload,
        region_id: normalizedRegionId,
      })
    }

    // Seed from global settings when creating a new region override
    const base =
      normalizedRegionId !== null ? await this.getGlobalSettings() : {}
    const baseCopy = { ...base }
    delete baseCopy.id
    delete baseCopy.created_at
    delete baseCopy.updated_at
    delete baseCopy.deleted_at

    return await this.createDocumentSettings({
      ...baseCopy,
      ...cleanPayload,
      region_id: normalizedRegionId,
    })
  }

  /**
   * Removes a region-specific settings override so that the region falls back to global settings.
   */
  async deleteRegionSettings(regionId: string): Promise<boolean> {
    if (!regionId || regionId === "global") {
      return false
    }
    const existing = await this.listDocumentSettings({
      region_id: regionId.trim(),
    })
    if (existing.length === 0) {
      return false
    }
    await this.deleteDocumentSettings(existing.map((r: any) => r.id))
    return true
  }

  /**
   * Atomically allocates the next sequential document number for a given `DocumentType`
   * and optional `regionId`, honoring `{type}_forced_next_number` and format tokens:
   * `{number}`, `{prefix}`, `{year}`, `{month}`, `{day}`, `{order_display_id}`.
   */
  async allocateNextDocumentNumber(
    documentType: DocumentType,
    options: {
      regionId?: string | null
      orderDisplayId?: string | number | null
      referenceDate?: Date
    } = {}
  ): Promise<{ documentNumber: string; sequenceNumber: number; settingsId: string }> {
    const settings = await this.resolveSettings(options.regionId)

    const prefixField = `${documentType}_prefix`
    const formatField = `${documentType}_number_format`
    const nextNumberField = `next_${documentType}_number`
    const forcedNextField = `${documentType}_forced_next_number`
    const paddingField = `${documentType}_number_padding`

    const forcedValue = settings[forcedNextField]
    const currentNext = Number(settings[nextNumberField] ?? 1)
    const sequenceNumber =
      typeof forcedValue === "number" && forcedValue > 0
        ? Math.floor(forcedValue)
        : Math.max(1, Math.floor(currentNext))

    const prefix =
      (settings[prefixField] as string) || DEFAULT_PREFIX_BY_TYPE[documentType]
    const formatPattern =
      (settings[formatField] as string) || DEFAULT_FORMAT_BY_TYPE[documentType]
    const padding = Number(settings[paddingField] ?? 5)

    const documentNumber = formatDocumentNumber(
      formatPattern,
      {
        number: sequenceNumber,
        prefix,
        order_display_id: options.orderDisplayId,
      },
      padding,
      options.referenceDate ?? new Date()
    )

    await this.updateDocumentSettings({
      id: settings.id,
      [nextNumberField]: sequenceNumber + 1,
      [forcedNextField]: null,
    })

    return {
      documentNumber,
      sequenceNumber,
      settingsId: settings.id,
    }
  }

  /**
   * Builds an immutable `SettingsSnapshot` for storing on `mpd_document.settings_snapshot`.
   */
  async buildSettingsSnapshot(
    settings: Record<string, any>,
    documentType: DocumentType,
    options: {
      localeOverride?: string | null
      templateKeyOverride?: string | null
      b2bContext?: B2BBuyerContext
    } = {}
  ): Promise<SettingsSnapshot> {
    const templateField = `${documentType}_template`
    const defaultTemplateByType: Record<DocumentType, string> = {
      invoice: "clean",
      packing_slip: "packing_slip",
      credit_note: "credit_note",
      receipt: "pos_80mm",
    }

    const templateKey =
      options.templateKeyOverride ||
      (settings[templateField] as string) ||
      defaultTemplateByType[documentType]

    const locale = normalizeLocale(
      options.localeOverride || settings.default_locale || "en"
    )

    return {
      captured_at: new Date().toISOString(),
      region_id: settings.region_id ?? null,
      company_name: settings.company_name || "My Store",
      company_address: settings.company_address || "",
      company_line2: settings.company_line2 ?? null,
      company_city: settings.company_city ?? null,
      company_state: settings.company_state ?? null,
      company_postal_code: settings.company_postal_code ?? null,
      company_country: settings.company_country ?? null,
      company_tax_id: settings.company_tax_id ?? null,
      company_email: settings.company_email ?? null,
      company_phone: settings.company_phone ?? null,
      company_website: settings.company_website ?? null,
      company_logo: settings.company_logo ?? null,
      bank_details: settings.bank_details ?? null,
      template_key: templateKey,
      primary_color: settings.primary_color || "#18181b",
      secondary_color: settings.secondary_color || "#71717a",
      font_family: settings.font_family || "Helvetica",
      locale,
      notes: settings.notes ?? null,
      footer_text: settings.footer_text ?? null,
      require_signature: Boolean(settings.require_signature),
      signature_role: settings.signature_role || "Customer",
      b2b_context: options.b2bContext,
      styles: settings.styles_override ?? undefined,
      sections: settings.sections_override ?? undefined,
    }
  }

  /**
   * Resolves optional B2B buyer context for an order using `this.options_.b2b`.
   */
  async resolveOrderB2BContext(
    order: Record<string, any>,
    container?: { resolve: (key: string) => unknown } | null
  ): Promise<B2BBuyerContext> {
    return resolveB2BBuyerContext(order, this.options_.b2b, container)
  }

  /**
   * Renders a PDF Buffer for a `DocumentRenderContext`, looking up custom `mpd_document_template`
   * if `template_key` is a custom template ID rather than a built-in preset.
   */
  async renderPdf(
    context: DocumentRenderContext,
    customTranslations?: Record<string, Record<string, string>> | null
  ): Promise<Buffer> {
    const templateKey = context.settings.template_key
    let customTemplate: TemplateRenderTarget | null = null

    const isBuiltin = (BUILTIN_PRESETS as readonly string[]).includes(
      templateKey.toLowerCase()
    )

    if (!isBuiltin && templateKey) {
      try {
        const found = await this.listDocumentTemplates({ id: templateKey })
        if (found.length > 0) {
          const tpl = found[0]
          customTemplate = {
            engine: tpl.engine,
            preset_key: tpl.preset_key,
            html_content: tpl.html_content,
            page_size: tpl.page_size,
            orientation: tpl.orientation,
            styles: tpl.styles,
            sections: tpl.sections,
          }
        }
      } catch {
        // Fall back to default built-in preset if custom template lookup fails
      }
    }

    return renderDocumentPdf(context, customTemplate, customTranslations)
  }

  /**
   * Appends an immutable event to `mpd_document.audit_log`.
   */
  async appendAuditLog(
    documentId: string,
    entry: Omit<AuditLogEntry, "timestamp">
  ): Promise<Record<string, any>> {
    const docs = await this.listDocuments({ id: documentId })
    if (docs.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Document ${documentId} not found`
      )
    }
    const doc = docs[0]
    const currentLog: AuditLogEntry[] = Array.isArray(doc.audit_log)
      ? doc.audit_log
      : []

    const nextLog: AuditLogEntry[] = [
      ...currentLog,
      {
        timestamp: new Date().toISOString(),
        ...entry,
      },
    ]

    return await this.updateDocuments({
      id: documentId,
      audit_log: nextLog as unknown as Record<string, unknown>,
    })
  }

  /**
   * Marks generated invoices/receipts for an order as `is_stale = true` with a reason
   * when an order is updated or canceled (LogicDine stale detection feature).
   */
  async markOrderDocumentsStale(
    orderId: string,
    reason: string
  ): Promise<number> {
    const docs = await this.listDocuments({
      order_id: orderId,
      status: "generated",
    })

    let count = 0
    for (const doc of docs) {
      if (doc.document_type === "invoice" || doc.document_type === "receipt") {
        const currentLog: AuditLogEntry[] = Array.isArray(doc.audit_log)
          ? doc.audit_log
          : []
        await this.updateDocuments({
          id: doc.id,
          is_stale: true,
          stale_reason: reason,
          audit_log: [
            ...currentLog,
            {
              timestamp: new Date().toISOString(),
              event: "marked_stale",
              details: { reason },
            },
          ] as unknown as Record<string, unknown>,
        })
        count++
      }
    }
    return count
  }

  /**
   * Retrieves the binary PDF Buffer for a stored document:
   * 1. If `file_url` is a `data:application/pdf;base64,...` URI, decodes and returns it.
   * 2. If `file_url` is an HTTP/HTTPS URL, attempts to fetch it.
   * 3. Fallback: Re-renders identically from `render_context_snapshot` & `settings_snapshot`.
   */
  async getDocumentPdfBuffer(documentId: string): Promise<{
    buffer: Buffer
    document: Record<string, any>
  }> {
    const docs = await this.listDocuments({ id: documentId })
    if (docs.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Document ${documentId} not found`
      )
    }
    const doc = docs[0]

    if (typeof doc.file_url === "string" && doc.file_url.length > 0) {
      if (doc.file_url.startsWith("data:application/pdf;base64,")) {
        const b64 = doc.file_url.slice("data:application/pdf;base64,".length)
        return { buffer: Buffer.from(b64, "base64"), document: doc }
      }
      if (
        doc.file_url.startsWith("https://") ||
        doc.file_url.startsWith("http://")
      ) {
        try {
          const response = await fetch(doc.file_url)
          if (response.ok) {
            const arr = await response.arrayBuffer()
            return { buffer: Buffer.from(arr), document: doc }
          }
        } catch {
          // Fall through to deterministic snapshot re-render
        }
      }
    }

    if (doc.render_context_snapshot) {
      const settings = await this.resolveSettings(
        (doc.settings_snapshot?.region_id as string | null | undefined)
      )
      const buffer = await this.renderPdf(
        doc.render_context_snapshot as unknown as DocumentRenderContext,
        settings.custom_translations
      )
      return { buffer, document: doc }
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `PDF file is unavailable and no render snapshot exists for document ${doc.document_number}`
    )
  }
}

export default DocumentsModuleService

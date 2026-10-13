export * from "./constants"
export * from "./enums"
export * from "./errors"

import type {
  BUILTIN_PRESETS,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  PACKING_SLIP_PRESETS,
  PAGE_ORIENTATIONS,
  PAGE_SIZES,
  SIGNATURE_STATUSES,
  STORE_DOCUMENT_PDF_TYPES,
  SUPPORTED_LOCALES,
  TEMPLATE_ENGINES,
  TEMPLATE_PRESETS,
} from "./constants"
import type { DocumentsApiClient } from "../sdk/client"

// ─────────────────────────────────────────────────────────────────────────────
// 1. Core Plugin Configuration & Utils
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]
export type SignatureStatus = (typeof SIGNATURE_STATUSES)[number]
export type TemplateEngine = (typeof TEMPLATE_ENGINES)[number]
export type PageSize = (typeof PAGE_SIZES)[number]
export type PageOrientation = (typeof PAGE_ORIENTATIONS)[number]
export type BuiltinPreset = (typeof BUILTIN_PRESETS)[number]
export type TemplatePreset = (typeof TEMPLATE_PRESETS)[number] | (string & {})
export type PackingSlipPreset =
  | (typeof PACKING_SLIP_PRESETS)[number]
  | (string & {})
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type StoreDocumentPdfType = (typeof STORE_DOCUMENT_PDF_TYPES)[number]

export interface MappedDocumentError {
  code: string
  message: string
  retryable: boolean
}

export interface DocumentsPluginOptions {
  /**
   * Optional Docuseal integration settings (cloud or self-hosted).
   * If omitted or api_key is empty, e-signature features are gracefully disabled.
   */
  docuseal?: {
    api_key?: string
    webhook_secret?: string
    base_url?: string
  }
  /**
   * Optional B2B integration settings.
   * When enabled, dynamically inspects the Medusa container for a registered B2B/Company module
   * and falls back to order/customer metadata without requiring any hard dependency.
   */
  b2b?: {
    enabled?: boolean
    module_key?: string
    company_field_mappings?: {
      tax_id?: string
      vat_number?: string
      po_number?: string
      payment_terms?: string
      registration_number?: string
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Domain / Module Schemas & Render Contexts
// ─────────────────────────────────────────────────────────────────────────────

export interface B2BBuyerContext {
  is_b2b: boolean
  source: "b2b_module" | "metadata" | "none"
  company_id?: string | null
  company_name?: string | null
  tax_id?: string | null
  vat_number?: string | null
  registration_number?: string | null
  po_number?: string | null
  payment_terms?: string | null
  cost_center?: string | null
  buyer_contact_name?: string | null
  buyer_contact_email?: string | null
}

export interface AuditLogEntry {
  timestamp: string
  event:
    | "created"
    | "generated"
    | "failed"
    | "marked_stale"
    | "regenerated"
    | "emailed"
    | "signature_requested"
    | "signature_opened"
    | "signature_completed"
    | "signature_declined"
    | "downloaded"
  actor_id?: string | null
  details?: Record<string, unknown>
}

export interface PriorDocumentVersion {
  version: number
  document_number: string
  file_id?: string | null
  file_url?: string | null
  file_size?: number | null
  generated_at?: string | null
  reason?: string | null
}

export interface TemplateStylesConfig {
  primary_color: string
  secondary_color: string
  accent_color?: string
  text_color?: string
  background_color?: string
  font_family: string
  font_size: number
  header_alignment?: "left" | "center" | "right"
  logo_max_width?: number
  logo_max_height?: number
  border_radius?: number
  margin_top?: number
  margin_right?: number
  margin_bottom?: number
  margin_left?: number
}

export interface TemplateSectionsConfig {
  show_logo: boolean
  show_company_info: boolean
  show_company_tax_id: boolean
  show_billing_address: boolean
  show_shipping_address: boolean
  show_b2b_fields: boolean
  show_sku: boolean
  show_discount_column: boolean
  show_tax_column: boolean
  show_shipping_line: boolean
  show_payment_method: boolean
  show_notes: boolean
  show_bank_details: boolean
  show_footer: boolean
  show_signature_block: boolean
  show_barcode?: boolean
}

export interface SettingsSnapshot {
  captured_at: string
  region_id: string | null
  company_name: string
  company_address: string
  company_line2?: string | null
  company_city?: string | null
  company_state?: string | null
  company_postal_code?: string | null
  company_country?: string | null
  company_tax_id?: string | null
  company_email?: string | null
  company_phone?: string | null
  company_website?: string | null
  company_logo?: string | null
  bank_details?: string | null
  template_key: string
  primary_color: string
  secondary_color: string
  font_family: string
  locale: string
  notes?: string | null
  footer_text?: string | null
  require_signature: boolean
  signature_role?: string | null
  b2b_context?: B2BBuyerContext
  styles?: Partial<TemplateStylesConfig>
  sections?: Partial<TemplateSectionsConfig>
}

export interface OrderAddressSnapshot {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
}

export interface OrderLineItemSnapshot {
  id: string
  title: string
  subtitle?: string | null
  variant_title?: string | null
  sku?: string | null
  barcode?: string | null
  quantity: number
  unit_price: number
  subtotal: number
  tax_total: number
  discount_total: number
  total: number
  weight?: number | null
  metadata?: Record<string, unknown> | null
}

export interface OrderFulfillmentSnapshot {
  id: string
  created_at?: string | null
  shipped_at?: string | null
  tracking_numbers: string[]
  tracking_links: string[]
  carrier?: string | null
  warehouse_address?: string | null
  items: Array<{
    line_item_id?: string
    title: string
    sku?: string | null
    variant_title?: string | null
    quantity: number
    weight?: number | null
  }>
}

export interface OrderRefundSnapshot {
  id: string
  amount: number
  reason?: string | null
  note?: string | null
  created_at?: string | null
  reference_invoice_number?: string | null
}

export interface DocumentRenderContext {
  document_number: string
  document_type: DocumentType
  version: number
  generated_at: string
  locale: string
  order: {
    id: string
    display_id: string | number
    created_at: string
    currency_code: string
    email?: string | null
    region_id?: string | null
    region_name?: string | null
    payment_status?: string | null
    fulfillment_status?: string | null
    payment_method?: string | null
    subtotal: number
    discount_total: number
    shipping_total: number
    tax_total: number
    total: number
    refunded_total?: number
    customer?: {
      id?: string | null
      first_name?: string | null
      last_name?: string | null
      email?: string | null
      phone?: string | null
      company_name?: string | null
    } | null
    billing_address?: OrderAddressSnapshot | null
    shipping_address?: OrderAddressSnapshot | null
    items: OrderLineItemSnapshot[]
    metadata?: Record<string, unknown> | null
  }
  settings: SettingsSnapshot
  b2b: B2BBuyerContext
  fulfillment?: OrderFulfillmentSnapshot | null
  refund?: OrderRefundSnapshot | null
  related_document?: {
    id: string
    document_number: string
    document_type: DocumentType
    generated_at?: string | null
  } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Internal / Workflow / Service Payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateRenderTarget {
  engine?: TemplateEngine
  preset_key?: string | null
  html_content?: string | null
  page_size?: PageSize
  orientation?: PageOrientation
  styles?: Partial<TemplateStylesConfig> | null
  sections?: Partial<TemplateSectionsConfig> | null
}

export interface DocusealSubmitterInput {
  email: string
  name?: string | null
  role?: string | null
  send_email?: boolean
}

export interface CreateDocusealSubmissionParams {
  documentName: string
  pdfBuffer: Buffer
  submitter: DocusealSubmitterInput
  templateId?: string | number | null
  metadata?: Record<string, unknown>
}

export interface DocusealSubmissionResult {
  submission_id: number
  submitter_id: number | null
  embed_src: string | null
  status: "pending" | "sent"
}

export interface DocumentTranslations {
  // Document Titles
  invoice_title: string
  packing_slip_title: string
  credit_note_title: string
  receipt_title: string

  // Header & Metadata
  document_number: string
  invoice_number: string
  packing_slip_number: string
  credit_note_number: string
  receipt_number: string
  order_number: string
  issue_date: string
  order_date: string
  due_date: string
  revision: string
  reference_invoice: string
  refund_reason: string
  fulfillment_id: string
  tracking_number: string
  carrier: string
  payment_method: string
  payment_status: string

  // Parties & Addresses
  from: string
  bill_to: string
  ship_to: string
  warehouse: string
  tax_id: string
  vat_number: string
  registration_number: string
  po_number: string
  payment_terms: string
  cost_center: string
  email: string
  phone: string

  // Line Item Table Headers
  item_description: string
  sku: string
  variant: string
  quantity: string
  unit_price: string
  discount: string
  tax: string
  total: string
  weight: string

  // Totals & Summary
  subtotal: string
  discount_total: string
  shipping_total: string
  tax_total: string
  grand_total: string
  refund_total: string
  total_items: string
  total_quantity: string
  total_weight: string

  // Notes, Banking & Signatures
  notes: string
  bank_details: string
  authorized_signature: string
  customer_signature: string
  signature_date: string
  thank_you: string
  page_of: string
}

export interface AccountingCsvRow {
  document_number: string
  document_type: string
  status: string
  version: number
  order_id: string
  order_display_id?: string | number | null
  customer_name?: string | null
  customer_email?: string | null
  company_name?: string | null
  buyer_tax_id?: string | null
  currency_code?: string | null
  subtotal?: number | null
  discount_total?: number | null
  shipping_total?: number | null
  tax_total?: number | null
  total?: number | null
  locale?: string | null
  region_id?: string | null
  related_document_id?: string | null
  generated_at?: string | Date | null
  emailed_at?: string | Date | null
}

export interface NumberingTokens {
  number: number
  prefix?: string | null
  year?: number | string
  month?: number | string
  day?: number | string
  order_display_id?: string | number | null
}

export interface ZipFileEntry {
  filename: string
  content: Buffer
  modifiedAt?: Date
}

export interface CustomHtmlRenderOptions {
  html_content?: string | null
  page_size?: PageSize
  orientation?: PageOrientation
  styles?: Partial<TemplateStylesConfig> | null
  sections?: Partial<TemplateSectionsConfig> | null
}

export interface BulkGenerateInput {
  order_ids: string[]
  document_type?: DocumentType
  template_id?: string | null
  locale?: string | null
  force_new_version?: boolean
  actor_id?: string | null
}

export interface BulkGenerateItemResult {
  order_id: string
  status: "generated" | "skipped" | "failed"
  document_id?: string
  document_number?: string
  error?: string
}

export interface BulkGenerateSummary {
  total: number
  generated: number
  skipped: number
  failed: number
  results: BulkGenerateItemResult[]
}

export interface GenerateDocumentWorkflowInput {
  order_id: string
  document_type?: DocumentType
  template_id?: string | null
  locale?: string | null
  fulfillment_id?: string | null
  refund_id?: string | null
  refund_amount?: number | null
  refund_reason?: string | null
  related_document_id?: string | null
  existing_document_id?: string | null
  force_new_version?: boolean
  actor_id?: string | null
  metadata?: Record<string, unknown> | null
}

export interface MarkDocumentsStaleInput {
  order_id: string
  reason: string
}

export interface RegenerateDocumentRevisionInput {
  document_id: string
  template_id?: string | null
  locale?: string | null
  actor_id?: string | null
}

export interface FetchOrderContextInput {
  order_id: string
  fulfillment_id?: string | null
  refund_id?: string | null
  refund_amount?: number | null
  refund_reason?: string | null
}

export interface AllocateAndRenderDocumentInput {
  order: DocumentRenderContext["order"]
  b2b: B2BBuyerContext
  fulfillment?: OrderFulfillmentSnapshot | null
  refund?: OrderRefundSnapshot | null
  document_type: DocumentType
  template_id?: string | null
  locale?: string | null
  related_document_id?: string | null
  existing_document_id?: string | null
  force_new_version?: boolean
  actor_id?: string | null
  metadata?: Record<string, unknown> | null
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Plugin Admin & Store SDK
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentsApiClientOptions {
  headers?: Record<string, string>
  publishableApiKey?: string
  credentials?: RequestCredentials
  fetchImpl?: typeof fetch
}

export interface SignatureRequestRecord {
  id: string
  document_id: string
  order_id: string
  provider: string
  external_submission_id?: string | null
  signer_email: string
  signer_name?: string | null
  signer_role?: string | null
  status: SignatureStatus
  embed_src?: string | null
  signed_storage_key?: string | null
  signed_url?: string | null
  audit_log_url?: string | null
  sent_at?: string | null
  opened_at?: string | null
  completed_at?: string | null
  declined_at?: string | null
  expires_at?: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
}

export interface DocumentRecord {
  id: string
  document_number: string
  document_type: DocumentType
  status: DocumentStatus
  version: number
  order_id: string
  return_id?: string | null
  exchange_id?: string | null
  claim_id?: string | null
  customer_id?: string | null
  region_id?: string | null
  related_document_id?: string | null
  template_id?: string | null
  locale: SupportedLocale
  currency_code?: string | null
  storage_key?: string | null
  file_url?: string | null
  file_size?: number | null
  checksum?: string | null
  reason?: string | null
  generated_by?: string | null
  generated_at?: string | null
  emailed_at?: string | null
  emailed_to?: string | null
  error_message?: string | null
  is_stale?: boolean
  stale_reason?: string | null
  audit_log?: Array<{
    timestamp: string
    event: string
    details?: Record<string, any>
  }>
  prior_versions?: Array<{
    version: number
    document_number: string
    file_url?: string | null
  }>
  render_context_snapshot?: Record<string, any> | null
  settings_snapshot?: Record<string, any> | null
  created_at?: string
  updated_at?: string
  signature_request?: SignatureRequestRecord | null
  signature_requests?: SignatureRequestRecord[]
  related_children?: DocumentRecord[]
}

export interface DocumentSettingsRecord {
  id?: string
  region_id: string | null
  company_name: string
  company_address: string
  company_city: string
  company_postal_code: string
  company_country: string
  company_tax_id: string
  company_email: string
  company_phone: string
  company_website: string
  logo_url: string
  primary_color: string
  accent_color: string
  font_family: string
  invoice_prefix: string
  packing_slip_prefix: string
  credit_note_prefix: string
  receipt_prefix: string
  number_format: string
  sequence_padding: number
  next_invoice_number: number
  next_packing_slip_number: number
  next_credit_note_number: number
  next_receipt_number: number
  default_locale: SupportedLocale
  invoice_template_preset: TemplatePreset
  packing_slip_preset: PackingSlipPreset
  credit_note_template_preset: TemplatePreset
  receipt_template_preset: TemplatePreset
  auto_generate_invoice: boolean
  auto_generate_packing_slip: boolean
  auto_generate_credit_note: boolean
  auto_generate_receipt: boolean
  auto_send_email: boolean
  attach_pdf_to_order_email: boolean
  default_payment_terms: string
  invoice_notes: string
  invoice_footer: string
  credit_note_notes: string
  show_barcode_on_packing_slip: boolean
  show_qr_on_invoice: boolean
  require_signature_on_invoice: boolean
  require_signature_on_quote: boolean
  signature_provider: string
  docuseal_template_id: string
  bank_name: string
  bank_iban: string
  bank_bic: string
}

export interface DocumentTemplateRecord {
  id: string
  name: string
  document_type: DocumentType
  preset: string
  locale: string
  html_content: string
  css_content: string
  header_html?: string
  footer_html?: string
  page_size?: "A4" | "LETTER"
  orientation?: "portrait" | "landscape"
  is_default: boolean
  is_system: boolean
  variables_schema?: Record<string, unknown> | null
}

export interface MedusaRegionSummary {
  id: string
  name: string
  currency_code: string
}

export interface ListDocumentsParams {
  q?: string
  document_type?: DocumentType | ""
  status?: DocumentStatus | ""
  order_id?: string
  customer_id?: string
  region_id?: string
  locale?: SupportedLocale
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export interface ListDocumentsResponse {
  documents: DocumentRecord[]
  count: number
  limit: number
  offset: number
}

export interface GetDocumentResponse {
  document: DocumentRecord
}

export interface DeleteDocumentResponse {
  id: string
  object: "document"
  deleted: boolean
}

export interface GenerateDocumentPayload {
  order_id: string
  document_type: DocumentType
  locale?: SupportedLocale
  template_id?: string
  return_id?: string
  exchange_id?: string
  claim_id?: string
  related_document_id?: string
  reason?: string
  force_regenerate?: boolean
  send_email?: boolean
  recipient_email?: string
  request_signature?: boolean
  signer_email?: string
  signer_name?: string
}

export interface GenerateDocumentResponse {
  document: DocumentRecord
  was_created?: boolean
  deduplicated?: boolean
}

export interface RegenerateDocumentPayload {
  locale?: SupportedLocale | string
  template_id?: string
  reason?: string
}

export interface SendDocumentEmailPayload {
  recipient_email?: string
  locale?: SupportedLocale | string
}

export interface SendDocumentEmailResponse {
  sent: boolean
  recipient: string
  document: DocumentRecord
}

export interface SendDocumentForSignaturePayload {
  signer_email?: string
  signer_name?: string
  signer_role?: string
  send_email?: boolean
}

export interface SendDocumentForSignatureResponse {
  signature_request: SignatureRequestRecord
  embed_src?: string | null
  submission_url?: string | null
}

export interface BulkGenerateDocumentsPayload {
  order_ids: string[]
  document_type: DocumentType
  locale?: SupportedLocale | string
  force_regenerate?: boolean
}

export interface BulkGenerateDocumentsResponse {
  generated?: number
  skipped?: number
  failed?: number
  generated_count?: number
  failed_count?: number
  results?: Array<{
    order_id: string
    status: "generated" | "failed"
    document_id?: string
    document_number?: string
    error?: string
  }>
}

export interface BulkDownloadPayload {
  document_ids: string[]
}

export interface ExportCsvParams {
  document_type?: DocumentType | string
  status?: DocumentStatus | string
  order_id?: string
  date_from?: string
  date_to?: string
}

export interface PreviewDocumentParams {
  document_type?: DocumentType
  type?: DocumentType
  preset?: string
  locale?: SupportedLocale | string
  region_id?: string | null
  order_id?: string
  items?: number | string
  template_id?: string | null
  t?: number
}

export interface GetDocumentSettingsParams {
  region_id?: string | null
}

export interface GetDocumentSettingsResponse {
  settings: DocumentSettingsRecord
  is_regional_override: boolean
  configured_region_ids: string[]
  integrations: {
    docuseal_configured: boolean
    b2b_enabled: boolean
  }
}

export type UpdateDocumentSettingsPayload = Partial<DocumentSettingsRecord> & {
  region_id?: string | null
}

export interface UpdateDocumentSettingsResponse {
  settings: DocumentSettingsRecord
  is_regional_override: boolean
}

export interface ResetRegionalSettingsResponse {
  deleted: boolean
  region_id: string
  settings: DocumentSettingsRecord
}

export interface ListDocumentTemplatesParams {
  document_type?: DocumentType
  locale?: string
}

export interface ListDocumentTemplatesResponse {
  templates: DocumentTemplateRecord[]
  count: number
}

export interface GetDocumentTemplateResponse {
  template: DocumentTemplateRecord
}

export interface UpsertDocumentTemplatePayload {
  name: string
  document_type: DocumentType
  preset?: TemplatePreset | PackingSlipPreset
  locale?: string
  html_content: string
  css_content?: string
  header_html?: string
  footer_html?: string
  page_size?: "A4" | "LETTER"
  orientation?: "portrait" | "landscape"
  is_default?: boolean
  variables_schema?: Record<string, unknown>
}

export interface DeleteDocumentTemplateResponse {
  id: string
  object: "document_template"
  deleted: boolean
}

export interface StoreOrderDocumentSummary {
  id: string
  document_number: string
  document_type: DocumentType
  version: number
  locale: SupportedLocale
  generated_at: string | null
  download_path: string
}

export interface StoreOrderSignatureSummary {
  id: string
  document_id: string
  status: SignatureStatus
  embed_src: string | null
  completed_at: string | null
  signed_download_path: string | null
}

export interface StoreOrderDocumentsResponse {
  documents: StoreOrderDocumentSummary[]
  signature_requests: StoreOrderSignatureSummary[]
}

export interface StoreOrderSigningUrlResponse {
  signature_request_id: string
  document_id: string
  status: SignatureStatus
  embed_src: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Plugin Hooks
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentsQueryHookOptions<TData = unknown> {
  client?: DocumentsApiClient
  queryKey?: readonly unknown[]
  enabled?: boolean
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

export interface DocumentsMutationHookOptions<
  TData = unknown,
  TVariables = unknown,
> {
  client?: DocumentsApiClient
  queryKey?: readonly unknown[]
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
}

export interface UseDocumentsQueryResult<TData> {
  data: TData | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<TData | undefined>
}

export interface UseDocumentsMutationResult<TData, TVariables> {
  mutate: (
    variables: TVariables,
    callOptions?: {
      onSuccess?: (data: TData, variables: TVariables) => void
      onError?: (error: Error, variables: TVariables) => void
    }
  ) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  error: Error | null
  data: TData | undefined
  reset: () => void
}

export interface UseOrderDocumentsWidgetStateProps {
  orderId: string
  orderEmail?: string | null
  orderRegionId?: string | null
  client?: DocumentsApiClient
  t?: (key: string, options?: Record<string, any>) => string
}

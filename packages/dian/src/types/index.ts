export * from "./constants"
export * from "./enums"
export * from "./errors"

import type {
  DIAN_CREDIT_NOTE_CONCEPTS,
  DIAN_DEBIT_NOTE_CONCEPTS,
  DIAN_DOCUMENT_STATUSES,
  DIAN_DOCUMENT_TYPES,
  DIAN_ENVIRONMENTS,
  DIAN_FISCAL_RESPONSIBILITIES,
  DIAN_IDENTIFICATION_TYPES,
  DIAN_ITEM_STANDARDS,
  DIAN_ORGANIZATION_TYPES,
  DIAN_PAYMENT_FORMS,
  DIAN_PAYMENT_MEANS,
  DIAN_PROVIDER_TYPES,
  DIAN_TAX_CODES,
  DIAN_TAX_REGIMES,
} from "./constants"

export type DianDocumentType = (typeof DIAN_DOCUMENT_TYPES)[number]
export type DianDocumentStatus = (typeof DIAN_DOCUMENT_STATUSES)[number]
export type DianEnvironment = (typeof DIAN_ENVIRONMENTS)[number]
export type DianProviderType = (typeof DIAN_PROVIDER_TYPES)[number]
export type DianOrganizationType = (typeof DIAN_ORGANIZATION_TYPES)[number]
export type DianIdentificationType = (typeof DIAN_IDENTIFICATION_TYPES)[number]
export type DianTaxRegime = (typeof DIAN_TAX_REGIMES)[number]
export type DianFiscalResponsibility =
  (typeof DIAN_FISCAL_RESPONSIBILITIES)[number]
export type DianTaxCode = (typeof DIAN_TAX_CODES)[number]
export type DianItemStandard = (typeof DIAN_ITEM_STANDARDS)[number]
export type DianPaymentForm = (typeof DIAN_PAYMENT_FORMS)[number]
export type DianPaymentMeans = (typeof DIAN_PAYMENT_MEANS)[number]
export type DianCreditNoteConcept = (typeof DIAN_CREDIT_NOTE_CONCEPTS)[number]
export type DianDebitNoteConcept = (typeof DIAN_DEBIT_NOTE_CONCEPTS)[number]

export interface DianPluginOptions {
  /**
   * Default transmission provider ("native_soap" | "siigo" | "alegra" | "dataico" | "facturatech").
   */
  default_provider?: DianProviderType
  /**
   * Optional provider credentials (recommended via environment variables).
   */
  provider_credentials?: {
    api_url?: string
    api_key?: string
    username?: string
    password?: string
    partner_id?: string
  }
  /**
   * Optional certificate configuration for XAdES-EPES signing (recommended via environment variables).
   */
  certificate?: {
    p12_base64?: string
    password?: string
    private_key_pem?: string
    cert_pem?: string
  }
  /**
   * Module key for @vicacha-devs/medusa-plugin-documents (defaults to "documents").
   */
  documents_module_key?: string
  /**
   * Module key for @vicacha-devs/medusa-plugin-b2b (defaults to "company").
   */
  b2b_module_key?: string
}

export interface DianAuditLogEntry {
  timestamp: string
  event:
    | "created"
    | "xml_generated"
    | "signed"
    | "transmitted"
    | "validated"
    | "rejected"
    | "contingency"
    | "pdf_generated"
    | "attached_document_packaged"
    | "emailed"
    | "retried"
    | "cancelled"
  actor_id?: string | null
  details?: Record<string, unknown>
}

export interface DianBuyerSnapshot {
  is_anonymous_consumidor_final: boolean
  is_b2b_legal_client: boolean
  customer_id?: string | null
  company_id?: string | null
  identification_type: DianIdentificationType
  identification_number: string
  dv?: string | null
  organization_type: DianOrganizationType
  tax_regime: DianTaxRegime
  fiscal_responsibilities: string[]
  tributo_id: "01" | "ZZ"
  registration_name: string
  trade_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email: string
  phone: string
  address_line: string
  municipality_code: string
  municipality_name: string
  department_code: string
  department_name: string
  postal_code?: string | null
  country_code: string
}

export interface DianSellerSnapshot {
  nit: string
  dv: string
  organization_type: DianOrganizationType
  tax_regime: DianTaxRegime
  fiscal_responsibilities: string[]
  tributo_id: "01" | "ZZ"
  registration_name: string
  trade_name: string
  ciiu_code: string
  email: string
  phone: string
  address_line: string
  municipality_code: string
  municipality_name: string
  department_code: string
  department_name: string
  postal_code: string
  country_code: string
  software_id: string
  software_pin: string
  environment: DianEnvironment
}

export interface DianResolutionSnapshot {
  id: string
  resolution_number: string
  prefix: string
  document_type: DianDocumentType
  from_number: number
  to_number: number
  valid_from: string
  valid_to: string
  technical_key?: string | null
}

export interface DianTaxLineBreakdown {
  tax_code: DianTaxCode
  tax_name: string
  rate: number
  taxable_amount: number
  tax_amount: number
  per_unit_amount?: number | null
}

export interface DianWithholdingBreakdown {
  withholding_code: "05" | "06" | "07"
  withholding_name: string
  rate: number
  taxable_amount: number
  withholding_amount: number
}

export interface DianLineItemContext {
  id: string
  line_number: number
  title: string
  description?: string | null
  sku: string
  standard_code_id: DianItemStandard
  standard_item_id: string
  unit_code: string
  quantity: number
  unit_price: number
  discount_amount: number
  line_extension_amount: number
  taxes: DianTaxLineBreakdown[]
  is_free_sample?: boolean
}

export interface DianDocumentBuildContext {
  document_type: DianDocumentType
  environment: DianEnvironment
  prefix: string
  consecutive: number
  document_number: string
  issue_date: string // YYYY-MM-DD (America/Bogota)
  issue_time: string // HH:mm:ss-05:00
  due_date?: string | null
  currency_code: string
  payment_form: DianPaymentForm
  payment_means: DianPaymentMeans
  payment_due_date?: string | null
  seller: DianSellerSnapshot
  buyer: DianBuyerSnapshot
  resolution: DianResolutionSnapshot
  items: DianLineItemContext[]
  line_extension_amount: number // ValFac
  tax_exclusive_amount: number
  tax_inclusive_amount: number
  allowance_total_amount: number
  charge_total_amount: number
  payable_amount: number // ValTot
  taxes: DianTaxLineBreakdown[]
  withholdings: DianWithholdingBreakdown[]
  cufe_cude: string
  cufe_cude_algorithm: "CUFE-SHA384" | "CUDE-SHA384"
  software_security_code: string
  qr_url: string
  qr_data: string
  billing_reference?: {
    invoice_number: string
    cufe: string
    issue_date: string
  } | null
  discrepancy_response?: {
    concept_code: string
    description: string
  } | null
  pos_metadata?: {
    terminal_id: string
    cashier_name: string
    store_name: string
    sales_code: string
    software_maker_name: string
  } | null
  notes?: string | null
}

export interface DianProviderTransmissionResult {
  provider: DianProviderType
  is_valid: boolean
  status: DianDocumentStatus
  track_id?: string | null
  status_code?: string | null
  status_message?: string | null
  errors?: string[]
  application_response_xml?: string | null
  raw_response?: Record<string, unknown> | null
}

export interface DianNumberingRangeItem {
  resolution_number: string
  resolution_date: string
  prefix: string
  from_number: number
  to_number: number
  valid_from: string
  valid_to: string
  technical_key: string
}

export interface DianAcquirerLookupResult {
  identification_type: DianIdentificationType
  identification_number: string
  dv: string
  registration_name: string
  email: string
  tax_regime?: DianTaxRegime
  fiscal_responsibilities?: string[]
}

export interface EmitDianDocumentInput {
  order_id: string
  document_type?: DianDocumentType
  resolution_id?: string | null
  related_document_id?: string | null
  discrepancy_concept_code?: string | null
  discrepancy_description?: string | null
  payment_form?: DianPaymentForm
  payment_means?: DianPaymentMeans
  pos_terminal_id?: string | null
  cashier_name?: string | null
  force_consumidor_final?: boolean
  actor_id?: string | null
}

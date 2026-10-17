export const ODOO_MODULE = "odoo"
export const ODOO_SYNC_MODULE = "odoo_sync"

export type OdooProtocolVersion = "jsonrpc" | "json2"

export type OdooCircuitState = "closed" | "open" | "half-open"

export type OdooSyncDirection = "odoo_to_medusa" | "medusa_to_odoo" | "bidirectional"

export type OdooEntityType =
  | "product"
  | "variant"
  | "inventory"
  | "order"
  | "invoice"
  | "customer"
  | "warehouse"
  | "category"

export type OdooCreationMode = "create_update" | "create" | "update"

export type OdooSkuMappingMode = "sku" | "barcode"

export type OdooInventoryQuantityType = "on_hand" | "forecasted"

export type OdooInvoiceMode = "all" | "paid" | "fulfilled"

export type OdooReconciliationStrategy =
  | "odoo_wins"
  | "medusa_wins"
  | "manual_conflict"

export type OdooBarcodeContext = "pos" | "warehouse" | "receiving" | "stocktake"

export interface OdooConnectionConfig {
  url: string
  db: string
  username: string
  password?: string
  apiKey?: string
  protocol?: OdooProtocolVersion
  companyId?: number | null
  timeoutMs?: number
  maxRetries?: number
  rateLimitPerSec?: number
  circuitThreshold?: number
  circuitResetMs?: number
  allowPrivateNetwork?: boolean
  webhookSecret?: string
}

export interface OdooRedactedConnectionConfig
  extends Omit<OdooConnectionConfig, "password" | "apiKey" | "webhookSecret"> {
  password?: string
  apiKey?: string
  webhookSecret?: string
  hasPassword: boolean
  hasApiKey: boolean
  hasWebhookSecret: boolean
}

export interface OdooProductSyncSettings {
  enableProductSync?: boolean
  direction?: OdooSyncDirection
  creationMode?: OdooCreationMode
  skuMapping?: OdooSkuMappingMode
  createDraft?: boolean
  autoPublish?: boolean
  syncImages?: boolean
  updateFields?: Array<"title" | "description" | "prices" | "images">
  odooCategoryIds?: number[]
  medusaCollectionIds?: string[]
  productLimit?: number | null
}

export interface OdooLocationMapping {
  medusaLocationId: string
  medusaLocationName?: string
  odooWarehouseId: number
  odooWarehouseName?: string
  odooStockLocationId?: number | null
}

export interface OdooInventorySyncSettings {
  enableStock?: boolean
  direction?: OdooSyncDirection
  qtyType?: OdooInventoryQuantityType
  doNotSyncZeroStock?: boolean
  locationMappings?: OdooLocationMapping[]
}

export interface OdooOrderSyncSettings {
  orderSync?: boolean
  confirmOrderInOdoo?: boolean
  failOnUnmatchedSku?: boolean
  exportInvoice?: boolean
  invoiceMode?: OdooInvoiceMode
  markInvoicePaid?: boolean
  createPayment?: boolean
  paymentJournalId?: number | null
}

export interface OdooCustomerSyncSettings {
  enableCustomerSync?: boolean
  direction?: OdooSyncDirection
  syncAddresses?: boolean
  syncCompanyVat?: boolean
}

export interface OdooReconciliationSettings {
  enableScheduledReconciliation?: boolean
  strategy?: OdooReconciliationStrategy
  driftThreshold?: number
  defaultOdooLocationId?: number
}

export interface OdooWebhookSettings {
  enableInboundWebhooks?: boolean
  webhookSecret?: string
  autoProcessProductEvents?: boolean
  autoProcessStockEvents?: boolean
  autoProcessCustomerEvents?: boolean
  autoProcessOrderEvents?: boolean
}

export interface OdooPosSettings {
  enableOfflinePosReplay?: boolean
  enableBarcodeCache?: boolean
  posCacheTtlSeconds?: number
  warehouseCacheTtlSeconds?: number
}

export interface OdooPluginOptions extends Partial<OdooConnectionConfig> {
  productSettings?: OdooProductSyncSettings
  inventorySettings?: OdooInventorySyncSettings
  orderSettings?: OdooOrderSyncSettings
  customerSettings?: OdooCustomerSyncSettings
  reconciliationSettings?: OdooReconciliationSettings
  webhookSettings?: OdooWebhookSettings
  posSettings?: OdooPosSettings
}

export interface OdooProductVariantData {
  id: number
  sku?: string | null
  barcode?: string | null
  price: number
  options: Record<string, string>
  qtyAvailable?: number
  virtualAvailable?: number
}

export interface OdooDetailedProduct {
  id: number
  name: string
  description?: string | null
  sku?: string | null
  barcode?: string | null
  listPrice: number
  categoryId?: number | null
  categoryName?: string | null
  imageBase64?: string | null
  options: Array<{ title: string; values: string[] }>
  variants: OdooProductVariantData[]
}

export interface OdooWarehouseRecord {
  id: number
  name: string
  code: string
  lot_stock_id?: [number, string] | number | null
  medusa_location_id?: string | null
}

export interface OdooStockQuantRecord {
  id: number
  product_id: [number, string] | number
  location_id: [number, string] | number
  quantity: number
  reserved_quantity?: number
}

export interface OdooCompanyRecord {
  id: number
  name: string
  currency_id?: [number, string] | number | null
}

export interface OdooJournalRecord {
  id: number
  name: string
  type: string
  code?: string
}

export interface OdooCategoryRecord {
  id: number
  name: string
  complete_name?: string
}

export interface OdooPartnerRecord {
  id: number
  name: string
  email?: string | false | null
  phone?: string | false | null
  street?: string | false | null
  city?: string | false | null
  zip?: string | false | null
  country_id?: [number, string] | number | false | null
  vat?: string | false | null
  company_name?: string | false | null
  customer_rank?: number
  medusa_customer_id?: string | false | null
}

export interface OdooSaleOrderLineInput {
  product_id: number
  product_uom_qty: number
  price_unit: number
  name: string
}

export interface OdooSaleOrderRecord {
  id: number
  name: string
  state: string
  partner_id: [number, string] | number
  amount_total: number
  date_order: string
  medusa_order_id?: string | null
  invoice_ids?: number[]
}

export interface OdooSyncResult {
  ok: boolean
  entity: OdooEntityType | "all"
  direction: OdooSyncDirection
  created: number
  updated: number
  skipped: number
  failed: number
  durationMs: number
  message: string
  errors?: string[]
  logId?: string
}

export interface OdooOrderSyncResult {
  ok: boolean
  skipped?: boolean
  orderId: string
  odooOrderId?: number | null
  odooInvoiceId?: number | null
  odooPaymentId?: number | null
  message: string
}

export interface OdooReconciliationDetail {
  variantId: string
  sku: string
  odooProductId: number
  locationId?: string
  odooLocationId?: number | null
  medusaQty: number
  odooQty: number
  delta: number
  action: "none" | "fixed_medusa" | "fixed_odoo" | "conflict"
}

export interface OdooReconciliationResult {
  ok: boolean
  reconciliationLogId?: string
  checked: number
  matched: number
  drifted: number
  fixed: number
  conflicts: number
  errors: number
  details: OdooReconciliationDetail[]
  durationMs: number
}

export interface OdooBarcodeResolutionResult {
  found: boolean
  barcode: string
  context: OdooBarcodeContext
  variantId?: string
  productId?: string
  sku?: string
  title?: string
  unitPriceCents?: number
  odooProductId?: number
  odooProductName?: string
  odooUom?: string
  stockedQty?: number
  availableQty?: number
  imageUrl?: string
  source: "memory_cache" | "medusa_db" | "odoo_db" | "erp_mapping" | "none"
  latencyMs: number
  resolvedAt: string
}

export interface OfflinePosItemInput {
  variantId: string
  sku?: string
  title?: string
  quantity: number
  unitPriceCents: number
}

export interface OfflinePosEnqueueInput {
  externalTransactionId: string
  customerId?: string
  customerEmail?: string
  currency?: string
  totalCents: number
  discountCents?: number
  items: OfflinePosItemInput[]
  metadata?: Record<string, unknown>
}

export interface OfflinePosReplayResult {
  ok: boolean
  transactionId: string
  medusaOrderId?: string
  odooOrderId?: number | null
  message: string
}

export interface OdooWebhookPayload {
  event_id?: string
  event: string
  model?: string
  record_id?: number
  data: Record<string, unknown>
  timestamp?: string
}

export interface OdooWebhookProcessResult {
  ok: boolean
  duplicate?: boolean
  eventId: string
  event: string
  actionTaken: string
}

export interface OdooStatusOverview {
  status: "connected" | "disconnected" | "unconfigured"
  protocol: OdooProtocolVersion
  circuitState: OdooCircuitState
  serverVersion?: string | null
  totalMappings: number
  openFailures: number
  openConflicts: number
  pendingPosTransactions: number
  recentLogsCount: number
  timestamp: string
}

export interface OdooConnectionVerificationResult {
  ok: boolean
  uid?: number | null
  serverVersion?: string | null
  protocol: OdooProtocolVersion
  companies?: OdooCompanyRecord[]
  warehouses?: OdooWarehouseRecord[]
  journals?: OdooJournalRecord[]
  categories?: OdooCategoryRecord[]
  message: string
}

export type OdooSectionName =
  | "product"
  | "inventory"
  | "orders"
  | "customers"
  | "reconciliation"
  | "webhooks"
  | "pos"

export interface OdooQueryHookOptions<TData> {
  enabled?: boolean
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

export interface OdooMutationHookOptions<TData, TVariables> {
  queryKey?: readonly unknown[]
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
}

export interface UseOdooQueryResult<TData> {
  data: TData | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<TData | undefined>
}

export interface UseOdooMutationResult<TData, TVariables> {
  mutate: (
    variables: TVariables,
    options?: {
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

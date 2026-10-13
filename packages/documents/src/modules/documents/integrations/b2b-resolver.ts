import type { B2BBuyerContext, DocumentsPluginOptions } from "../types"

interface OrderLike {
  id?: string
  email?: string | null
  customer_id?: string | null
  metadata?: Record<string, unknown> | null
  billing_address?: {
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    metadata?: Record<string, unknown> | null
  } | null
  shipping_address?: {
    company?: string | null
  } | null
  customer?: {
    id?: string | null
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    company_name?: string | null
    metadata?: Record<string, unknown> | null
  } | null
  company?: Record<string, unknown> | null
}

function asNonEmptyString(val: unknown): string | null {
  if (typeof val === "string" && val.trim().length > 0) {
    return val.trim()
  }
  if (typeof val === "number" && !Number.isNaN(val)) {
    return String(val)
  }
  return null
}

/**
 * Resolves optional B2B buyer context with zero hard dependencies on any B2B plugin.
 *
 * Resolution tiers:
 * 1. Direct `order.company` object or optional B2B module registered in Medusa container
 * 2. Standard Medusa `order.metadata`, `customer.metadata`, and `billing_address.company`
 * 3. Pure B2C fallback (`is_b2b: false`, `source: "none"`)
 */
export async function resolveB2BBuyerContext(
  order: OrderLike,
  options?: DocumentsPluginOptions["b2b"],
  container?: { resolve: (key: string) => unknown } | null
): Promise<B2BBuyerContext> {
  // If B2B integration is explicitly disabled via options, return pure B2C context
  if (options?.enabled === false) {
    return { is_b2b: false, source: "none" }
  }

  const mappings = options?.company_field_mappings ?? {}
  const taxIdKey = mappings.tax_id || "tax_id"
  const vatKey = mappings.vat_number || "vat_number"
  const poKey = mappings.po_number || "po_number"
  const termsKey = mappings.payment_terms || "payment_terms"
  const regKey = mappings.registration_number || "registration_number"

  // Tier 1A: Linked `order.company` already hydrated via remoteQuery / link
  let moduleCompany: Record<string, unknown> | null =
    order.company && typeof order.company === "object" ? order.company : null

  // Tier 1B: Optional dynamic resolution from Medusa container if B2B module is installed
  if (!moduleCompany && container && (options?.enabled || options?.module_key)) {
    const candidateKeys = [
      options?.module_key,
      "company",
      "companyModuleService",
      "b2b",
      "b2bModuleService",
    ].filter((k): k is string => Boolean(k))

    const companyIdFromOrder =
      asNonEmptyString(order.metadata?.company_id) ||
      asNonEmptyString(order.customer?.metadata?.company_id)

    for (const key of candidateKeys) {
      try {
        const b2bService = container.resolve(key) as Record<string, unknown> | null
        if (!b2bService || typeof b2bService !== "object") continue

        if (
          companyIdFromOrder &&
          typeof b2bService.retrieveCompany === "function"
        ) {
          const found = await (
            b2bService.retrieveCompany as (id: string) => Promise<unknown>
          )(companyIdFromOrder)
          if (found && typeof found === "object") {
            moduleCompany = found as Record<string, unknown>
            break
          }
        }
      } catch {
        // Optional B2B module not installed or company not found; continue gracefully
      }
    }
  }

  const orderMeta = order.metadata ?? {}
  const customerMeta = order.customer?.metadata ?? {}
  const billingMeta = order.billing_address?.metadata ?? {}

  if (moduleCompany) {
    const companyName =
      asNonEmptyString(moduleCompany.name) ||
      asNonEmptyString(moduleCompany.company_name) ||
      asNonEmptyString(order.billing_address?.company) ||
      asNonEmptyString(order.customer?.company_name)

    const taxId =
      asNonEmptyString(moduleCompany[taxIdKey]) ||
      asNonEmptyString(moduleCompany.tax_id) ||
      asNonEmptyString(orderMeta[taxIdKey])

    const vatNumber =
      asNonEmptyString(moduleCompany[vatKey]) ||
      asNonEmptyString(moduleCompany.vat_number) ||
      asNonEmptyString(moduleCompany.vat_id) ||
      asNonEmptyString(orderMeta[vatKey])

    const registrationNumber =
      asNonEmptyString(moduleCompany[regKey]) ||
      asNonEmptyString(moduleCompany.registration_number) ||
      asNonEmptyString(orderMeta[regKey])

    const poNumber =
      asNonEmptyString(orderMeta[poKey]) ||
      asNonEmptyString(orderMeta.purchase_order_number) ||
      asNonEmptyString(moduleCompany[poKey])

    const paymentTerms =
      asNonEmptyString(orderMeta[termsKey]) ||
      asNonEmptyString(moduleCompany[termsKey]) ||
      asNonEmptyString(moduleCompany.payment_terms)

    const costCenter =
      asNonEmptyString(orderMeta.cost_center) ||
      asNonEmptyString(moduleCompany.cost_center)

    return {
      is_b2b: true,
      source: "b2b_module",
      company_id: asNonEmptyString(moduleCompany.id),
      company_name: companyName,
      tax_id: taxId,
      vat_number: vatNumber,
      registration_number: registrationNumber,
      po_number: poNumber,
      payment_terms: paymentTerms,
      cost_center: costCenter,
      buyer_contact_name:
        [order.customer?.first_name, order.customer?.last_name]
          .filter(Boolean)
          .join(" ") || null,
      buyer_contact_email:
        asNonEmptyString(moduleCompany.email) ||
        asNonEmptyString(order.customer?.email) ||
        asNonEmptyString(order.email),
    }
  }

  // Tier 2: Standard Medusa order/customer metadata & billing_address.company fallback
  const companyName =
    asNonEmptyString(orderMeta.company_name) ||
    asNonEmptyString(customerMeta.company_name) ||
    asNonEmptyString(order.billing_address?.company) ||
    asNonEmptyString(order.customer?.company_name) ||
    asNonEmptyString(order.shipping_address?.company)

  const taxId =
    asNonEmptyString(orderMeta[taxIdKey]) ||
    asNonEmptyString(orderMeta.tax_id) ||
    asNonEmptyString(orderMeta.buyer_tax_id) ||
    asNonEmptyString(customerMeta[taxIdKey]) ||
    asNonEmptyString(customerMeta.tax_id) ||
    asNonEmptyString(billingMeta.tax_id)

  const vatNumber =
    asNonEmptyString(orderMeta[vatKey]) ||
    asNonEmptyString(orderMeta.vat_number) ||
    asNonEmptyString(orderMeta.vat_id) ||
    asNonEmptyString(customerMeta[vatKey]) ||
    asNonEmptyString(customerMeta.vat_number) ||
    asNonEmptyString(billingMeta.vat_number)

  const registrationNumber =
    asNonEmptyString(orderMeta[regKey]) ||
    asNonEmptyString(orderMeta.registration_number) ||
    asNonEmptyString(customerMeta[regKey])

  const poNumber =
    asNonEmptyString(orderMeta[poKey]) ||
    asNonEmptyString(orderMeta.po_number) ||
    asNonEmptyString(orderMeta.purchase_order) ||
    asNonEmptyString(orderMeta.purchase_order_number)

  const paymentTerms =
    asNonEmptyString(orderMeta[termsKey]) ||
    asNonEmptyString(orderMeta.payment_terms) ||
    asNonEmptyString(customerMeta[termsKey]) ||
    asNonEmptyString(customerMeta.payment_terms)

  const costCenter =
    asNonEmptyString(orderMeta.cost_center) ||
    asNonEmptyString(customerMeta.cost_center)

  const hasB2BSignals = Boolean(
    companyName ||
      taxId ||
      vatNumber ||
      registrationNumber ||
      poNumber ||
      paymentTerms ||
      costCenter
  )

  if (!hasB2BSignals) {
    return { is_b2b: false, source: "none" }
  }

  return {
    is_b2b: true,
    source: "metadata",
    company_id:
      asNonEmptyString(orderMeta.company_id) ||
      asNonEmptyString(customerMeta.company_id),
    company_name: companyName,
    tax_id: taxId,
    vat_number: vatNumber,
    registration_number: registrationNumber,
    po_number: poNumber,
    payment_terms: paymentTerms,
    cost_center: costCenter,
    buyer_contact_name:
      [
        order.customer?.first_name || order.billing_address?.first_name,
        order.customer?.last_name || order.billing_address?.last_name,
      ]
        .filter(Boolean)
        .join(" ") || null,
    buyer_contact_email:
      asNonEmptyString(order.customer?.email) || asNonEmptyString(order.email),
  }
}

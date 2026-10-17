import { MedusaError } from "@medusajs/framework/utils"
import {
  B2B_COMPANY_MODULE_KEY,
  DIAN_CONSUMIDOR_FINAL,
  DIAN_ERROR_CODES,
  type DianBuyerSnapshot,
  type DianDocumentType,
  type DianIdentificationType,
  type DianOrganizationType,
  type DianTaxRegime,
} from "../../../types"
import { resolveDaneMunicipality } from "./dane-catalog"
import { calculateColombianNitDv, sanitizeNitDigits } from "./nit-dv"

export interface ResolveDianBuyerInput {
  order: Record<string, any>
  document_type: DianDocumentType
  fiscal_profile?: Record<string, any> | null
  force_consumidor_final?: boolean
  b2b_module_key?: string
  container?: { resolve: (key: string) => unknown } | null
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
 * Resolves and validates the Colombian DIAN Buyer (`Adquirente`) snapshot:
 * 1. If anonymous/unlinked and `force_consumidor_final` or POS (`20`) without fiscal request,
 *    falls back to official DIAN Consumidor Final (`222222222222`).
 * 2. Anyone requesting a named Electronic Invoice MUST be a registered Medusa Customer (`customer_id`)
 *    with both a valid `email` and `phone`.
 * 3. Any Legal Client (`organization_type === "1"` / Persona Jurídica) MUST resolve through
 *    `@vicacha-devs/medusa-plugin-b2b` (`company` module) with a valid B2B Company record.
 */
export async function resolveAndValidateDianBuyer(
  input: ResolveDianBuyerInput
): Promise<DianBuyerSnapshot> {
  const { order, fiscal_profile, force_consumidor_final, container } = input
  const orderMeta = (order?.metadata ?? {}) as Record<string, any>
  const customer = (order?.customer ?? null) as Record<string, any> | null
  const customerMeta = (customer?.metadata ?? {}) as Record<string, any>
  const billingAddress = (order?.billing_address ?? null) as Record<
    string,
    any
  > | null

  const customerId =
    asNonEmptyString(order?.customer_id) ||
    asNonEmptyString(customer?.id) ||
    asNonEmptyString(fiscal_profile?.customer_id)

  const wantsElectronicInvoice = Boolean(
    fiscal_profile ||
      orderMeta.dian_wants_electronic_invoice ||
      orderMeta.dian_identification_number ||
      orderMeta.dian_organization_type ||
      orderMeta.company_id ||
      order?.company
  )

  if (
    force_consumidor_final ||
    (!wantsElectronicInvoice && !customerId)
  ) {
    return {
      is_anonymous_consumidor_final: true,
      is_b2b_legal_client: false,
      customer_id: null,
      company_id: null,
      identification_type: DIAN_CONSUMIDOR_FINAL.identification_type,
      identification_number: DIAN_CONSUMIDOR_FINAL.identification_number,
      dv: null,
      organization_type: DIAN_CONSUMIDOR_FINAL.organization_type,
      tax_regime: DIAN_CONSUMIDOR_FINAL.tax_regime,
      fiscal_responsibilities: [...DIAN_CONSUMIDOR_FINAL.fiscal_responsibilities],
      tributo_id: DIAN_CONSUMIDOR_FINAL.tributo_id,
      registration_name: DIAN_CONSUMIDOR_FINAL.name,
      trade_name: DIAN_CONSUMIDOR_FINAL.name,
      first_name: "Consumidor",
      last_name: "Final",
      email:
        asNonEmptyString(order?.email) || DIAN_CONSUMIDOR_FINAL.email,
      phone:
        asNonEmptyString(billingAddress?.phone) ||
        DIAN_CONSUMIDOR_FINAL.phone,
      address_line:
        asNonEmptyString(billingAddress?.address_1) ||
        DIAN_CONSUMIDOR_FINAL.address,
      municipality_code: DIAN_CONSUMIDOR_FINAL.municipality_code,
      municipality_name: DIAN_CONSUMIDOR_FINAL.city_name,
      department_code: DIAN_CONSUMIDOR_FINAL.department_code,
      department_name: DIAN_CONSUMIDOR_FINAL.department_name,
      postal_code: "110111",
      country_code: "CO",
    }
  }

  // Rule 1: People who want an electronic invoice must be our clients (registered customer) with email AND phone
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Buyers requesting a DIAN Electronic Invoice must be registered clients (customer_id is required).",
      DIAN_ERROR_CODES.CLIENT_REQUIRED
    )
  }

  const resolvedOrganizationType = (asNonEmptyString(
    fiscal_profile?.organization_type
  ) ||
    asNonEmptyString(orderMeta.dian_organization_type) ||
    asNonEmptyString(customerMeta.dian_organization_type) ||
    (order?.company || orderMeta.company_id || fiscal_profile?.company_id
      ? "1"
      : "2")) as DianOrganizationType

  const isLegalClient = resolvedOrganizationType === "1"

  // Rule 2: If we want to add/invoice a Legal Client (Persona Jurídica = "1"), we NEED @vicacha-devs/medusa-plugin-b2b
  let b2bCompany: Record<string, any> | null =
    order?.company && typeof order.company === "object" ? order.company : null

  const companyId =
    asNonEmptyString(fiscal_profile?.company_id) ||
    asNonEmptyString(orderMeta.company_id) ||
    asNonEmptyString(customerMeta.company_id) ||
    asNonEmptyString(b2bCompany?.id)

  if (isLegalClient) {
    const b2bKey = input.b2b_module_key || B2B_COMPANY_MODULE_KEY
    let b2bService: Record<string, any> | null = null

    if (container && typeof container.resolve === "function") {
      const candidateKeys = [b2bKey, "company", "b2b", "companyModuleService"]
      for (const key of candidateKeys) {
        try {
          const resolved = container.resolve(key) as Record<string, any> | null
          if (resolved && typeof resolved === "object") {
            b2bService = resolved
            break
          }
        } catch {
          // Continue checking candidate keys
        }
      }
    }

    if (!b2bService && !b2bCompany) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "@vicacha-devs/medusa-plugin-b2b is required to register or emit DIAN Electronic Invoices for Legal Clients (Persona Jurídica).",
        DIAN_ERROR_CODES.B2B_PLUGIN_REQUIRED_FOR_LEGAL_CLIENT
      )
    }

    if (!b2bCompany && b2bService && companyId) {
      if (typeof b2bService.retrieveCompany === "function") {
        b2bCompany = await b2bService.retrieveCompany(companyId)
      } else if (typeof b2bService.listCompanies === "function") {
        const list = await b2bService.listCompanies({ id: companyId })
        b2bCompany = Array.isArray(list) ? list[0] ?? null : null
      }
    }

    if (!b2bCompany) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Legal Clients (Persona Jurídica) must be linked to a valid B2B Company in @vicacha-devs/medusa-plugin-b2b.",
        DIAN_ERROR_CODES.B2B_COMPANY_REQUIRED_FOR_LEGAL_CLIENT
      )
    }
  }

  const email =
    asNonEmptyString(fiscal_profile?.email) ||
    asNonEmptyString(b2bCompany?.email) ||
    asNonEmptyString(customer?.email) ||
    asNonEmptyString(order?.email)

  const phone =
    asNonEmptyString(fiscal_profile?.phone) ||
    asNonEmptyString(b2bCompany?.phone) ||
    asNonEmptyString(customer?.phone) ||
    asNonEmptyString(billingAddress?.phone) ||
    asNonEmptyString(order?.shipping_address?.phone)

  if (!email || !phone) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Clients requesting a DIAN Electronic Invoice must have both a valid email address and phone number.",
      DIAN_ERROR_CODES.CLIENT_CONTACT_REQUIRED
    )
  }

  const identificationType = (asNonEmptyString(
    fiscal_profile?.identification_type
  ) ||
    asNonEmptyString(orderMeta.dian_identification_type) ||
    asNonEmptyString(customerMeta.dian_identification_type) ||
    (isLegalClient ? "31" : "13")) as DianIdentificationType

  const rawIdNumber =
    asNonEmptyString(fiscal_profile?.identification_number) ||
    asNonEmptyString(b2bCompany?.tax_id) ||
    asNonEmptyString(b2bCompany?.nit) ||
    asNonEmptyString(orderMeta.dian_identification_number) ||
    asNonEmptyString(customerMeta.dian_identification_number)

  if (!rawIdNumber) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Client fiscal identification number (NIT / Cédula) is required for DIAN Electronic Invoicing.",
      DIAN_ERROR_CODES.CLIENT_REQUIRED
    )
  }

  const cleanIdNumber = sanitizeNitDigits(rawIdNumber)
  const needsDv = identificationType === "31" || isLegalClient
  const dv = needsDv
    ? asNonEmptyString(fiscal_profile?.dv) ||
      calculateColombianNitDv(cleanIdNumber)
    : null

  if (needsDv && dv) {
    const expectedDv = calculateColombianNitDv(cleanIdNumber)
    if (dv !== expectedDv) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid NIT check digit (DV) "${dv}" for NIT ${cleanIdNumber}. Expected Modulo-11 DV "${expectedDv}".`,
        DIAN_ERROR_CODES.INVALID_NIT_DV
      )
    }
  }

  const municipality = resolveDaneMunicipality(
    asNonEmptyString(fiscal_profile?.municipality_code) ||
      asNonEmptyString(b2bCompany?.city) ||
      asNonEmptyString(billingAddress?.city),
    asNonEmptyString(fiscal_profile?.department_code) ||
      asNonEmptyString(b2bCompany?.state) ||
      asNonEmptyString(billingAddress?.province)
  )

  const firstName =
    asNonEmptyString(fiscal_profile?.first_name) ||
    asNonEmptyString(customer?.first_name) ||
    asNonEmptyString(billingAddress?.first_name) ||
    "Cliente"
  const lastName =
    asNonEmptyString(fiscal_profile?.last_name) ||
    asNonEmptyString(customer?.last_name) ||
    asNonEmptyString(billingAddress?.last_name) ||
    ""

  const registrationName = isLegalClient
    ? asNonEmptyString(b2bCompany?.name) ||
      asNonEmptyString(fiscal_profile?.registration_name) ||
      `${firstName} ${lastName}`.trim()
    : asNonEmptyString(fiscal_profile?.registration_name) ||
      `${firstName} ${lastName}`.trim()

  const taxRegime = (asNonEmptyString(fiscal_profile?.tax_regime) ||
    (isLegalClient ? "48" : "49")) as DianTaxRegime

  const responsibilities: string[] = Array.isArray(
    fiscal_profile?.fiscal_responsibilities
  )
    ? fiscal_profile.fiscal_responsibilities
    : ["R-99-PN"]

  return {
    is_anonymous_consumidor_final: false,
    is_b2b_legal_client: isLegalClient,
    customer_id: customerId,
    company_id: asNonEmptyString(b2bCompany?.id) || companyId || null,
    identification_type: identificationType,
    identification_number: cleanIdNumber,
    dv,
    organization_type: resolvedOrganizationType,
    tax_regime: taxRegime,
    fiscal_responsibilities: responsibilities,
    tributo_id: taxRegime === "48" ? "01" : "ZZ",
    registration_name: registrationName,
    trade_name: asNonEmptyString(b2bCompany?.name) || registrationName,
    first_name: isLegalClient ? null : firstName,
    last_name: isLegalClient ? null : lastName,
    email,
    phone,
    address_line:
      asNonEmptyString(fiscal_profile?.address_line) ||
      asNonEmptyString(b2bCompany?.address) ||
      asNonEmptyString(billingAddress?.address_1) ||
      municipality.name,
    municipality_code: municipality.code,
    municipality_name: municipality.name,
    department_code: municipality.department_code,
    department_name: municipality.department_name,
    postal_code:
      asNonEmptyString(fiscal_profile?.postal_code) ||
      asNonEmptyString(b2bCompany?.zip) ||
      asNonEmptyString(billingAddress?.postal_code) ||
      municipality.default_postal_code,
    country_code: (
      asNonEmptyString(b2bCompany?.country) ||
      asNonEmptyString(billingAddress?.country_code) ||
      "CO"
    ).toUpperCase(),
  }
}

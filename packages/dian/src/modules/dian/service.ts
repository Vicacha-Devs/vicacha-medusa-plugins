import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  DianConfig,
  DianCustomerFiscalProfile,
  DianElectronicDocument,
  DianResolution,
} from "./models"
import {
  DIAN_ERROR_CODES,
  type DianAcquirerLookupResult,
  type DianAuditLogEntry,
  type DianDocumentBuildContext,
  type DianDocumentType,
  type DianEnvironment,
  type DianNumberingRangeItem,
  type DianPaymentForm,
  type DianPaymentMeans,
  type DianPluginOptions,
  type DianProviderType,
  type DianResolutionSnapshot,
  type DianSellerSnapshot,
  type EmitDianDocumentInput,
} from "../../types"
import {
  buildDianAttachedDocumentXml,
  buildDianQrPayload,
  buildDianUblXml,
  calculateColombianNitDv,
  calculateCufeOrCude,
  calculateSoftwareSecurityCode,
  createDianZipArchive,
  generateDianPdfViaDocumentsPlugin,
  getColombiaDateTime,
  isCudeDocumentType,
  mapOrderLinesAndTaxesForDian,
  resolveAndValidateDianBuyer,
  resolveDaneMunicipality,
  sanitizeNitDigits,
  signDianUblXmlXadesEpes,
} from "./utils"
import {
  ExternalErpDianProvider,
  NativeDianSoapProvider,
} from "./providers"

type InjectedDependencies = Record<string, unknown>

class DianModuleService extends MedusaService({
  DianConfig,
  DianResolution,
  DianCustomerFiscalProfile,
  DianElectronicDocument,
}) {
  protected readonly options_: DianPluginOptions
  protected readonly container_: InjectedDependencies
  public readonly soapProvider: NativeDianSoapProvider

  constructor(container: InjectedDependencies, options?: DianPluginOptions) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.container_ = container ?? {}
    this.options_ = options ?? {}
    this.soapProvider = new NativeDianSoapProvider()
  }

  async getPluginOptions(): Promise<DianPluginOptions> {
    return this.options_
  }

  /**
   * Retrieves the global DIAN configuration (`scope_key = "global"`), seeding
   * sensible Colombian Habilitación defaults (`SETP` 990000000..995000000) if none exists.
   */
  async getGlobalConfig(): Promise<Record<string, any>> {
    const existing = await this.listDianConfigs({ scope_key: "global" })
    if (existing.length > 0) {
      return existing[0]
    }

    const sellerNit = "900123456"
    const sellerDv = calculateColombianNitDv(sellerNit)

    const created = await this.createDianConfigs({
      scope_key: "global",
      environment: "2",
      provider: this.options_.default_provider || "native_soap",
      seller_nit: sellerNit,
      seller_dv: sellerDv,
      organization_type: "1",
      tax_regime: "48",
      fiscal_responsibilities: ["O-23", "R-99-PN"],
      tributo_id: "01",
      registration_name: "Mi Empresa Colombia S.A.S.",
      trade_name: "Mi Tienda Oficial",
      ciiu_code: "4791",
      email: "facturacion@miempresa.co",
      phone: "6012345678",
      address_line: "Calle 100 # 15-20",
      municipality_code: "11001",
      municipality_name: "Bogotá, D.C.",
      department_code: "11",
      department_name: "Bogotá, D.C.",
      postal_code: "110111",
      country_code: "CO",
      software_id: "56f2ae4e-9812-41f9-895a-0123456789ab",
      software_pin: "12345",
      test_set_id: "testset-dian-hab-001",
      auto_emit_on_order_placed: false,
      auto_emit_on_payment_captured: true,
      auto_emit_on_order_fulfilled: false,
      auto_emit_credit_note_on_refund: true,
      enable_contingency_fallback: true,
      enable_withholdings: true,
      retefuente_goods_rate: 2.5,
      reteiva_rate: 15,
      reteica_rate_per_thousand: 11.04,
      default_iva_rate: 19,
      auto_send_attached_document_email: true,
    })

    // Ensure default DIAN Habilitación SETP resolution exists
    const resolutions = await this.listDianResolutions({})
    if (resolutions.length === 0) {
      await this.createDianResolutions([
        {
          resolution_number: "18760000001",
          resolution_date: "2019-01-19",
          prefix: "SETP",
          document_type: "01",
          from_number: 990000000,
          to_number: 995000000,
          current_number: 990000000,
          valid_from: "2019-01-19",
          valid_to: "2030-01-19",
          technical_key: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
          alert_threshold: 100,
          is_active: true,
          is_contingency: false,
        },
        {
          resolution_number: "18760000002",
          resolution_date: "2024-01-01",
          prefix: "NC",
          document_type: "91",
          from_number: 1,
          to_number: 999999,
          current_number: 1,
          valid_from: "2024-01-01",
          valid_to: "2030-12-31",
          technical_key: null,
          alert_threshold: 50,
          is_active: true,
          is_contingency: false,
        },
        {
          resolution_number: "18760000003",
          resolution_date: "2024-01-01",
          prefix: "ND",
          document_type: "92",
          from_number: 1,
          to_number: 999999,
          current_number: 1,
          valid_from: "2024-01-01",
          valid_to: "2030-12-31",
          technical_key: null,
          alert_threshold: 50,
          is_active: true,
          is_contingency: false,
        },
        {
          resolution_number: "18760000004",
          resolution_date: "2024-01-01",
          prefix: "POS",
          document_type: "20",
          from_number: 1,
          to_number: 999999,
          current_number: 1,
          valid_from: "2024-01-01",
          valid_to: "2030-12-31",
          technical_key: null,
          alert_threshold: 100,
          is_active: true,
          is_contingency: false,
        },
      ])
    }

    return created
  }

  /**
   * Updates or creates the global DIAN configuration, automatically computing the
   * Modulo-11 check digit (`seller_dv`) and DANE municipality details.
   */
  async upsertConfig(
    payload: Record<string, unknown>
  ): Promise<Record<string, any>> {
    const existing = await this.getGlobalConfig()
    const clean = { ...payload }
    delete clean.id
    delete clean.created_at
    delete clean.updated_at
    delete clean.deleted_at

    if (typeof clean.seller_nit === "string" && clean.seller_nit.trim()) {
      const nitDigits = sanitizeNitDigits(clean.seller_nit)
      clean.seller_nit = nitDigits
      clean.seller_dv = calculateColombianNitDv(nitDigits)
    }

    if (
      typeof clean.municipality_code === "string" &&
      clean.municipality_code.trim()
    ) {
      const mun = resolveDaneMunicipality(clean.municipality_code)
      clean.municipality_code = mun.code
      clean.municipality_name = mun.name
      clean.department_code = mun.department_code
      clean.department_name = mun.department_name
    }

    return await this.updateDianConfigs({
      id: existing.id,
      ...clean,
      scope_key: "global",
    })
  }

  /**
   * Creates or updates a Formulario 1876 numbering resolution (`DianResolution`).
   */
  async upsertResolution(
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const fromNum = Number(payload.from_number ?? 1)
    const toNum = Number(payload.to_number ?? 999999)
    if (fromNum > toNum) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid DIAN resolution range: from_number (${fromNum}) cannot exceed to_number (${toNum}).`
      )
    }

    if (payload.id) {
      return await this.updateDianResolutions({
        ...payload,
        from_number: fromNum,
        to_number: toNum,
      })
    }

    return await this.createDianResolutions({
      resolution_number: String(payload.resolution_number || "18760000001"),
      resolution_date: payload.resolution_date || "2024-01-01",
      prefix: String(payload.prefix || "FE").toUpperCase(),
      document_type: payload.document_type || "01",
      from_number: fromNum,
      to_number: toNum,
      current_number: Number(payload.current_number ?? fromNum),
      valid_from: String(payload.valid_from || "2024-01-01"),
      valid_to: String(payload.valid_to || "2030-12-31"),
      technical_key: payload.technical_key ?? null,
      sales_channel_id: payload.sales_channel_id ?? null,
      stock_location_id: payload.stock_location_id ?? null,
      pos_terminal_id: payload.pos_terminal_id ?? null,
      alert_threshold: Number(payload.alert_threshold ?? 100),
      is_active: payload.is_active !== false,
      is_contingency: Boolean(payload.is_contingency),
      metadata: payload.metadata ?? null,
    })
  }

  /**
   * Synchronizes numbering ranges from DIAN SOAP `GetNumberingRange` and upserts them locally.
   */
  async syncNumberingRangesFromDian(): Promise<DianNumberingRangeItem[]> {
    const cfg = await this.getGlobalConfig()
    const ranges = await this.soapProvider.getNumberingRanges({
      seller_nit: cfg.seller_nit,
      software_id: cfg.software_id,
      environment: cfg.environment as DianEnvironment,
    })

    for (const item of ranges) {
      const existing = await this.listDianResolutions({
        resolution_number: item.resolution_number,
        prefix: item.prefix,
      })
      if (existing.length > 0) {
        await this.updateDianResolutions({
          id: existing[0].id,
          technical_key: item.technical_key,
          valid_from: item.valid_from,
          valid_to: item.valid_to,
          from_number: item.from_number,
          to_number: item.to_number,
        })
      } else {
        await this.createDianResolutions({
          resolution_number: item.resolution_number,
          resolution_date: item.resolution_date,
          prefix: item.prefix,
          document_type: "01",
          from_number: item.from_number,
          to_number: item.to_number,
          current_number: item.from_number,
          valid_from: item.valid_from,
          valid_to: item.valid_to,
          technical_key: item.technical_key,
          is_active: true,
        })
      }
    }

    return ranges
  }

  /**
   * Atomically allocates the next consecutive number from an active `DianResolution`.
   */
  async allocateNextResolutionConsecutive(params: {
    document_type: DianDocumentType
    resolution_id?: string | null
    sales_channel_id?: string | null
    stock_location_id?: string | null
    pos_terminal_id?: string | null
    reference_date?: string
  }): Promise<{
    consecutive: number
    document_number: string
    resolution: DianResolutionSnapshot
    near_exhaustion: boolean
    remaining_numbers: number
  }> {
    await this.getGlobalConfig()

    let candidates: Record<string, any>[] = []
    if (params.resolution_id) {
      candidates = await this.listDianResolutions({
        id: params.resolution_id,
      })
    } else {
      const allActive = await this.listDianResolutions({
        document_type: params.document_type,
        is_active: true,
      })
      candidates = allActive.filter((r: any) => {
        if (
          params.pos_terminal_id &&
          r.pos_terminal_id &&
          r.pos_terminal_id !== params.pos_terminal_id
        ) {
          return false
        }
        if (
          params.sales_channel_id &&
          r.sales_channel_id &&
          r.sales_channel_id !== params.sales_channel_id
        ) {
          return false
        }
        return true
      })
    }

    if (candidates.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No active DIAN numbering resolution (Formulario 1876) found for document type "${params.document_type}".`,
        DIAN_ERROR_CODES.RESOLUTION_NOT_FOUND
      )
    }

    const res = candidates[0]
    const refDate =
      params.reference_date || getColombiaDateTime().issue_date

    if (res.valid_to && refDate > String(res.valid_to)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `DIAN Resolution ${res.resolution_number} (${res.prefix}) expired on ${res.valid_to}.`,
        DIAN_ERROR_CODES.RESOLUTION_EXPIRED
      )
    }

    const consecutive = Number(res.current_number ?? res.from_number)
    const toNumber = Number(res.to_number)
    if (consecutive > toNumber) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `DIAN Resolution ${res.resolution_number} (${res.prefix}) has exhausted its authorized range (${res.from_number}..${toNumber}).`,
        DIAN_ERROR_CODES.RESOLUTION_EXHAUSTED
      )
    }

    await this.updateDianResolutions({
      id: res.id,
      current_number: consecutive + 1,
    })

    const prefix = String(res.prefix || "").trim()
    const documentNumber = `${prefix}${consecutive}`
    const remaining = toNumber - consecutive

    return {
      consecutive,
      document_number: documentNumber,
      resolution: {
        id: res.id,
        resolution_number: String(res.resolution_number),
        prefix,
        document_type: res.document_type as DianDocumentType,
        from_number: Number(res.from_number),
        to_number: toNumber,
        valid_from: String(res.valid_from),
        valid_to: String(res.valid_to),
        technical_key: res.technical_key ?? null,
      },
      near_exhaustion: remaining <= Number(res.alert_threshold ?? 100),
      remaining_numbers: remaining,
    }
  }

  /**
   * Creates or updates a client's Colombian DIAN fiscal profile (`DianCustomerFiscalProfile`).
   *
   * Strictly enforces:
   * 1. `customer_id`, `email`, and `phone` are required (must be a registered client with contact info).
   * 2. If `organization_type === "1"` (Persona Jurídica / Legal Client), `@vicacha-devs/medusa-plugin-b2b`
   *    must be installed and a valid B2B `company_id` must be linked.
   */
  async upsertCustomerFiscalProfile(
    payload: Record<string, any>,
    containerOverride?: { resolve: (key: string) => unknown } | null
  ): Promise<Record<string, any>> {
    const activeContainer =
      containerOverride || (this.container_ as unknown as { resolve: (key: string) => unknown })

    const validatedBuyer = await resolveAndValidateDianBuyer({
      order: {
        customer_id: payload.customer_id,
        email: payload.email,
        company: payload.company ?? null,
        metadata: {
          dian_wants_electronic_invoice: true,
          company_id: payload.company_id ?? null,
        },
      },
      document_type: "01",
      fiscal_profile: payload,
      b2b_module_key: this.options_.b2b_module_key,
      container: activeContainer,
    })

    const existing = await this.listDianCustomerFiscalProfiles({
      customer_id: validatedBuyer.customer_id!,
    })

    const data = {
      customer_id: validatedBuyer.customer_id!,
      company_id: validatedBuyer.company_id ?? null,
      identification_type: validatedBuyer.identification_type,
      identification_number: validatedBuyer.identification_number,
      dv: validatedBuyer.dv ?? null,
      organization_type: validatedBuyer.organization_type,
      tax_regime: validatedBuyer.tax_regime,
      fiscal_responsibilities: validatedBuyer.fiscal_responsibilities,
      tributo_id: validatedBuyer.tributo_id,
      registration_name: validatedBuyer.registration_name,
      trade_name: validatedBuyer.trade_name ?? null,
      first_name: validatedBuyer.first_name ?? null,
      last_name: validatedBuyer.last_name ?? null,
      email: validatedBuyer.email,
      phone: validatedBuyer.phone,
      address_line: validatedBuyer.address_line,
      municipality_code: validatedBuyer.municipality_code,
      municipality_name: validatedBuyer.municipality_name,
      department_code: validatedBuyer.department_code,
      department_name: validatedBuyer.department_name,
      postal_code: validatedBuyer.postal_code || "110111",
      country_code: validatedBuyer.country_code,
      is_verified_in_dian: Boolean(payload.is_verified_in_dian),
      metadata: payload.metadata ?? null,
    }

    if (existing.length > 0) {
      return await this.updateDianCustomerFiscalProfiles({
        id: existing[0].id,
        ...data,
      })
    }

    return await this.createDianCustomerFiscalProfiles(data)
  }

  /**
   * Queries DIAN `GetAcquirer` by identification type and number, returning NIT + DV + name + email.
   */
  async lookupAcquirerInDian(params: {
    identification_type: string
    identification_number: string
  }): Promise<DianAcquirerLookupResult> {
    return await this.soapProvider.lookupAcquirer(params)
  }

  /**
   * Emits a Colombian DIAN Electronic Document (`01` Factura, `02` Exportación, `03` Contingencia,
   * `20` POS Equivalent, `91` Nota Crédito, `92` Nota Débito) for an order:
   * - Validates Client (`email` + `phone` required; B2B plugin required for Legal Clients)
   * - Generates UBL 2.1 XML, CUFE/CUDE SHA-384, XAdES-EPES signature
   * - Transmits to DIAN (SOAP or ERP Provider) with Contingency (`03`) fallback
   * - Generates PDF Representación Gráfica via `@vicacha-devs/medusa-plugin-documents`
   * - Packages official DIAN `AttachedDocument` `.zip`
   */
  async emitElectronicDocumentForOrder(
    input: EmitDianDocumentInput & { order: Record<string, any> },
    containerOverride?: { resolve: (key: string) => unknown } | null
  ): Promise<Record<string, any>> {
    const activeContainer =
      containerOverride || (this.container_ as unknown as { resolve: (key: string) => unknown })

    const cfg = await this.getGlobalConfig()
    const docType: DianDocumentType = input.document_type || "01"
    const environment = (cfg.environment || "2") as DianEnvironment
    const providerType = (cfg.provider ||
      this.options_.default_provider ||
      "native_soap") as DianProviderType

    // 1. Lookup stored fiscal profile for the order's customer if present
    let storedProfile: Record<string, any> | null = null
    const customerId = input.order?.customer_id || input.order?.customer?.id
    if (customerId) {
      const found = await this.listDianCustomerFiscalProfiles({
        customer_id: String(customerId),
      })
      storedProfile = found[0] ?? null
    }

    // 2. Resolve and strictly validate Buyer (Client with email & phone; B2B for Legal Client)
    const buyer = await resolveAndValidateDianBuyer({
      order: input.order,
      document_type: docType,
      fiscal_profile: storedProfile,
      force_consumidor_final: input.force_consumidor_final,
      b2b_module_key: this.options_.b2b_module_key,
      container: activeContainer,
    })

    // 3. Build Seller Snapshot
    const seller: DianSellerSnapshot = {
      nit: String(cfg.seller_nit),
      dv: String(cfg.seller_dv || calculateColombianNitDv(cfg.seller_nit)),
      organization_type: cfg.organization_type || "1",
      tax_regime: cfg.tax_regime || "48",
      fiscal_responsibilities: Array.isArray(cfg.fiscal_responsibilities)
        ? cfg.fiscal_responsibilities
        : ["O-23", "R-99-PN"],
      tributo_id: cfg.tributo_id === "ZZ" ? "ZZ" : "01",
      registration_name: String(cfg.registration_name),
      trade_name: String(cfg.trade_name || cfg.registration_name),
      ciiu_code: String(cfg.ciiu_code || "4791"),
      email: String(cfg.email),
      phone: String(cfg.phone),
      address_line: String(cfg.address_line),
      municipality_code: String(cfg.municipality_code || "11001"),
      municipality_name: String(cfg.municipality_name || "Bogotá, D.C."),
      department_code: String(cfg.department_code || "11"),
      department_name: String(cfg.department_name || "Bogotá, D.C."),
      postal_code: String(cfg.postal_code || "110111"),
      country_code: String(cfg.country_code || "CO"),
      software_id: String(cfg.software_id),
      software_pin: String(cfg.software_pin),
      environment,
    }

    // 4. Allocate next resolution consecutive
    const { issue_date, issue_time } = getColombiaDateTime()
    const allocated = await this.allocateNextResolutionConsecutive({
      document_type: docType,
      resolution_id: input.resolution_id,
      sales_channel_id: input.order?.sales_channel_id ?? null,
      pos_terminal_id: input.pos_terminal_id ?? null,
      reference_date: issue_date,
    })

    // 5. Resolve BillingReference for Credit Note (91) / Debit Note (92)
    let billingReference: DianDocumentBuildContext["billing_reference"] = null
    let discrepancyResponse: DianDocumentBuildContext["discrepancy_response"] =
      null

    if (docType === "91" || docType === "92") {
      let refDoc: Record<string, any> | null = null
      if (input.related_document_id) {
        const foundRef = await this.listDianElectronicDocuments({
          id: input.related_document_id,
        })
        refDoc = foundRef[0] ?? null
      } else {
        const orderInvoices = await this.listDianElectronicDocuments({
          order_id: String(input.order.id),
          document_type: "01",
        })
        refDoc = orderInvoices[0] ?? null
      }

      if (refDoc) {
        billingReference = {
          invoice_number: String(refDoc.document_number),
          cufe: String(refDoc.cufe_cude),
          issue_date: String(refDoc.issue_date),
        }
      }

      discrepancyResponse = {
        concept_code: String(
          input.discrepancy_concept_code || (docType === "91" ? "2" : "4")
        ),
        description: String(
          input.discrepancy_description ||
            (docType === "91"
              ? "Anulación o devolución de Factura Electrónica"
              : "Ajuste por Nota Débito Electrónica")
        ),
      }
    }

    // 6. Map order lines, Colombian taxes (01 IVA, 04 INC, 22 Bolsas) & Withholdings (05, 06, 07)
    const mapped = mapOrderLinesAndTaxesForDian(input.order, seller, buyer, {
      default_iva_rate: Number(cfg.default_iva_rate ?? 19),
      enable_withholdings: Boolean(cfg.enable_withholdings),
      retefuente_goods_rate: Number(cfg.retefuente_goods_rate ?? 2.5),
      reteiva_rate: Number(cfg.reteiva_rate ?? 15),
      reteica_rate_per_thousand: Number(cfg.reteica_rate_per_thousand ?? 11.04),
    })

    const taxIvaAmount = mapped.taxes
      .filter((t) => t.tax_code === "01")
      .reduce((acc, t) => acc + t.tax_amount, 0)
    const taxIncAmount = mapped.taxes
      .filter((t) => t.tax_code === "04")
      .reduce((acc, t) => acc + t.tax_amount, 0)
    const taxIcaAmount = mapped.taxes
      .filter((t) => t.tax_code === "03")
      .reduce((acc, t) => acc + t.tax_amount, 0)
    const otherTaxesAmount = mapped.taxes
      .filter((t) => t.tax_code !== "01")
      .reduce((acc, t) => acc + t.tax_amount, 0)

    // 7. Compute CUFE (with Clave Técnica) or CUDE (with SoftwarePIN) & SoftwareSecurityCode
    const usesCude = isCudeDocumentType(docType)
    const technicalKeyOrPin = usesCude
      ? seller.software_pin
      : String(
          allocated.resolution.technical_key ||
            "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c"
        )

    const cufeResult = calculateCufeOrCude({
      document_type: docType,
      document_number: allocated.document_number,
      issue_date,
      issue_time,
      line_extension_amount: mapped.line_extension_amount,
      tax_iva_amount: taxIvaAmount,
      tax_inc_amount: taxIncAmount,
      tax_ica_amount: taxIcaAmount,
      payable_amount: mapped.payable_amount,
      seller_nit: seller.nit,
      buyer_identification: buyer.identification_number,
      technical_key_or_pin: technicalKeyOrPin,
      environment,
    })

    const softwareSecurityCode = calculateSoftwareSecurityCode(
      seller.software_id,
      seller.software_pin,
      allocated.document_number
    )

    const qrPayload = buildDianQrPayload({
      document_number: allocated.document_number,
      issue_date,
      issue_time,
      seller_nit: seller.nit,
      buyer_identification: buyer.identification_number,
      line_extension_amount: mapped.line_extension_amount,
      tax_iva_amount: taxIvaAmount,
      other_taxes_amount: otherTaxesAmount,
      payable_amount: mapped.payable_amount,
      cufe_cude: cufeResult.hash,
      environment,
    })

    const paymentForm: DianPaymentForm = input.payment_form || "1"
    const paymentMeans: DianPaymentMeans = input.payment_means || "10"

    const buildContext: DianDocumentBuildContext = {
      document_type: docType,
      environment,
      prefix: allocated.resolution.prefix,
      consecutive: allocated.consecutive,
      document_number: allocated.document_number,
      issue_date,
      issue_time,
      currency_code: String(input.order?.currency_code || "COP").toUpperCase(),
      payment_form: paymentForm,
      payment_means: paymentMeans,
      seller,
      buyer,
      resolution: allocated.resolution,
      items: mapped.items,
      line_extension_amount: mapped.line_extension_amount,
      tax_exclusive_amount: mapped.tax_exclusive_amount,
      tax_inclusive_amount: mapped.tax_inclusive_amount,
      allowance_total_amount: mapped.allowance_total_amount,
      charge_total_amount: mapped.charge_total_amount,
      payable_amount: mapped.payable_amount,
      taxes: mapped.taxes,
      withholdings: mapped.withholdings,
      cufe_cude: cufeResult.hash,
      cufe_cude_algorithm: cufeResult.algorithm,
      software_security_code: softwareSecurityCode,
      qr_url: qrPayload.qr_url,
      qr_data: qrPayload.qr_data,
      billing_reference: billingReference,
      discrepancy_response: discrepancyResponse,
      pos_metadata:
        docType === "20"
          ? {
              terminal_id: String(input.pos_terminal_id || "POS-01"),
              cashier_name: String(input.cashier_name || "Cajero Principal"),
              store_name: seller.trade_name,
              sales_code: String(input.order?.display_id || allocated.consecutive),
              software_maker_name: "Vicacha Medusa DIAN Engine",
            }
          : null,
    }

    // 8. Build UBL 2.1 XML & Sign with XAdES-EPES
    const unsignedXml = buildDianUblXml(buildContext)
    const signedResult = signDianUblXmlXadesEpes(unsignedXml, {
      private_key_pem:
        this.options_.certificate?.private_key_pem ||
        process.env.DIAN_CERTIFICATE_PRIVATE_KEY_PEM ||
        null,
      cert_pem:
        this.options_.certificate?.cert_pem ||
        process.env.DIAN_CERTIFICATE_PEM ||
        null,
      software_security_code: softwareSecurityCode,
    })

    // 9. Package transmission ZIP & Transmit to DIAN (Native SOAP or ERP Provider)
    const xmlFilename = `fv${seller.nit}${allocated.document_number}.xml`
    const zipFilename = `z${seller.nit}${allocated.document_number}.zip`
    const transmissionZipBuffer = createDianZipArchive([
      { filename: xmlFilename, content: signedResult.signed_xml },
    ])

    let transmissionResult
    if (providerType === "native_soap") {
      transmissionResult = await this.soapProvider.transmitDocument({
        context: buildContext,
        zip_filename: zipFilename,
        zip_base64: transmissionZipBuffer.toString("base64"),
        test_set_id: cfg.test_set_id,
        live_network: false,
      })
    } else {
      const erpProvider = new ExternalErpDianProvider(providerType, {
        api_url:
          cfg.provider_api_url || this.options_.provider_credentials?.api_url,
        api_key:
          process.env.DIAN_PROVIDER_API_KEY ||
          this.options_.provider_credentials?.api_key,
        username:
          cfg.provider_username ||
          this.options_.provider_credentials?.username,
        partner_id:
          cfg.provider_partner_id ||
          this.options_.provider_credentials?.partner_id,
      })
      transmissionResult = await erpProvider.transmitDocument({
        context: buildContext,
        signed_xml: signedResult.signed_xml,
      })
    }

    // 10. Generate PDF Representación Gráfica via @vicacha-devs/medusa-plugin-documents (REQUIRED!)
    const pdfResult = await generateDianPdfViaDocumentsPlugin({
      context: buildContext,
      order: input.order,
      container: activeContainer,
      documents_module_key: this.options_.documents_module_key,
    })

    // 11. Build Official DIAN AttachedDocument XML & Package AttachedDocument ZIP (XML + PDF)
    const attachedDocumentXml = buildDianAttachedDocumentXml({
      ctx: buildContext,
      signed_xml: signedResult.signed_xml,
      application_response_xml:
        transmissionResult.application_response_xml || "",
    })

    const attachedZipFilename = `ad${seller.nit}${allocated.document_number}.zip`
    const attachedZipBuffer = createDianZipArchive([
      {
        filename: `ad${seller.nit}${allocated.document_number}.xml`,
        content: attachedDocumentXml,
      },
      {
        filename: `${allocated.document_number}.pdf`,
        content: pdfResult.pdf_buffer,
      },
    ])

    const nowIso = new Date().toISOString()
    const auditLog: DianAuditLogEntry[] = [
      {
        timestamp: nowIso,
        event: "created",
        actor_id: input.actor_id ?? null,
        details: {
          document_number: allocated.document_number,
          document_type: docType,
        },
      },
      {
        timestamp: nowIso,
        event: "signed",
        actor_id: input.actor_id ?? null,
        details: {
          cufe_cude: cufeResult.hash,
          algorithm: cufeResult.algorithm,
        },
      },
      {
        timestamp: nowIso,
        event:
          transmissionResult.status === "validated"
            ? "validated"
            : transmissionResult.status === "contingency"
              ? "contingency"
              : "rejected",
        actor_id: input.actor_id ?? null,
        details: {
          provider: providerType,
          track_id: transmissionResult.track_id,
          status_code: transmissionResult.status_code,
          status_message: transmissionResult.status_message,
        },
      },
      {
        timestamp: nowIso,
        event: "pdf_generated",
        actor_id: input.actor_id ?? null,
        details: {
          pdf_document_id: pdfResult.pdf_document_id,
          template_key: pdfResult.template_key,
          pdf_bytes: pdfResult.pdf_buffer.length,
        },
      },
      {
        timestamp: nowIso,
        event: "attached_document_packaged",
        actor_id: input.actor_id ?? null,
        details: {
          zip_filename: attachedZipFilename,
          zip_bytes: attachedZipBuffer.length,
        },
      },
    ]

    const saved = await this.createDianElectronicDocuments({
      order_id: String(input.order.id),
      customer_id: buyer.customer_id ?? null,
      company_id: buyer.company_id ?? null,
      resolution_id: allocated.resolution.id,
      related_document_id: input.related_document_id ?? null,
      pdf_document_id: pdfResult.pdf_document_id,
      document_type: docType,
      status: transmissionResult.status,
      environment,
      provider: providerType,
      prefix: allocated.resolution.prefix,
      consecutive: allocated.consecutive,
      document_number: allocated.document_number,
      cufe_cude: cufeResult.hash,
      cufe_cude_algorithm: cufeResult.algorithm,
      software_security_code: softwareSecurityCode,
      qr_url: qrPayload.qr_url,
      qr_data: qrPayload.qr_data,
      issue_date,
      issue_time,
      payment_form: paymentForm,
      payment_means: paymentMeans,
      currency_code: buildContext.currency_code,
      line_extension_amount: mapped.line_extension_amount,
      tax_exclusive_amount: mapped.tax_exclusive_amount,
      tax_inclusive_amount: mapped.tax_inclusive_amount,
      allowance_total_amount: mapped.allowance_total_amount,
      charge_total_amount: mapped.charge_total_amount,
      payable_amount: mapped.payable_amount,
      tax_breakdown: mapped.taxes as unknown as Record<string, unknown>,
      withholding_breakdown: mapped.withholdings as unknown as Record<
        string,
        unknown
      >,
      seller_snapshot: seller as unknown as Record<string, unknown>,
      buyer_snapshot: buyer as unknown as Record<string, unknown>,
      resolution_snapshot: allocated.resolution as unknown as Record<
        string,
        unknown
      >,
      discrepancy_concept_code: discrepancyResponse?.concept_code ?? null,
      discrepancy_description: discrepancyResponse?.description ?? null,
      xml_signed: signedResult.signed_xml,
      application_response_xml:
        transmissionResult.application_response_xml ?? null,
      attached_document_xml: attachedDocumentXml,
      zip_filename: attachedZipFilename,
      zip_base64: attachedZipBuffer.toString("base64"),
      dian_track_id: transmissionResult.track_id ?? null,
      dian_status_code: transmissionResult.status_code ?? null,
      dian_status_message: transmissionResult.status_message ?? null,
      dian_errors: (transmissionResult.errors ?? null) as unknown as Record<
        string,
        unknown
      >,
      retry_count: 0,
      validated_at:
        transmissionResult.status === "validated" ? new Date() : null,
      audit_log: auditLog as unknown as Record<string, unknown>,
      metadata: {
        near_exhaustion: allocated.near_exhaustion,
        remaining_numbers: allocated.remaining_numbers,
        pdf_base64: pdfResult.pdf_buffer.toString("base64"),
      },
    })

    return saved
  }

  /**
   * Retrieves the PDF Representación Gráfica Buffer for an emitted DIAN document
   * by delegating to `@vicacha-devs/medusa-plugin-documents`.
   */
  async getElectronicDocumentPdfBuffer(
    documentId: string,
    containerOverride?: { resolve: (key: string) => unknown } | null
  ): Promise<{ buffer: Buffer; document: Record<string, any> }> {
    const docs = await this.listDianElectronicDocuments({ id: documentId })
    if (docs.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `DIAN Electronic Document ${documentId} not found.`
      )
    }
    const doc = docs[0]

    const activeContainer =
      containerOverride || (this.container_ as unknown as { resolve: (key: string) => unknown })
    const moduleKey = this.options_.documents_module_key || "documents"

    let documentsService: Record<string, any> | null = null
    if (activeContainer && typeof activeContainer.resolve === "function") {
      try {
        documentsService = activeContainer.resolve(moduleKey) as Record<
          string,
          any
        >
      } catch {
        documentsService = null
      }
    }

    if (!documentsService) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "@vicacha-devs/medusa-plugin-documents is required to retrieve or render DIAN PDF representations.",
        DIAN_ERROR_CODES.DOCUMENTS_PLUGIN_REQUIRED
      )
    }

    if (
      doc.pdf_document_id &&
      typeof documentsService.getDocumentPdfBuffer === "function"
    ) {
      const res = await documentsService.getDocumentPdfBuffer(
        doc.pdf_document_id
      )
      return { buffer: res.buffer, document: doc }
    }

    if (doc.metadata?.pdf_base64) {
      return {
        buffer: Buffer.from(String(doc.metadata.pdf_base64), "base64"),
        document: doc,
      }
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `PDF representation not found for DIAN document ${doc.document_number}.`
    )
  }

  /**
   * Retrieves the official DIAN `AttachedDocument` `.zip` Buffer (containing
   * the `AttachedDocument` XML + PDF generated by `@vicacha-devs/medusa-plugin-documents`).
   */
  async getAttachedDocumentZipBuffer(documentId: string): Promise<{
    buffer: Buffer
    filename: string
    document: Record<string, any>
  }> {
    const docs = await this.listDianElectronicDocuments({ id: documentId })
    if (docs.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `DIAN Electronic Document ${documentId} not found.`
      )
    }
    const doc = docs[0]
    if (!doc.zip_base64) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `AttachedDocument ZIP is not available for DIAN document ${doc.document_number}.`
      )
    }

    return {
      buffer: Buffer.from(String(doc.zip_base64), "base64"),
      filename: String(doc.zip_filename || `ad_${doc.document_number}.zip`),
      document: doc,
    }
  }
}

export default DianModuleService

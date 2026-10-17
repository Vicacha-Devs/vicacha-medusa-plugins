import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildDianAttachedDocumentXml,
  buildDianQrPayload,
  buildDianUblXml,
  calculateColombianNitDv,
  calculateCufeOrCude,
  calculateSoftwareSecurityCode,
  createDianZipArchive,
  mapOrderLinesAndTaxesForDian,
  parseNitWithDv,
  resolveDaneMunicipality,
  signDianUblXmlXadesEpes,
  validateColombianNitDv,
} from "../modules/dian/utils"
import { sanitizeSoapXmlResponse } from "../modules/dian/providers"
import type {
  DianBuyerSnapshot,
  DianDocumentBuildContext,
  DianSellerSnapshot,
} from "../types"

describe("Colombian DIAN Fiscal Engine (Modulo-11, CUFE/CUDE SHA-384, UBL 2.1, XAdES-EPES)", () => {
  it("calculates and validates official Colombian NIT Modulo-11 check digits (DV)", () => {
    // Official DIAN NIT: 800197268-4
    assert.equal(calculateColombianNitDv("800197268"), "4")
    assert.equal(validateColombianNitDv("800197268", "4"), true)
    assert.equal(validateColombianNitDv("800197268", "9"), false)

    // Bancolombia NIT: 890903938-8
    assert.equal(calculateColombianNitDv("890.903.938"), "8")

    const parsed = parseNitWithDv("800197268-4")
    assert.deepEqual(parsed, { nit: "800197268", dv: "4" })

    assert.throws(() => parseNitWithDv("800197268-9"), /expected Modulo-11 DV/)
  })

  it("resolves DANE DIVIPOLA municipalities by code and city name", () => {
    const medellin = resolveDaneMunicipality("Medellín")
    assert.equal(medellin.code, "05001")
    assert.equal(medellin.department_code, "05")

    const bogota = resolveDaneMunicipality("11001")
    assert.equal(bogota.name, "Bogotá, D.C.")

    const cali = resolveDaneMunicipality("Cali")
    assert.equal(cali.code, "76001")
  })

  it("computes SHA-384 CUFE for Factura (01) and CUDE for Nota Crédito (91) / POS (20)", () => {
    const cufe = calculateCufeOrCude({
      document_type: "01",
      document_number: "SETP990000001",
      issue_date: "2026-10-15",
      issue_time: "14:30:00-05:00",
      line_extension_amount: 100000,
      tax_iva_amount: 19000,
      tax_inc_amount: 0,
      tax_ica_amount: 0,
      payable_amount: 119000,
      seller_nit: "900123456",
      buyer_identification: "222222222222",
      technical_key_or_pin: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
      environment: "2",
    })

    assert.equal(cufe.algorithm, "CUFE-SHA384")
    assert.equal(cufe.hash.length, 96) // 384 bits = 96 hex chars

    const cude = calculateCufeOrCude({
      document_type: "91",
      document_number: "NC1",
      issue_date: "2026-10-15",
      issue_time: "14:35:00-05:00",
      line_extension_amount: 100000,
      tax_iva_amount: 19000,
      tax_inc_amount: 0,
      tax_ica_amount: 0,
      payable_amount: 119000,
      seller_nit: "900123456",
      buyer_identification: "222222222222",
      technical_key_or_pin: "12345",
      environment: "2",
    })
    assert.equal(cude.algorithm, "CUDE-SHA384")
    assert.equal(cude.hash.length, 96)

    const secCode = calculateSoftwareSecurityCode(
      "software-id-001",
      "12345",
      "SETP990000001"
    )
    assert.equal(secCode.length, 96)
  })

  it("maps Colombian taxes (01 IVA, 04 INC) and informational B2B withholdings (05 ReteIVA, 06 ReteFuente, 07 ReteICA)", () => {
    const seller: DianSellerSnapshot = {
      nit: "900123456",
      dv: "8",
      organization_type: "1",
      tax_regime: "48",
      fiscal_responsibilities: ["R-99-PN"],
      tributo_id: "01",
      registration_name: "Vendedor Colombia S.A.S.",
      trade_name: "Tienda Colombia",
      ciiu_code: "4791",
      email: "ventas@tienda.co",
      phone: "6012345678",
      address_line: "Calle 100 # 15-20",
      municipality_code: "11001",
      municipality_name: "Bogotá, D.C.",
      department_code: "11",
      department_name: "Bogotá, D.C.",
      postal_code: "110111",
      country_code: "CO",
      software_id: "soft-1",
      software_pin: "12345",
      environment: "2",
    }

    const b2bBuyer: DianBuyerSnapshot = {
      is_anonymous_consumidor_final: false,
      is_b2b_legal_client: true,
      customer_id: "cus_1",
      company_id: "comp_1",
      identification_type: "31",
      identification_number: "890903938",
      dv: "8",
      organization_type: "1",
      tax_regime: "48",
      fiscal_responsibilities: ["O-13", "O-23"],
      tributo_id: "01",
      registration_name: "Empresa Compradora S.A.",
      email: "compras@empresa.co",
      phone: "6045551234",
      address_line: "Cra 43A # 1-50",
      municipality_code: "05001",
      municipality_name: "Medellín",
      department_code: "05",
      department_name: "Antioquia",
      country_code: "CO",
    }

    const order = {
      id: "order_1",
      items: [
        {
          id: "item_1",
          title: "Computador Portátil",
          sku: "LAP-001",
          quantity: 2,
          unit_price: 1000000,
          subtotal: 2000000,
          tax_lines: [{ code: "IVA19", name: "IVA 19%", rate: 19, total: 380000 }],
        },
      ],
    }

    const mapped = mapOrderLinesAndTaxesForDian(order, seller, b2bBuyer, {
      enable_withholdings: true,
      retefuente_goods_rate: 2.5,
      reteiva_rate: 15,
      reteica_rate_per_thousand: 11.04,
    })

    // PayableAmount is NOT reduced by informational withholdings per DIAN Anexo 1.9
    assert.equal(mapped.line_extension_amount, 2000000)
    assert.equal(mapped.payable_amount, 2380000)
    assert.equal(mapped.taxes.length, 1)
    assert.equal(mapped.taxes[0].tax_code, "01")
    assert.equal(mapped.taxes[0].tax_amount, 380000)

    // Withholdings: 06 ReteFuente (2.5% of 2,000,000 = 50,000), 05 ReteIVA (15% of 380,000 = 57,000), 07 ReteICA
    assert.equal(mapped.withholdings.length, 3)
    const reteFuente = mapped.withholdings.find(
      (w) => w.withholding_code === "06"
    )
    const reteIva = mapped.withholdings.find((w) => w.withholding_code === "05")
    assert.equal(reteFuente?.withholding_amount, 50000)
    assert.equal(reteIva?.withholding_amount, 57000)
  })

  it("generates UBL 2.1 XML, signs with XAdES-EPES, builds AttachedDocument, and packages PKZIP", () => {
    const qr = buildDianQrPayload({
      document_number: "SETP990000001",
      issue_date: "2026-10-15",
      issue_time: "14:30:00-05:00",
      seller_nit: "900123456",
      buyer_identification: "890903938",
      line_extension_amount: 100000,
      tax_iva_amount: 19000,
      other_taxes_amount: 0,
      payable_amount: 119000,
      cufe_cude: "a".repeat(96),
      environment: "2",
    })

    const ctx: DianDocumentBuildContext = {
      document_type: "01",
      environment: "2",
      prefix: "SETP",
      consecutive: 990000001,
      document_number: "SETP990000001",
      issue_date: "2026-10-15",
      issue_time: "14:30:00-05:00",
      currency_code: "COP",
      payment_form: "1",
      payment_means: "10",
      seller: {
        nit: "900123456",
        dv: "8",
        organization_type: "1",
        tax_regime: "48",
        fiscal_responsibilities: ["O-23"],
        tributo_id: "01",
        registration_name: "Mi Empresa S.A.S.",
        trade_name: "Mi Tienda",
        ciiu_code: "4791",
        email: "facturacion@miempresa.co",
        phone: "6012345678",
        address_line: "Calle 100",
        municipality_code: "11001",
        municipality_name: "Bogotá, D.C.",
        department_code: "11",
        department_name: "Bogotá, D.C.",
        postal_code: "110111",
        country_code: "CO",
        software_id: "soft-1",
        software_pin: "12345",
        environment: "2",
      },
      buyer: {
        is_anonymous_consumidor_final: false,
        is_b2b_legal_client: true,
        customer_id: "cus_1",
        company_id: "comp_1",
        identification_type: "31",
        identification_number: "890903938",
        dv: "8",
        organization_type: "1",
        tax_regime: "48",
        fiscal_responsibilities: ["O-13"],
        tributo_id: "01",
        registration_name: "Cliente Jurídico S.A.",
        email: "cliente@juridico.co",
        phone: "3001234567",
        address_line: "Av Poblado",
        municipality_code: "05001",
        municipality_name: "Medellín",
        department_code: "05",
        department_name: "Antioquia",
        country_code: "CO",
      },
      resolution: {
        id: "dres_1",
        resolution_number: "18760000001",
        prefix: "SETP",
        document_type: "01",
        from_number: 990000000,
        to_number: 995000000,
        valid_from: "2019-01-19",
        valid_to: "2030-01-19",
        technical_key: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
      },
      items: [
        {
          id: "item_1",
          line_number: 1,
          title: "Café de Origen Colombiano",
          sku: "CAFE-500G",
          standard_code_id: "999",
          standard_item_id: "CAFE-500G",
          unit_code: "94",
          quantity: 1,
          unit_price: 100000,
          discount_amount: 0,
          line_extension_amount: 100000,
          taxes: [
            {
              tax_code: "01",
              tax_name: "IVA",
              rate: 19,
              taxable_amount: 100000,
              tax_amount: 19000,
            },
          ],
        },
      ],
      line_extension_amount: 100000,
      tax_exclusive_amount: 100000,
      tax_inclusive_amount: 119000,
      allowance_total_amount: 0,
      charge_total_amount: 0,
      payable_amount: 119000,
      taxes: [
        {
          tax_code: "01",
          tax_name: "IVA",
          rate: 19,
          taxable_amount: 100000,
          tax_amount: 19000,
        },
      ],
      withholdings: [],
      cufe_cude: "a".repeat(96),
      cufe_cude_algorithm: "CUFE-SHA384",
      software_security_code: "b".repeat(96),
      qr_url: qr.qr_url,
      qr_data: qr.qr_data,
    }

    const unsignedXml = buildDianUblXml(ctx)
    assert.ok(unsignedXml.includes("<cbc:CustomizationID>10</cbc:CustomizationID>"))
    assert.ok(unsignedXml.includes("<cbc:ID>SETP990000001</cbc:ID>"))

    const signed = signDianUblXmlXadesEpes(unsignedXml, {
      software_security_code: ctx.software_security_code,
    })
    assert.ok(signed.signed_xml.includes("<ds:Signature"))
    assert.ok(signed.signed_xml.includes("<xades:SignedProperties"))
    assert.ok(!signed.signed_xml.includes("dian-signature-placeholder"))

    const attachedXml = buildDianAttachedDocumentXml({
      ctx,
      signed_xml: signed.signed_xml,
      application_response_xml: "<ApplicationResponse />",
    })
    assert.ok(attachedXml.includes("<AttachedDocument"))
    assert.ok(attachedXml.includes("<cbc:ParentDocumentID>SETP990000001</cbc:ParentDocumentID>"))

    const zipBuf = createDianZipArchive([
      { filename: "ad900123456SETP990000001.xml", content: attachedXml },
    ])
    // Verify PKZIP magic bytes 0x50 0x4b 0x03 0x04
    assert.equal(zipBuf[0], 0x50)
    assert.equal(zipBuf[1], 0x4b)
    assert.equal(zipBuf[2], 0x03)
    assert.equal(zipBuf[3], 0x04)

    // Verify XXE sanitization
    const maliciousXml = `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><Response>&xxe;</Response>`
    assert.ok(!sanitizeSoapXmlResponse(maliciousXml).includes("<!ENTITY"))
  })
})

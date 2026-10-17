import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  generateDianPdfViaDocumentsPlugin,
  resolveAndValidateDianBuyer,
} from "../modules/dian/utils"
import { DIAN_ERROR_CODES } from "../types"

describe("DIAN Client, B2B Legal Client (@vicacha-devs/medusa-plugin-b2b), and PDF (@vicacha-devs/medusa-plugin-documents) Rules", () => {
  it("falls back to Consumidor Final (222222222222) when order has no registered customer and does not request named invoice", async () => {
    const buyer = await resolveAndValidateDianBuyer({
      order: {
        id: "order_anon",
        email: "anon@example.com",
      },
      document_type: "01",
    })

    assert.equal(buyer.is_anonymous_consumidor_final, true)
    assert.equal(buyer.identification_number, "222222222222")
    assert.equal(buyer.identification_type, "13")
  })

  it("rejects named Electronic Invoice when buyer is not a registered client (missing customer_id)", async () => {
    await assert.rejects(
      () =>
        resolveAndValidateDianBuyer({
          order: {
            id: "order_no_client",
            metadata: {
              dian_wants_electronic_invoice: true,
              dian_identification_number: "1020304050",
            },
          },
          document_type: "01",
        }),
      (err: any) => err.code === DIAN_ERROR_CODES.CLIENT_REQUIRED
    )
  })

  it("rejects named Electronic Invoice when registered client is missing email or phone", async () => {
    await assert.rejects(
      () =>
        resolveAndValidateDianBuyer({
          order: {
            id: "order_missing_phone",
            customer_id: "cus_123",
            customer: {
              id: "cus_123",
              email: "cliente@correo.co",
              phone: "",
            },
          },
          document_type: "01",
          fiscal_profile: {
            customer_id: "cus_123",
            organization_type: "2",
            identification_type: "13",
            identification_number: "1020304050",
            registration_name: "Juan Pérez",
            email: "cliente@correo.co",
            phone: "",
          },
        }),
      (err: any) => err.code === DIAN_ERROR_CODES.CLIENT_CONTACT_REQUIRED
    )
  })

  it("resolves Persona Natural (2) when registered client has valid email, phone, and identification", async () => {
    const buyer = await resolveAndValidateDianBuyer({
      order: {
        id: "order_natural",
        customer_id: "cus_123",
      },
      document_type: "01",
      fiscal_profile: {
        customer_id: "cus_123",
        organization_type: "2",
        identification_type: "13",
        identification_number: "1020304050",
        registration_name: "Juan Pérez",
        email: "juan@perez.co",
        phone: "3001234567",
        municipality_code: "05001",
      },
    })

    assert.equal(buyer.is_anonymous_consumidor_final, false)
    assert.equal(buyer.is_b2b_legal_client, false)
    assert.equal(buyer.organization_type, "2")
    assert.equal(buyer.email, "juan@perez.co")
    assert.equal(buyer.phone, "3001234567")
    assert.equal(buyer.municipality_name, "Medellín")
  })

  it("enforces that Legal Clients (Persona Jurídica = '1') require @vicacha-devs/medusa-plugin-b2b", async () => {
    // 1. Fails when @vicacha-devs/medusa-plugin-b2b is not in the container
    await assert.rejects(
      () =>
        resolveAndValidateDianBuyer({
          order: {
            id: "order_legal_no_b2b",
            customer_id: "cus_b2b",
          },
          document_type: "01",
          fiscal_profile: {
            customer_id: "cus_b2b",
            company_id: "comp_123",
            organization_type: "1",
            identification_type: "31",
            identification_number: "890903938",
            registration_name: "Empresa Legal S.A.S.",
            email: "facturacion@empresa.co",
            phone: "6045551234",
          },
          container: {
            resolve: () => {
              throw new Error("Module not registered")
            },
          },
        }),
      (err: any) =>
        err.code === DIAN_ERROR_CODES.B2B_PLUGIN_REQUIRED_FOR_LEGAL_CLIENT
    )

    // 2. Succeeds when @vicacha-devs/medusa-plugin-b2b resolves the B2B Company
    const mockB2BContainer = {
      resolve: (key: string) => {
        if (key === "company") {
          return {
            retrieveCompany: async (id: string) => ({
              id,
              name: "Inversiones Vicacha S.A.S.",
              email: "contabilidad@vicacha.co",
              phone: "6017778899",
              address: "Cra 7 # 71-21",
              city: "Bogotá, D.C.",
              state: "Bogotá, D.C.",
              zip: "110231",
              country: "CO",
            }),
          }
        }
        return null
      },
    }

    const legalBuyer = await resolveAndValidateDianBuyer({
      order: {
        id: "order_legal_ok",
        customer_id: "cus_b2b",
      },
      document_type: "01",
      fiscal_profile: {
        customer_id: "cus_b2b",
        company_id: "comp_vicacha",
        organization_type: "1",
        identification_type: "31",
        identification_number: "800197268",
      },
      container: mockB2BContainer,
    })

    assert.equal(legalBuyer.is_b2b_legal_client, true)
    assert.equal(legalBuyer.company_id, "comp_vicacha")
    assert.equal(legalBuyer.registration_name, "Inversiones Vicacha S.A.S.")
    assert.equal(legalBuyer.identification_number, "800197268")
    assert.equal(legalBuyer.dv, "4")
    assert.equal(legalBuyer.email, "contabilidad@vicacha.co")
    assert.equal(legalBuyer.phone, "6017778899")
  })

  it("enforces that PDF generation requires and delegates to @vicacha-devs/medusa-plugin-documents", async () => {
    const sampleContext: any = {
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
        registration_name: "Mi Empresa S.A.S.",
        address_line: "Calle 100",
        municipality_code: "11001",
        municipality_name: "Bogotá, D.C.",
        department_name: "Bogotá, D.C.",
        postal_code: "110111",
        country_code: "CO",
        email: "emisor@empresa.co",
        phone: "6012345678",
      },
      buyer: {
        is_b2b_legal_client: true,
        customer_id: "cus_1",
        company_id: "comp_1",
        identification_number: "800197268",
        dv: "4",
        registration_name: "Adquirente B2B S.A.S.",
        email: "adquirente@b2b.co",
        phone: "6019998877",
        address_line: "Cra 15",
        municipality_code: "11001",
        municipality_name: "Bogotá, D.C.",
        department_code: "11",
        department_name: "Bogotá, D.C.",
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
      },
      items: [],
      line_extension_amount: 100000,
      allowance_total_amount: 0,
      charge_total_amount: 0,
      payable_amount: 119000,
      taxes: [],
      withholdings: [],
      cufe_cude: "c".repeat(96),
      cufe_cude_algorithm: "CUFE-SHA384",
      qr_url: "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=ccc",
      qr_data: "CUFE: ccc",
    }

    // 1. Fails when @vicacha-devs/medusa-plugin-documents is not registered
    await assert.rejects(
      () =>
        generateDianPdfViaDocumentsPlugin({
          context: sampleContext,
          order: { id: "ord_1" },
          container: null,
        }),
      (err: any) => err.code === DIAN_ERROR_CODES.DOCUMENTS_PLUGIN_REQUIRED
    )

    // 2. Delegates to @vicacha-devs/medusa-plugin-documents when registered
    let capturedRenderContext: any = null
    const mockDocumentsContainer = {
      resolve: (key: string) => {
        if (key === "documents") {
          return {
            resolveSettings: async () => ({
              default_locale: "es",
              invoice_template: "clean",
            }),
            renderPdf: async (ctx: any) => {
              capturedRenderContext = ctx
              return Buffer.from("%PDF-1.4-DIAN-REPRESENTACION-GRAFICA")
            },
            createDocuments: async () => ({ id: "mpd_doc_001" }),
          }
        }
        return null
      },
    }

    const pdfRes = await generateDianPdfViaDocumentsPlugin({
      context: sampleContext,
      order: { id: "ord_1" },
      container: mockDocumentsContainer,
    })

    assert.equal(pdfRes.pdf_document_id, "mpd_doc_001")
    assert.ok(
      pdfRes.pdf_buffer
        .toString("utf8")
        .includes("%PDF-1.4-DIAN-REPRESENTACION-GRAFICA")
    )
    assert.equal(capturedRenderContext.document_number, "SETP990000001")
    assert.equal(capturedRenderContext.b2b.is_b2b, true)
    assert.equal(capturedRenderContext.b2b.tax_id, "800197268-4")
  })
})

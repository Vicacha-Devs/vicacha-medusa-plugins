import { describe, it } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"

import { formatDocumentNumber } from "../modules/documents/utils/numbering"
import { getTranslations, normalizeLocale } from "../modules/documents/i18n"
import { resolveB2BBuyerContext } from "../modules/documents/integrations/b2b-resolver"
import {
  escapeCsvCell,
  generateAccountingCsv,
} from "../modules/documents/utils/csv-exporter"
import { createZipArchive, crc32 } from "../modules/documents/utils/zip-builder"
import {
  DocusealService,
  validateSafeExternalUrl,
} from "../modules/documents/services/docuseal"
import { createMockRenderContext } from "../modules/documents/utils/mock-order"
import {
  sanitizeFilename,
  sanitizeHtmlForPdf,
} from "../modules/documents/utils/formatters"

describe("Phase 0 — Optional B2B Buyer Context Resolver", () => {
  it("returns pure B2C context when no B2B module or metadata exists", async () => {
    const res = await resolveB2BBuyerContext({
      id: "order_b2c",
      email: "alice@example.com",
      billing_address: { first_name: "Alice", last_name: "Smith" },
    })
    assert.equal(res.is_b2b, false)
    assert.equal(res.source, "none")
  })

  it("respects b2b.enabled = false even when metadata has company fields", async () => {
    const res = await resolveB2BBuyerContext(
      {
        id: "order_1",
        metadata: { company_name: "Acme Corp", tax_id: "US-123" },
      },
      { enabled: false }
    )
    assert.equal(res.is_b2b, false)
    assert.equal(res.source, "none")
  })

  it("extracts B2B context from order/customer metadata (Tier 2 fallback)", async () => {
    const res = await resolveB2BBuyerContext({
      id: "order_b2b_meta",
      email: "procurement@globex.example",
      metadata: {
        tax_id: "DE-99887766",
        vat_number: "DE99887766",
        po_number: "PO-2026-0091",
        payment_terms: "Net 45",
      },
      billing_address: {
        first_name: "Hans",
        last_name: "Meyer",
        company: "Globex GmbH",
      },
    })
    assert.equal(res.is_b2b, true)
    assert.equal(res.source, "metadata")
    assert.equal(res.company_name, "Globex GmbH")
    assert.equal(res.tax_id, "DE-99887766")
    assert.equal(res.vat_number, "DE99887766")
    assert.equal(res.po_number, "PO-2026-0091")
    assert.equal(res.payment_terms, "Net 45")
  })

  it("resolves B2B company from optional container B2B service (Tier 1)", async () => {
    const mockContainer = {
      resolve: (key: string) => {
        if (key === "company") {
          return {
            retrieveCompany: async (id: string) => ({
              id,
              name: "Stark Industries",
              tax_id: "US-STARK-001",
              vat_number: "EU-STARK-99",
              payment_terms: "Net 60",
            }),
          }
        }
        throw new Error(`Module ${key} not registered`)
      },
    }

    const res = await resolveB2BBuyerContext(
      {
        id: "order_b2b_mod",
        metadata: { company_id: "comp_01", po_number: "PO-STARK-7" },
      },
      { enabled: true },
      mockContainer
    )

    assert.equal(res.is_b2b, true)
    assert.equal(res.source, "b2b_module")
    assert.equal(res.company_id, "comp_01")
    assert.equal(res.company_name, "Stark Industries")
    assert.equal(res.tax_id, "US-STARK-001")
    assert.equal(res.po_number, "PO-STARK-7")
    assert.equal(res.payment_terms, "Net 60")
  })
})

describe("Phase 1 — Numbering Formats & 10-Locale i18n (Document + Admin UI)", () => {
  it("formats document numbers with {prefix}, {year}, {month}, {number}, and {order_display_id}", () => {
    const refDate = new Date("2026-10-09T12:00:00Z")
    const num1 = formatDocumentNumber(
      "{prefix}/{year}/{month}/{number}",
      { number: 42, prefix: "FV", order_display_id: 1099 },
      5,
      refDate
    )
    assert.equal(num1, "FV/2026/10/00042")

    const num2 = formatDocumentNumber(
      "CN-{short_year}-{order_display_id}-{number}",
      { number: 7, prefix: "CN", order_display_id: 501 },
      4,
      refDate
    )
    assert.equal(num2, "CN-26-501-0007")
  })

  it("appends padded sequence number if pattern omits {number} and {order_display_id}", () => {
    const refDate = new Date("2026-01-15T00:00:00Z")
    const num = formatDocumentNumber(
      "INV-{year}",
      { number: 12, prefix: "INV" },
      5,
      refDate
    )
    assert.equal(num, "INV-2026-00012")
  })

  it("resolves all 10 built-in locales (en, es, pl, de, fr, pt, it, nl, tr, ar) and merges custom overrides", () => {
    assert.equal(normalizeLocale("es-MX"), "es")
    assert.equal(normalizeLocale("pl_PL"), "pl")
    assert.equal(normalizeLocale("tr-TR"), "tr")
    assert.equal(normalizeLocale("ar-SA"), "ar")
    assert.equal(normalizeLocale("unknown"), "en")

    const plDict = getTranslations("pl")
    assert.equal(plDict.invoice_title, "FAKTURA")
    assert.equal(plDict.credit_note_title, "FAKTURA KORYGUJĄCA")

    const trDict = getTranslations("tr")
    assert.equal(trDict.invoice_title, "FATURA")
    assert.equal(trDict.packing_slip_title, "SEVK İRSALİYESİ")

    const arDict = getTranslations("ar")
    assert.equal(arDict.invoice_title, "فاتورة ضريبية")
    assert.equal(arDict.credit_note_title, "إشعار دائن")

    const esCustom = getTranslations("es", {
      es: { invoice_title: "FACTURA COMERCIAL" },
    })
    assert.equal(esCustom.invoice_title, "FACTURA COMERCIAL")
    assert.equal(esCustom.packing_slip_title, "ALBARÁN DE ENTREGA")
  })

  it("provides complete 10-locale Admin UI i18n JSON bundles with identical keys", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const locales = ["en", "es", "de", "fr", "pt", "it", "nl", "pl", "tr", "ar"]
    const baseDir = path.resolve(process.cwd(), "src/admin/i18n/json")

    const flattenKeys = (obj: Record<string, any>, prefix = ""): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object"
          ? flattenKeys(v, `${prefix}${k}.`)
          : [`${prefix}${k}`]
      )

    const enJson = JSON.parse(
      fs.readFileSync(path.join(baseDir, "en.json"), "utf8")
    )
    const expectedKeys = flattenKeys(enJson).sort()
    assert.ok(expectedKeys.length > 80)

    for (const loc of locales) {
      const locJson = JSON.parse(
        fs.readFileSync(path.join(baseDir, `${loc}.json`), "utf8")
      )
      const locKeys = flattenKeys(locJson).sort()
      assert.deepEqual(
        locKeys,
        expectedKeys,
        `Locale ${loc}.json keys mismatch en.json`
      )
    }
  })
})

describe("Phase 2 & 3 — Packing Slip, Credit Note & 75-Item Stress Test Contexts", () => {
  it("creates packing slip context with fulfillment tracking numbers", () => {
    const ctx = createMockRenderContext("packing_slip")
    assert.equal(ctx.document_type, "packing_slip")
    assert.ok(ctx.fulfillment)
    assert.equal(ctx.fulfillment.tracking_numbers[0], "1Z999AA10123456784")
    assert.equal(ctx.fulfillment.items.length, 4)
  })

  it("creates credit note context with negative totals and reference invoice number", () => {
    const ctx = createMockRenderContext("credit_note")
    assert.equal(ctx.document_type, "credit_note")
    assert.ok(ctx.order.total < 0)
    assert.ok(ctx.order.items.every((i) => i.total < 0))
    assert.equal(ctx.related_document?.document_number, "INV-2026-00042")
  })

  it("supports 75-item stress test preview context", () => {
    const ctx = createMockRenderContext("invoice", {}, { itemCount: 75 })
    assert.equal(ctx.order.items.length, 75)
  })
})

describe("Phase 6 — Docuseal HMAC Webhook Verification & SSRF Protection", () => {
  it("verifies valid HMAC-SHA256 webhook signatures and rejects tampered payloads", () => {
    const secret = "whsec_test_secret_key_12345"
    const service = new DocusealService({
      api_key: "ds_key_123",
      webhook_secret: secret,
    })

    const rawBody = JSON.stringify({
      event_type: "submission.completed",
      data: { id: 9012 },
    })
    const validHmac = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")

    assert.equal(service.verifyWebhookSignature(rawBody, validHmac), true)
    assert.equal(
      service.verifyWebhookSignature(rawBody, `sha256=${validHmac}`),
      true
    )
    assert.equal(service.verifyWebhookSignature(rawBody, "invalid_sig"), false)
    assert.equal(
      service.verifyWebhookSignature(rawBody + "tampered", validHmac),
      false
    )
  })

  it("blocks private/loopback/metadata SSRF URLs while allowing public HTTPS and configured self-hosted origin", () => {
    assert.throws(() => validateSafeExternalUrl("http://127.0.0.1:8080/doc.pdf"))
    assert.throws(() =>
      validateSafeExternalUrl("https://169.254.169.254/latest/meta-data/")
    )
    assert.throws(() =>
      validateSafeExternalUrl("https://192.168.1.10/secret.pdf")
    )
    assert.throws(() => validateSafeExternalUrl("https://localhost/doc.pdf"))
    assert.throws(() => validateSafeExternalUrl("file:///etc/passwd"))

    const validPublic = validateSafeExternalUrl(
      "https://docuseal.com/downloads/signed-123.pdf"
    )
    assert.equal(validPublic.hostname, "docuseal.com")

    const validSelfHosted = validateSafeExternalUrl(
      "http://docuseal.internal.corp:3000/files/signed.pdf",
      "http://docuseal.internal.corp:3000"
    )
    assert.equal(validSelfHosted.hostname, "docuseal.internal.corp")
  })
})

describe("Phase 7 — Zero-Dependency ZIP Builder & Formula-Safe CSV Export", () => {
  it("builds a valid PKZIP buffer with local headers and central directory", () => {
    const pdf1 = Buffer.from("%PDF-1.4 mock invoice 1", "utf8")
    const pdf2 = Buffer.from("%PDF-1.4 mock invoice 2", "utf8")

    const zip = createZipArchive([
      { filename: "invoice-001.pdf", content: pdf1 },
      { filename: "invoice-001.pdf", content: pdf2 }, // tests automatic deduplication
    ])

    // Local file header magic number PK\x03\x04 (0x04034b50)
    assert.equal(zip.readUInt32LE(0), 0x04034b50)
    // End of central directory signature PK\x05\x06 (0x06054b50) at tail-22
    assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50)
    assert.ok(crc32(pdf1) > 0)
  })

  it("neutralizes spreadsheet formula injection in CSV export while preserving negative credit note numbers", () => {
    assert.equal(escapeCsvCell("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0")
    assert.equal(escapeCsvCell("+SUM(A1:A10)"), "'+SUM(A1:A10)")
    assert.equal(escapeCsvCell("@IMPORTXML(...)"), "'@IMPORTXML(...)")
    assert.equal(escapeCsvCell(-149.5), "-149.5")
    assert.equal(escapeCsvCell("-149.50"), "-149.50")

    const csv = generateAccountingCsv([
      {
        document_number: "CN-2026-00001",
        document_type: "credit_note",
        status: "generated",
        version: 1,
        order_id: "order_123",
        customer_name: "=MaliciousCustomer",
        total: -149.5,
      },
    ])
    assert.ok(csv.includes("'=MaliciousCustomer"))
    assert.ok(csv.includes(",-149.5,"))
  })
})

describe("Security — HTML Sanitization & Filename Sanitization", () => {
  it("strips <script>, <iframe>, on* handlers, and javascript: URIs from custom HTML templates", () => {
    const dirty = `<div><script>alert(1)</script><p onclick="steal()">Hello</p><iframe src="https://evil.com"></iframe></div>`
    const clean = sanitizeHtmlForPdf(dirty)
    assert.equal(clean.includes("<script"), false)
    assert.equal(clean.includes("onclick"), false)
    assert.equal(clean.includes("<iframe"), false)
    assert.equal(clean.includes("<p>Hello</p>"), true)
  })

  it("sanitizes filenames against path traversal and header injection", () => {
    assert.equal(
      sanitizeFilename('../../etc/passwd"\r\nX-Injected: 1'),
      "etc-passwd-X-Injected-1"
    )
  })
})

describe("Phase 4 & Sequence Allocation — Regional Settings Fallback & Forced Next Number", () => {
  it("resolves regional override when present, falls back to global, and consumes forced_next_number once", async () => {
    // In-memory mock repository for mpd_document_settings
    const rows: Array<Record<string, any>> = [
      {
        id: "set_global",
        region_id: null,
        company_name: "Global HQ Inc.",
        invoice_prefix: "INV",
        invoice_number_format: "{prefix}-{year}-{number}",
        next_invoice_number: 10,
        invoice_forced_next_number: 50,
        invoice_number_padding: 5,
        packing_slip_prefix: "PS",
        packing_slip_number_format: "{prefix}-{year}-{number}",
        next_packing_slip_number: 1,
        packing_slip_forced_next_number: null,
        packing_slip_number_padding: 4,
      },
      {
        id: "set_eu",
        region_id: "reg_eu",
        company_name: "Acme Europe GmbH",
        invoice_prefix: "EU-INV",
        invoice_number_format: "{prefix}/{year}/{number}",
        next_invoice_number: 5,
        invoice_forced_next_number: null,
        invoice_number_padding: 4,
      },
    ]

    const resolveSettings = async (regionId?: string | null) => {
      if (regionId) {
        const match = rows.find((r) => r.region_id === regionId)
        if (match) return match
      }
      return rows.find((r) => r.region_id === null)!
    }

    const allocateNext = async (
      docType: "invoice" | "packing_slip",
      regionId?: string | null
    ) => {
      const s = await resolveSettings(regionId)
      const forcedKey = `${docType}_forced_next_number`
      const nextKey = `next_${docType}_number`
      const prefixKey = `${docType}_prefix`
      const formatKey = `${docType}_number_format`
      const padKey = `${docType}_number_padding`

      const seq =
        typeof s[forcedKey] === "number" && s[forcedKey] > 0
          ? s[forcedKey]
          : s[nextKey]

      const docNum = formatDocumentNumber(
        s[formatKey],
        { number: seq, prefix: s[prefixKey] },
        s[padKey],
        new Date("2026-10-09T00:00:00Z")
      )

      s[nextKey] = seq + 1
      s[forcedKey] = null
      return { docNum, seq, company: s.company_name }
    }

    // 1. Unknown region falls back to Global and consumes forced_next_number = 50
    const firstGlobal = await allocateNext("invoice", "reg_us_unconfigured")
    assert.equal(firstGlobal.company, "Global HQ Inc.")
    assert.equal(firstGlobal.docNum, "INV-2026-00050")

    // 2. Subsequent global invoice increments to 51 (forced_next_number was cleared)
    const secondGlobal = await allocateNext("invoice", null)
    assert.equal(secondGlobal.docNum, "INV-2026-00051")

    // 3. Packing slip sequence is completely independent of invoice sequence
    const firstPackingSlip = await allocateNext("packing_slip", null)
    assert.equal(firstPackingSlip.docNum, "PS-2026-0001")

    // 4. Configured EU region uses its own regional override and sequence
    const firstEu = await allocateNext("invoice", "reg_eu")
    assert.equal(firstEu.company, "Acme Europe GmbH")
    assert.equal(firstEu.docNum, "EU-INV/2026/0005")
  })
})

describe("Phase 9 — DocumentsApiClient SDK & Query Keys", async () => {
  const {
    DocumentsApiClient,
    documentsQueryKeys,
    invalidateDocumentsQueries,
    matchesQueryKeyPrefix,
    subscribeDocumentsQueryInvalidation,
  } = await import("../sdk")

  it("constructs hierarchical query keys and dispatches invalidation events", () => {
    assert.deepEqual(documentsQueryKeys.all, ["documents"])
    assert.deepEqual(documentsQueryKeys.order("order_123"), [
      "documents",
      "order",
      "order_123",
    ])
    assert.deepEqual(documentsQueryKeys.settings("reg_eu"), [
      "documents",
      "settings",
      "reg_eu",
    ])
    assert.equal(
      matchesQueryKeyPrefix(
        documentsQueryKeys.order("order_123"),
        documentsQueryKeys.orders()
      ),
      true
    )

    const received: Array<readonly unknown[]> = []
    const unsub = subscribeDocumentsQueryInvalidation((key) => {
      received.push(key)
    })
    invalidateDocumentsQueries(documentsQueryKeys.order("order_123"))
    unsub()
    assert.equal(received.length, 1)
    assert.deepEqual(received[0], ["documents", "order", "order_123"])
  })

  it("executes typed Admin and Store requests, builds URLs, and handles API errors", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.includes("/error")) {
        return new Response(JSON.stringify({ message: "Immutable invoice" }), {
          status: 400,
        })
      }
      return new Response(
        JSON.stringify({
          documents: [{ id: "doc_1", document_number: "INV-2026-00001" }],
          count: 1,
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const adminClient = new DocumentsApiClient(
      "/admin",
      "https://medusa.example.com",
      { fetchImpl: mockFetch }
    )
    const storeClient = new DocumentsApiClient(
      "/store",
      "https://medusa.example.com",
      {
        fetchImpl: mockFetch,
        publishableApiKey: "pk_test_123",
      }
    )

    const listRes = await adminClient.listDocuments({
      order_id: "order_99",
      document_type: "invoice",
    })
    assert.equal(listRes.count, 1)
    assert.equal(
      calls[0].url,
      "https://medusa.example.com/admin/documents?order_id=order_99&document_type=invoice"
    )

    assert.equal(
      adminClient.getDocumentPdfUrl("doc_1", { signed: true }),
      "https://medusa.example.com/admin/documents/doc_1/pdf?signed=true"
    )
    assert.equal(
      storeClient.getOrderDocumentPdfUrl("order_99", "packing-slip"),
      "https://medusa.example.com/store/documents/order_99/packing-slip.pdf"
    )

    await storeClient.listOrderDocuments("order_99")
    const storeHeaders = calls[1].init?.headers as Record<string, string>
    assert.equal(storeHeaders["x-publishable-api-key"], "pk_test_123")

    await assert.rejects(
      () => adminClient.deleteDocument("error"),
      /Immutable invoice/
    )
  })

  it("exports unified constants, enums, and error maps from src/types", async () => {
    const typesMod = await import("../types")
    assert.equal(typesMod.DOCUMENTS_MODULE, "documentsModuleService")
    assert.equal(typesMod.EDocumentType.INVOICE, "invoice")
    assert.equal(typesMod.EDocumentStatus.GENERATED, "generated")
    assert.equal(typesMod.ESignatureStatus.COMPLETED, "completed")
    assert.ok(typesMod.DOCUMENTS_ERROR_MAP.DOCUMENT_NOT_FOUND)
    assert.equal(
      typesMod.DOCUMENTS_ERROR_MAP.PDF_RENDER_FAILED.retryable,
      true
    )
  })
})

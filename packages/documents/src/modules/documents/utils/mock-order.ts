import type {
  DocumentRenderContext,
  DocumentType,
  OrderLineItemSnapshot,
  SettingsSnapshot,
} from "../types"

export function createMockRenderContext(
  documentType: DocumentType = "invoice",
  settings: Partial<SettingsSnapshot> = {},
  options: { itemCount?: number; locale?: string; isB2B?: boolean } = {}
): DocumentRenderContext {
  const itemCount = Math.max(1, Math.min(100, options.itemCount ?? 4))
  const locale = options.locale || settings.locale || "en"
  const isCreditNote = documentType === "credit_note"
  const sign = isCreditNote ? -1 : 1

  const sampleProducts = [
    { title: "Ergonomic Mechanical Keyboard", sku: "KB-MECH-01", price: 149.0 },
    { title: "USB-C Thunderbolt 4 Dock", sku: "DK-TB4-02", price: 229.0 },
    { title: "4K UltraSharp Monitor 27\"", sku: "MN-4K27-03", price: 499.0 },
    { title: "Wireless Precision Mouse", sku: "MS-WL-04", price: 79.0 },
    { title: "Noise-Canceling Studio Headset", sku: "HS-NC-05", price: 199.0 },
    { title: "Aluminum Laptop Stand", sku: "ST-ALU-06", price: 59.0 },
  ]

  const items: OrderLineItemSnapshot[] = Array.from(
    { length: itemCount },
    (_, idx) => {
      const sample = sampleProducts[idx % sampleProducts.length]
      const quantity = (idx % 3) + 1
      const unitPrice = sample.price
      const rawSubtotal = unitPrice * quantity
      const rawTax = Number((rawSubtotal * 0.1).toFixed(2))
      return {
        id: `item_${idx + 1}`,
        title:
          itemCount > 6 ? `${sample.title} (#${idx + 1})` : sample.title,
        variant_title: idx % 2 === 0 ? "Space Gray / Pro" : "Silver / Standard",
        sku: `${sample.sku}-${String(idx + 1).padStart(2, "0")}`,
        quantity,
        unit_price: sign * unitPrice,
        subtotal: sign * rawSubtotal,
        tax_total: sign * rawTax,
        discount_total: 0,
        total: sign * Number((rawSubtotal + rawTax).toFixed(2)),
        weight: 450,
      }
    }
  )

  const subtotal = Number(
    items.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2)
  )
  const taxTotal = Number(
    items.reduce((acc, i) => acc + i.tax_total, 0).toFixed(2)
  )
  const shippingTotal = sign * 15.0
  const total = Number((subtotal + taxTotal + shippingTotal).toFixed(2))

  const fullSettings: SettingsSnapshot = {
    captured_at: new Date().toISOString(),
    region_id: settings.region_id ?? null,
    company_name: settings.company_name || "Acme Commerce Inc.",
    company_address: settings.company_address || "100 Market Street, Suite 400",
    company_city: settings.company_city || "San Francisco",
    company_state: settings.company_state || "CA",
    company_postal_code: settings.company_postal_code || "94105",
    company_country: settings.company_country || "US",
    company_tax_id: settings.company_tax_id || "US-99-1234567",
    company_email: settings.company_email || "billing@acmecommerce.example",
    company_phone: settings.company_phone || "+1 (415) 555-0199",
    company_website: settings.company_website || "https://acmecommerce.example",
    company_logo: settings.company_logo ?? null,
    bank_details:
      settings.bank_details ||
      "Bank: First Commercial Bank | IBAN: US00FCBK000123456789 | SWIFT: FCBKUS33",
    template_key:
      settings.template_key ||
      (documentType === "packing_slip"
        ? "packing_slip"
        : documentType === "credit_note"
          ? "credit_note"
          : documentType === "receipt"
            ? "pos_80mm"
            : "clean"),
    primary_color: settings.primary_color || "#18181b",
    secondary_color: settings.secondary_color || "#71717a",
    font_family: settings.font_family || "Helvetica",
    locale,
    notes:
      settings.notes ||
      "Payment is due within 30 days of issue. Please include the document number on your remittance.",
    footer_text:
      settings.footer_text ||
      "Registered Commercial Entity • All prices in USD",
    require_signature: settings.require_signature ?? false,
    signature_role: settings.signature_role || "Customer",
    styles: settings.styles,
    sections: settings.sections,
  }

  return {
    document_number:
      documentType === "packing_slip"
        ? "PS-2026-00042"
        : documentType === "credit_note"
          ? "CN-2026-00007"
          : documentType === "receipt"
            ? "RCP-2026-00108"
            : "INV-2026-00042",
    document_type: documentType,
    version: 1,
    generated_at: new Date().toISOString(),
    locale,
    order: {
      id: "order_preview_01JXYZ",
      display_id: 1042,
      created_at: new Date().toISOString(),
      currency_code: "USD",
      email: "buyer@globex.example",
      region_id: settings.region_id ?? "reg_us",
      region_name: "North America",
      payment_status: isCreditNote ? "refunded" : "captured",
      fulfillment_status: "fulfilled",
      payment_method: "Corporate Visa •••• 4242",
      subtotal,
      discount_total: 0,
      shipping_total: shippingTotal,
      tax_total: taxTotal,
      total,
      refunded_total: isCreditNote ? Math.abs(total) : 0,
      customer: {
        id: "cus_preview_01",
        first_name: "Elena",
        last_name: "Rostova",
        email: "buyer@globex.example",
        phone: "+1 (212) 555-0147",
        company_name: options.isB2B !== false ? "Globex Enterprises LLC" : null,
      },
      billing_address: {
        first_name: "Elena",
        last_name: "Rostova",
        company: options.isB2B !== false ? "Globex Enterprises LLC" : null,
        address_1: "742 Evergreen Terrace",
        address_2: "Floor 12",
        city: "New York",
        province: "NY",
        postal_code: "10001",
        country_code: "US",
        phone: "+1 (212) 555-0147",
      },
      shipping_address: {
        first_name: "Elena",
        last_name: "Rostova",
        company: options.isB2B !== false ? "Globex Warehouse East" : null,
        address_1: "742 Evergreen Terrace",
        address_2: "Loading Dock B",
        city: "New York",
        province: "NY",
        postal_code: "10001",
        country_code: "US",
        phone: "+1 (212) 555-0147",
      },
      items,
    },
    settings: fullSettings,
    b2b:
      options.isB2B !== false
        ? {
            is_b2b: true,
            source: "metadata",
            company_name: "Globex Enterprises LLC",
            tax_id: "US-88-7654321",
            vat_number: "EU826001425",
            po_number: "PO-2026-9981",
            payment_terms: "Net 30",
            cost_center: "IT-INFRA-04",
          }
        : { is_b2b: false, source: "none" },
    fulfillment:
      documentType === "packing_slip"
        ? {
            id: "ful_preview_01",
            created_at: new Date().toISOString(),
            shipped_at: new Date().toISOString(),
            tracking_numbers: ["1Z999AA10123456784"],
            tracking_links: ["https://tracking.example/1Z999AA10123456784"],
            carrier: "UPS Ground Freight",
            warehouse_address: "Acme Fulfillment Hub #2, Newark, NJ 07114, US",
            items: items.map((item) => ({
              line_item_id: item.id,
              title: item.title,
              sku: item.sku,
              variant_title: item.variant_title,
              quantity: item.quantity,
              weight: item.weight,
            })),
          }
        : null,
    refund:
      documentType === "credit_note"
        ? {
            id: "ref_preview_01",
            amount: Math.abs(total),
            reason: "Returned damaged in transit",
            note: "Approved full credit against original invoice INV-2026-00042",
            created_at: new Date().toISOString(),
            reference_invoice_number: "INV-2026-00042",
          }
        : null,
    related_document:
      documentType === "credit_note"
        ? {
            id: "doc_orig_01",
            document_number: "INV-2026-00042",
            document_type: "invoice",
            generated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          }
        : null,
  }
}

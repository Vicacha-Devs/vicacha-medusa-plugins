import type {
  LabelPresetId,
  LabelPrintItem,
  LabelPrintOutput,
  LabelTemplateSpec,
} from "../types"
import { renderBarcodeSvg } from "./svg-renderer"
import { escapeHtml } from "./security"

/**
 * Built-in thermal roll & A4 sheet label presets.
 */
export const BUILTIN_LABEL_TEMPLATES: Record<
  Exclude<LabelPresetId, "custom">,
  LabelTemplateSpec
> = {
  thermal_50x25: {
    id: "thermal_50x25",
    name: "Thermal Roll 50×25 mm (Retail Price Tag)",
    preset_id: "thermal_50x25",
    layout_type: "thermal_roll",
    width_mm: 50,
    height_mm: 25,
    columns: 1,
    rows: 1,
    margin_top_mm: 1.5,
    margin_left_mm: 2,
    gap_x_mm: 0,
    gap_y_mm: 2,
    symbology: "ean13",
    show_title: true,
    show_variant_title: true,
    show_sku: true,
    show_price: true,
    show_compare_at_price: true,
    show_brand: false,
    show_qr: false,
    custom_header: null,
    custom_footer: null,
    dpi: 203,
    is_default: true,
  },
  thermal_57x32: {
    id: "thermal_57x32",
    name: "Thermal Roll 57×32 mm (Shelf & Apparel Tag)",
    preset_id: "thermal_57x32",
    layout_type: "thermal_roll",
    width_mm: 57,
    height_mm: 32,
    columns: 1,
    rows: 1,
    margin_top_mm: 2,
    margin_left_mm: 2,
    gap_x_mm: 0,
    gap_y_mm: 2,
    symbology: "ean13",
    show_title: true,
    show_variant_title: true,
    show_sku: true,
    show_price: true,
    show_compare_at_price: true,
    show_brand: true,
    show_qr: true,
    custom_header: null,
    custom_footer: null,
    dpi: 203,
    is_default: false,
  },
  thermal_100x50: {
    id: "thermal_100x50",
    name: "Thermal Roll 100×50 mm (Warehouse Carton / GS1-128)",
    preset_id: "thermal_100x50",
    layout_type: "thermal_roll",
    width_mm: 100,
    height_mm: 50,
    columns: 1,
    rows: 1,
    margin_top_mm: 3,
    margin_left_mm: 3,
    gap_x_mm: 0,
    gap_y_mm: 3,
    symbology: "code128",
    show_title: true,
    show_variant_title: true,
    show_sku: true,
    show_price: true,
    show_compare_at_price: false,
    show_brand: true,
    show_qr: true,
    custom_header: "WAREHOUSE INVENTORY",
    custom_footer: null,
    dpi: 203,
    is_default: false,
  },
  jewelry_30x15: {
    id: "jewelry_30x15",
    name: "Jewelry / Eyewear Dumbbell Tag 30×15 mm",
    preset_id: "jewelry_30x15",
    layout_type: "thermal_roll",
    width_mm: 30,
    height_mm: 15,
    columns: 1,
    rows: 1,
    margin_top_mm: 1,
    margin_left_mm: 1,
    gap_x_mm: 0,
    gap_y_mm: 1.5,
    symbology: "code128",
    show_title: true,
    show_variant_title: false,
    show_sku: true,
    show_price: true,
    show_compare_at_price: false,
    show_brand: false,
    show_qr: false,
    custom_header: null,
    custom_footer: null,
    dpi: 300,
    is_default: false,
  },
  a4_24up_70x37: {
    id: "a4_24up_70x37",
    name: "A4 Sheet 24-Up (3×8 — 70×37 mm)",
    preset_id: "a4_24up_70x37",
    layout_type: "a4_sheet",
    width_mm: 70,
    height_mm: 37,
    columns: 3,
    rows: 8,
    margin_top_mm: 1,
    margin_left_mm: 0,
    gap_x_mm: 0,
    gap_y_mm: 0,
    symbology: "ean13",
    show_title: true,
    show_variant_title: true,
    show_sku: true,
    show_price: true,
    show_compare_at_price: true,
    show_brand: true,
    show_qr: false,
    custom_header: null,
    custom_footer: null,
    dpi: 300,
    is_default: false,
  },
  a4_40up_52x30: {
    id: "a4_40up_52x30",
    name: "A4 Sheet 40-Up (4×10 — 52.5×29.7 mm)",
    preset_id: "a4_40up_52x30",
    layout_type: "a4_sheet",
    width_mm: 52.5,
    height_mm: 29.7,
    columns: 4,
    rows: 10,
    margin_top_mm: 0,
    margin_left_mm: 0,
    gap_x_mm: 0,
    gap_y_mm: 0,
    symbology: "ean13",
    show_title: true,
    show_variant_title: true,
    show_sku: true,
    show_price: true,
    show_compare_at_price: true,
    show_brand: false,
    show_qr: false,
    custom_header: null,
    custom_footer: null,
    dpi: 300,
    is_default: false,
  },
  a4_65up_38x21: {
    id: "a4_65up_38x21",
    name: "A4 Sheet 65-Up Mini (5×13 — 38.1×21.2 mm)",
    preset_id: "a4_65up_38x21",
    layout_type: "a4_sheet",
    width_mm: 38.1,
    height_mm: 21.2,
    columns: 5,
    rows: 13,
    margin_top_mm: 10.7,
    margin_left_mm: 4.7,
    gap_x_mm: 2.5,
    gap_y_mm: 0,
    symbology: "ean13",
    show_title: true,
    show_variant_title: false,
    show_sku: false,
    show_price: true,
    show_compare_at_price: false,
    show_brand: false,
    show_qr: false,
    custom_header: null,
    custom_footer: null,
    dpi: 300,
    is_default: false,
  },
}

/**
 * Formats a numeric price in a currency using Intl.NumberFormat.
 */
export function formatLabelCurrency(
  amount: number | null | undefined,
  currencyCode = "USD"
): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null
  }
  const code = (currencyCode || "USD").toUpperCase()
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

/**
 * Expands print items according to each item's `quantity` (capped to avoid DoS).
 */
export function expandLabelPrintItems(
  items: LabelPrintItem[],
  maxTotalLabels = 500
): LabelPrintItem[] {
  const expanded: LabelPrintItem[] = []
  for (const item of items) {
    const qty = Math.max(1, Math.min(200, Math.floor(item.quantity ?? 1)))
    for (let i = 0; i < qty; i++) {
      if (expanded.length >= maxTotalLabels) {
        return expanded
      }
      expanded.push({ ...item, quantity: 1 })
    }
  }
  return expanded
}

/**
 * Sanitizes strings for Zebra ZPL `^FD...^FS` field data commands.
 */
function sanitizeZplField(input: string | null | undefined): string {
  if (!input) return ""
  return String(input)
    .replace(/[\^~\\]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
}

/**
 * Generates raw Zebra ZPL II (`^XA ... ^XZ`) thermal label commands.
 */
export function generateZplLabels(
  items: LabelPrintItem[],
  template: LabelTemplateSpec
): string {
  const expanded = expandLabelPrintItems(items)
  const dotsPerMm = template.dpi === 300 ? 12 : 8
  const widthDots = Math.round(template.width_mm * dotsPerMm)
  const heightDots = Math.round(template.height_mm * dotsPerMm)
  const padX = Math.max(12, Math.round(template.margin_left_mm * dotsPerMm))
  const padY = Math.max(12, Math.round(template.margin_top_mm * dotsPerMm))

  const blocks: string[] = []

  for (const item of expanded) {
    const symbology = item.symbology || template.symbology || "ean13"
    const priceText = template.show_price
      ? formatLabelCurrency(item.price, item.currency_code)
      : null
    const compareText =
      template.show_compare_at_price &&
      typeof item.compare_at_price === "number" &&
      typeof item.price === "number" &&
      item.compare_at_price > item.price
        ? formatLabelCurrency(item.compare_at_price, item.currency_code)
        : null

    const lines: string[] = [
      "^XA",
      "^CI28",
      `^PW${widthDots}`,
      `^LL${heightDots}`,
      "^LH0,0",
    ]

    let cursorY = padY

    if (template.custom_header) {
      lines.push(
        `^FO${padX},${cursorY}^A0N,16,16^FD${sanitizeZplField(
          template.custom_header
        )}^FS`
      )
      cursorY += 20
    }

    if (template.show_brand && item.brand) {
      lines.push(
        `^FO${padX},${cursorY}^A0N,16,16^FD${sanitizeZplField(
          item.brand.toUpperCase()
        )}^FS`
      )
      cursorY += 18
    }

    if (template.show_title) {
      const titleLine = item.title.slice(0, 34)
      lines.push(
        `^FO${padX},${cursorY}^A0N,22,22^FD${sanitizeZplField(titleLine)}^FS`
      )
      cursorY += 24
    }

    if (template.show_variant_title && item.variant_title) {
      lines.push(
        `^FO${padX},${cursorY}^A0N,18,18^FD${sanitizeZplField(
          item.variant_title.slice(0, 34)
        )}^FS`
      )
      cursorY += 20
    }

    if (template.show_sku && item.sku) {
      lines.push(
        `^FO${padX},${cursorY}^A0N,16,16^FDSKU: ${sanitizeZplField(item.sku)}^FS`
      )
      cursorY += 18
    }

    if (priceText) {
      const priceLine = compareText
        ? `${priceText} (MRP ${compareText})`
        : priceText
      lines.push(
        `^FO${padX},${cursorY}^A0N,26,26^FD${sanitizeZplField(priceLine)}^FS`
      )
      cursorY += 30
    }

    const barHeight = Math.max(36, Math.min(90, heightDots - cursorY - 28))
    if (symbology === "qr") {
      lines.push(
        `^FO${padX},${cursorY}^BQN,2,4^FDQA,${sanitizeZplField(
          item.qr_url || item.barcode
        )}^FS`
      )
    } else if (symbology === "ean13" || symbology === "isbn13") {
      const digits12 = item.barcode.replace(/\D/g, "").slice(0, 12).padStart(12, "0")
      lines.push(
        `^FO${padX},${cursorY}^BY2^BEN,${barHeight},Y,N^FD${digits12}^FS`
      )
    } else if (symbology === "ean8") {
      const digits7 = item.barcode.replace(/\D/g, "").slice(0, 7).padStart(7, "0")
      lines.push(
        `^FO${padX},${cursorY}^BY2^B8N,${barHeight},Y,N^FD${digits7}^FS`
      )
    } else {
      lines.push(
        `^FO${padX},${cursorY}^BY2^BCN,${barHeight},Y,N,N^FD${sanitizeZplField(
          item.barcode
        )}^FS`
      )
    }

    if (template.show_qr && symbology !== "qr" && (item.qr_url || item.barcode)) {
      const qrX = Math.max(padX + 180, widthDots - 95)
      lines.push(
        `^FO${qrX},${padY}^BQN,2,3^FDQA,${sanitizeZplField(
          item.qr_url || item.barcode
        )}^FS`
      )
    }

    if (template.custom_footer) {
      lines.push(
        `^FO${padX},${heightDots - 20}^A0N,15,15^FD${sanitizeZplField(
          template.custom_footer
        )}^FS`
      )
    }

    lines.push("^PQ1,0,1,Y", "^XZ")
    blocks.push(lines.join("\n"))
  }

  return blocks.join("\n\n")
}

/**
 * Renders print-ready HTML + SVG and ZPL II output for a list of barcode/price label items.
 */
export function renderPrintableLabels(
  items: LabelPrintItem[],
  templateOrPreset: LabelTemplateSpec | LabelPresetId = "thermal_50x25"
): LabelPrintOutput {
  const template: LabelTemplateSpec =
    typeof templateOrPreset === "string"
      ? (BUILTIN_LABEL_TEMPLATES as Record<string, LabelTemplateSpec>)[
          templateOrPreset
        ] || BUILTIN_LABEL_TEMPLATES.thermal_50x25
      : templateOrPreset

  const expanded = expandLabelPrintItems(items)
  const isSheet = template.layout_type === "a4_sheet"

  const labelCardsHtml = expanded.map((item) => {
    const symbology = item.symbology || template.symbology || "ean13"
    const barcodeSvg = renderBarcodeSvg({
      code: item.barcode,
      symbology,
      width: template.show_qr && symbology !== "qr" ? 150 : 210,
      height: template.height_mm <= 22 ? 42 : 58,
      includeText: true,
    })

    const qrSvg =
      template.show_qr && symbology !== "qr"
        ? renderBarcodeSvg({
            code: item.qr_url || item.barcode,
            symbology: "qr",
            width: 54,
            height: 54,
            includeText: false,
            quietZone: 2,
          })
        : ""

    const formattedPrice = template.show_price
      ? formatLabelCurrency(item.price, item.currency_code)
      : null
    const formattedCompare =
      template.show_compare_at_price &&
      typeof item.compare_at_price === "number" &&
      typeof item.price === "number" &&
      item.compare_at_price > item.price
        ? formatLabelCurrency(item.compare_at_price, item.currency_code)
        : null

    return `<div class="mpb-label-card">
      ${
        template.custom_header
          ? `<div class="mpb-label-header">${escapeHtml(template.custom_header)}</div>`
          : ""
      }
      <div class="mpb-label-top">
        <div class="mpb-label-meta">
          ${
            template.show_brand && item.brand
              ? `<div class="mpb-label-brand">${escapeHtml(item.brand)}</div>`
              : ""
          }
          ${
            template.show_title
              ? `<div class="mpb-label-title">${escapeHtml(item.title)}</div>`
              : ""
          }
          ${
            template.show_variant_title && item.variant_title
              ? `<div class="mpb-label-variant">${escapeHtml(item.variant_title)}</div>`
              : ""
          }
          ${
            template.show_sku && item.sku
              ? `<div class="mpb-label-sku">SKU: ${escapeHtml(item.sku)}</div>`
              : ""
          }
        </div>
        ${
          formattedPrice
            ? `<div class="mpb-label-price-box">
                ${
                  formattedCompare
                    ? `<span class="mpb-label-compare">${escapeHtml(formattedCompare)}</span>`
                    : ""
                }
                <span class="mpb-label-price">${escapeHtml(formattedPrice)}</span>
              </div>`
            : ""
        }
      </div>
      <div class="mpb-label-barcode-row">
        <div class="mpb-label-barcode">${barcodeSvg}</div>
        ${qrSvg ? `<div class="mpb-label-qr">${qrSvg}</div>` : ""}
      </div>
      ${
        template.custom_footer
          ? `<div class="mpb-label-footer">${escapeHtml(template.custom_footer)}</div>`
          : ""
      }
    </div>`
  })

  const pageCss = isSheet
    ? `@page { size: A4 portrait; margin: ${template.margin_top_mm}mm ${template.margin_left_mm}mm; }`
    : `@page { size: ${template.width_mm}mm ${template.height_mm}mm; margin: 0; }`

  const gridCss = isSheet
    ? `display: grid; grid-template-columns: repeat(${template.columns}, ${template.width_mm}mm); column-gap: ${template.gap_x_mm}mm; row-gap: ${template.gap_y_mm}mm;`
    : `display: flex; flex-direction: column; gap: ${template.gap_y_mm}mm;`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(template.name)}</title>
<style>
  ${pageCss}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #ffffff;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mpb-label-sheet {
    ${gridCss}
  }
  .mpb-label-card {
    width: ${template.width_mm}mm;
    height: ${template.height_mm}mm;
    padding: 1.4mm 1.8mm;
    border: 0.25mm dashed #d1d5db;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  @media print {
    .mpb-label-card { border-color: transparent; }
  }
  .mpb-label-header, .mpb-label-footer {
    font-size: 6pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: center;
    color: #374151;
  }
  .mpb-label-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5mm;
  }
  .mpb-label-meta {
    min-width: 0;
    flex: 1;
  }
  .mpb-label-brand {
    font-size: 6pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #4b5563;
  }
  .mpb-label-title {
    font-size: ${template.height_mm <= 20 ? "6.5pt" : "8pt"};
    font-weight: 700;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mpb-label-variant, .mpb-label-sku {
    font-size: 6pt;
    color: #4b5563;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mpb-label-price-box {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
  }
  .mpb-label-compare {
    font-size: 6pt;
    color: #6b7280;
    text-decoration: line-through;
  }
  .mpb-label-price {
    font-size: ${template.height_mm <= 20 ? "7.5pt" : "9.5pt"};
    font-weight: 800;
    color: #111827;
  }
  .mpb-label-barcode-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5mm;
    flex: 1;
    min-height: 0;
  }
  .mpb-label-barcode svg {
    width: 100%;
    max-height: ${Math.max(9, Math.round(template.height_mm * 0.48))}mm;
    display: block;
  }
  .mpb-label-qr svg {
    width: ${Math.max(10, Math.round(template.height_mm * 0.42))}mm;
    height: ${Math.max(10, Math.round(template.height_mm * 0.42))}mm;
    display: block;
  }
</style>
</head>
<body>
  <div class="mpb-label-sheet">
    ${labelCardsHtml.join("\n")}
  </div>
</body>
</html>`

  const zpl = generateZplLabels(items, template)

  return {
    template,
    total_labels: expanded.length,
    html,
    zpl,
    items: expanded,
  }
}

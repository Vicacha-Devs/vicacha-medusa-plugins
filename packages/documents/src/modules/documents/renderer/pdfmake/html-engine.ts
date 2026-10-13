import Handlebars from "handlebars"
import htmlToPdfmake from "html-to-pdfmake"
import { JSDOM } from "jsdom"
import type {
  CustomHtmlRenderOptions,
  DocumentRenderContext,
  PageOrientation,
  PageSize,
  TemplateSectionsConfig,
  TemplateStylesConfig,
} from "../../types"
import type { DocumentTranslations } from "../../i18n"
import {
  formatAddressLines,
  formatCurrency,
  formatDate,
} from "../../utils/formatters"
import {
  DEFAULT_HANDLEBARS_TEMPLATES,
  DEFAULT_TEMPLATE_SECTIONS,
  DEFAULT_TEMPLATE_STYLES,
} from "./default-templates"

export type { CustomHtmlRenderOptions } from "../../types"

// Load pdfmake with virtual font file system
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfMake = require("pdfmake/build/pdfmake")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfFonts = require("pdfmake/build/vfs_fonts")

if (pdfMake && pdfFonts) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs || pdfFonts
}

/**
 * Strips executable/dangerous HTML tags and event handler attributes before passing to html-to-pdfmake.
 */
export function sanitizeHtmlForPdf(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") return ""
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "blocked:")
}

function resolvePageSizeSpec(
  pageSize: PageSize = "A4",
  itemCount = 4
): string | { width: number; height: number } {
  if (pageSize === "80MM") {
    return {
      width: 226.77,
      height: Math.max(360, 240 + itemCount * 24),
    }
  }
  if (pageSize === "58MM") {
    return {
      width: 164.41,
      height: Math.max(360, 240 + itemCount * 30),
    }
  }
  if (pageSize === "LETTER") {
    return "LETTER"
  }
  return "A4"
}

/**
 * Renders a Handlebars/HTML template into a PDF Buffer using html-to-pdfmake + pdfmake.
 * Also supports 80MM and 58MM POS thermal receipt dynamic height sizing.
 */
export async function renderHandlebarsPdf(
  context: DocumentRenderContext,
  t: DocumentTranslations,
  options: CustomHtmlRenderOptions = {}
): Promise<Buffer> {
  const mergedStyles: TemplateStylesConfig = {
    ...DEFAULT_TEMPLATE_STYLES,
    primary_color:
      options.styles?.primary_color ||
      context.settings.primary_color ||
      DEFAULT_TEMPLATE_STYLES.primary_color,
    secondary_color:
      options.styles?.secondary_color ||
      context.settings.secondary_color ||
      DEFAULT_TEMPLATE_STYLES.secondary_color,
    ...(context.settings.styles || {}),
    ...(options.styles || {}),
  }

  const mergedSections: TemplateSectionsConfig = {
    ...DEFAULT_TEMPLATE_SECTIONS,
    ...(context.settings.sections || {}),
    ...(options.sections || {}),
  }

  const templateSource =
    options.html_content && options.html_content.trim().length > 0
      ? options.html_content
      : DEFAULT_HANDLEBARS_TEMPLATES[context.document_type] ||
        DEFAULT_HANDLEBARS_TEMPLATES.invoice

  const isCreditNote = context.document_type === "credit_note"
  const sign = isCreditNote ? -1 : 1

  const formattedItems = context.order.items.map((item, idx) => {
    const unitPrice = isCreditNote ? -Math.abs(item.unit_price) : item.unit_price
    const itemTotal = isCreditNote ? -Math.abs(item.total) : item.total
    return {
      ...item,
      index: idx + 1,
      sku: item.sku || "-",
      unit_price_formatted: formatCurrency(
        unitPrice,
        context.order.currency_code,
        context.locale
      ),
      tax_total_formatted: formatCurrency(
        sign * Math.abs(item.tax_total),
        context.order.currency_code,
        context.locale
      ),
      total_formatted: formatCurrency(
        itemTotal,
        context.order.currency_code,
        context.locale
      ),
    }
  })

  const templateData = {
    ...context,
    t,
    styles: mergedStyles,
    sections: mergedSections,
    formatted_issue_date: formatDate(context.generated_at, context.locale),
    formatted_order_date: formatDate(context.order.created_at, context.locale),
    billing_lines: formatAddressLines(context.order.billing_address),
    shipping_lines: formatAddressLines(context.order.shipping_address),
    formatted_items: formattedItems,
    formatted_totals: {
      subtotal: formatCurrency(
        sign * Math.abs(context.order.subtotal),
        context.order.currency_code,
        context.locale
      ),
      discount_total: formatCurrency(
        context.order.discount_total,
        context.order.currency_code,
        context.locale
      ),
      shipping_total: formatCurrency(
        sign * Math.abs(context.order.shipping_total),
        context.order.currency_code,
        context.locale
      ),
      tax_total: formatCurrency(
        sign * Math.abs(context.order.tax_total),
        context.order.currency_code,
        context.locale
      ),
      total: formatCurrency(
        sign * Math.abs(context.refund?.amount ?? context.order.total),
        context.order.currency_code,
        context.locale
      ),
    },
  }

  const compiled = Handlebars.compile(sanitizeHtmlForPdf(templateSource), {
    noEscape: false,
  })
  const renderedHtml = sanitizeHtmlForPdf(compiled(templateData))

  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>")
  const pdfContent = htmlToPdfmake(renderedHtml, {
    window: dom.window as unknown as Window,
    tableAutoSize: true,
  })

  const pageSize =
    options.page_size ||
    (context.document_type === "receipt" ? "80MM" : "A4")
  const isThermal = pageSize === "80MM" || pageSize === "58MM"

  const docDefinition: Record<string, unknown> = {
    pageSize: resolvePageSizeSpec(pageSize, context.order.items.length),
    pageOrientation: isThermal ? "portrait" : options.orientation || "portrait",
    pageMargins: isThermal
      ? [10, 12, 10, 12]
      : [
          mergedStyles.margin_left ?? 36,
          mergedStyles.margin_top ?? 36,
          mergedStyles.margin_right ?? 36,
          mergedStyles.margin_bottom ?? 36,
        ],
    content: Array.isArray(pdfContent) ? pdfContent : [pdfContent],
    defaultStyle: {
      fontSize: isThermal ? 8 : mergedStyles.font_size || 9.5,
      color: mergedStyles.text_color || "#18181b",
    },
  }

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition)
      pdfDocGenerator.getBuffer((buffer: Uint8Array) => {
        resolve(Buffer.from(buffer))
      })
    } catch (err) {
      reject(err)
    }
  })
}

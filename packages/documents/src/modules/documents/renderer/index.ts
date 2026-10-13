import React from "react"
import type {
  DocumentRenderContext,
  TemplateRenderTarget,
} from "../types"
import { getTranslations } from "../i18n"
import { CleanTemplate } from "./react-pdf/clean-template"
import { ClassicTemplate } from "./react-pdf/classic-template"
import { CompactTemplate } from "./react-pdf/compact-template"
import { PackingSlipTemplate } from "./react-pdf/packing-slip-template"
import { CreditNoteTemplate } from "./react-pdf/credit-note-template"
import { PosReceiptTemplate } from "./react-pdf/pos-receipt-template"
import { renderHandlebarsPdf } from "./pdfmake/html-engine"

export type { TemplateRenderTarget }

/**
 * Dual-Engine PDF Renderer Dispatcher:
 * - Uses `@react-pdf/renderer` for built-in React presets (`clean`, `classic`, `compact`,
 *   `packing_slip`, `credit_note`, `pos_80mm`, `pos_58mm`)
 * - Uses `Handlebars + pdfmake` for custom HTML templates and POS thermal templates
 * - Gracefully falls back to `Handlebars + pdfmake` if `@react-pdf/renderer` stream rendering
 *   is unavailable in the current runtime.
 */
export async function renderDocumentPdf(
  context: DocumentRenderContext,
  customTemplate?: TemplateRenderTarget | null,
  customTranslations?: Record<string, Record<string, string>> | null
): Promise<Buffer> {
  const t = getTranslations(context.locale, customTranslations)

  const requestedPreset = (
    customTemplate?.preset_key ||
    context.settings.template_key ||
    (context.document_type === "packing_slip"
      ? "packing_slip"
      : context.document_type === "credit_note"
        ? "credit_note"
        : context.document_type === "receipt"
          ? "pos_80mm"
          : "clean")
  ).toLowerCase()

  const shouldUseHandlebars =
    customTemplate?.engine === "handlebars" &&
    Boolean(customTemplate?.html_content?.trim())

  if (shouldUseHandlebars && customTemplate) {
    return renderHandlebarsPdf(context, t, {
      html_content: customTemplate.html_content,
      page_size: customTemplate.page_size,
      orientation: customTemplate.orientation,
      styles: customTemplate.styles,
      sections: customTemplate.sections,
    })
  }

  // Engine A: @react-pdf/renderer built-in presets
  try {
    const reactPdf = await import("@react-pdf/renderer")
    const renderToBuffer = reactPdf.renderToBuffer

    if (typeof renderToBuffer === "function") {
      let element: React.ReactElement
      if (
        context.document_type === "packing_slip" ||
        requestedPreset === "packing_slip"
      ) {
        element = <PackingSlipTemplate context={context} t={t} />
      } else if (
        context.document_type === "credit_note" ||
        requestedPreset === "credit_note"
      ) {
        element = <CreditNoteTemplate context={context} t={t} />
      } else if (
        context.document_type === "receipt" ||
        requestedPreset === "pos_80mm" ||
        requestedPreset === "pos_58mm"
      ) {
        const widthMm = requestedPreset === "pos_58mm" ? 58 : 80
        element = (
          <PosReceiptTemplate context={context} t={t} widthMm={widthMm} />
        )
      } else if (requestedPreset === "classic") {
        element = <ClassicTemplate context={context} t={t} />
      } else if (requestedPreset === "compact") {
        element = <CompactTemplate context={context} t={t} />
      } else {
        element = <CleanTemplate context={context} t={t} />
      }

      const buffer = await renderToBuffer(element)
      return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
    }
  } catch {
    // If @react-pdf/renderer is not installed in node_modules yet, fall back to Engine B (pdfmake)
  }

  // Fallback / Engine B: Handlebars + pdfmake
  const pageSize: PageSize =
    requestedPreset === "pos_58mm"
      ? "58MM"
      : requestedPreset === "pos_80mm" || context.document_type === "receipt"
        ? "80MM"
        : customTemplate?.page_size || "A4"

  return renderHandlebarsPdf(context, t, {
    html_content: customTemplate?.html_content,
    page_size: pageSize,
    orientation: customTemplate?.orientation || "portrait",
    styles: customTemplate?.styles,
    sections: customTemplate?.sections,
  })
}

export * from "./pdfmake/default-templates"
export * from "./pdfmake/html-engine"

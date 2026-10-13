import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  DOCUMENTS_MODULE,
  DocumentRenderContext,
  DocumentType,
} from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import { createMockRenderContext } from "../../../../modules/documents/utils/mock-order"
import { renderDocumentPdf } from "../../../../modules/documents/renderer"

async function handlePreview(req: MedusaRequest, res: MedusaResponse) {
  const query = req.query || {}
  const body = (req.body || {}) as Record<string, any>

  const documentType = (body.document_type ||
    query.document_type ||
    "invoice") as DocumentType
  const templateKey = (body.template ||
    body.template_id ||
    query.template ||
    query.template_id) as string | undefined
  const locale = (body.locale || query.locale) as string | undefined
  const regionId = (body.region_id || query.region_id) as string | undefined
  const orderId = (body.order_id || query.order_id) as string | undefined
  const itemCount = Number(body.items || query.items || 4)

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const resolvedSettings = await documentsService.resolveSettings(regionId)
  const mergedSettings = {
    ...resolvedSettings,
    ...(body.settings_override || {}),
  }

  const settingsSnapshot = await documentsService.buildSettingsSnapshot(
    mergedSettings,
    documentType,
    {
      localeOverride: locale,
      templateKeyOverride: templateKey,
    }
  )

  let context: DocumentRenderContext

  // Phase 8.2: Real-Order Preview (?order_id=...)
  if (orderId && orderId.trim().length > 0) {
    let rawOrder: any = null
    try {
      const graphQuery = req.scope.resolve(
        ContainerRegistrationKeys.QUERY
      ) as any
      const { data } = await graphQuery.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "created_at",
          "currency_code",
          "email",
          "region_id",
          "subtotal",
          "discount_total",
          "shipping_total",
          "tax_total",
          "total",
          "metadata",
          "customer.*",
          "billing_address.*",
          "shipping_address.*",
          "items.*",
        ],
        filters: { id: orderId.trim() },
      })
      rawOrder = data?.[0]
    } catch {
      const orderModule = req.scope.resolve(Modules.ORDER) as any
      rawOrder = await orderModule.retrieveOrder(orderId.trim(), {
        relations: ["items", "billing_address", "shipping_address"],
      })
    }

    if (!rawOrder) {
      return res.status(404).json({ message: `Order ${orderId} not found` })
    }

    const b2b = await documentsService.resolveOrderB2BContext(
      rawOrder,
      req.scope
    )
    const mockBase = createMockRenderContext(documentType, settingsSnapshot, {
      locale: settingsSnapshot.locale,
    })

    context = {
      ...mockBase,
      document_number: `PREVIEW-${documentType.toUpperCase()}-${rawOrder.display_id || "1"}`,
      order: {
        id: rawOrder.id,
        display_id: rawOrder.display_id ?? rawOrder.id,
        created_at: rawOrder.created_at
          ? new Date(rawOrder.created_at).toISOString()
          : new Date().toISOString(),
        currency_code: String(rawOrder.currency_code || "USD").toUpperCase(),
        email: rawOrder.email ?? null,
        region_id: rawOrder.region_id ?? null,
        subtotal: Number(rawOrder.subtotal ?? 0),
        discount_total: Number(rawOrder.discount_total ?? 0),
        shipping_total: Number(rawOrder.shipping_total ?? 0),
        tax_total: Number(rawOrder.tax_total ?? 0),
        total: Number(rawOrder.total ?? 0),
        customer: rawOrder.customer ?? null,
        billing_address: rawOrder.billing_address ?? null,
        shipping_address: rawOrder.shipping_address ?? null,
        items: (rawOrder.items || []).map((item: any, idx: number) => ({
          id: String(item.id || `item_${idx}`),
          title: String(item.title || "Item"),
          variant_title: item.variant_title ?? null,
          sku: item.variant_sku ?? item.sku ?? null,
          quantity: Number(item.quantity ?? 1),
          unit_price: Number(item.unit_price ?? 0),
          subtotal: Number(
            item.subtotal ??
              Number(item.unit_price ?? 0) * Number(item.quantity ?? 1)
          ),
          tax_total: Number(item.tax_total ?? 0),
          discount_total: Number(item.discount_total ?? 0),
          total: Number(
            item.total ??
              Number(item.unit_price ?? 0) * Number(item.quantity ?? 1)
          ),
          weight: item.weight ? Number(item.weight) : null,
        })),
      },
      settings: settingsSnapshot,
      b2b,
    }
  } else {
    // Mock Order Preview (supports ?items=75 multi-page stress test from LogicDine)
    context = createMockRenderContext(documentType, settingsSnapshot, {
      itemCount,
      locale: settingsSnapshot.locale,
    })
  }

  let buffer: Buffer
  if (body.html_content) {
    buffer = await renderDocumentPdf(
      context,
      {
        engine: "handlebars",
        html_content: body.html_content,
        page_size: body.page_size || "A4",
        orientation: body.orientation || "portrait",
        styles: body.styles,
        sections: body.sections,
      },
      mergedSettings.custom_translations
    )
  } else {
    buffer = await documentsService.renderPdf(
      context,
      mergedSettings.custom_translations
    )
  }

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader(
    "Content-Disposition",
    `inline; filename="preview-${documentType}.pdf"`
  )
  return res.status(200).send(buffer)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  return handlePreview(req, res)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return handlePreview(req, res)
}

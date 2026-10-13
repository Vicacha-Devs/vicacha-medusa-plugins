import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import {
  DOCUMENTS_MODULE,
  type FetchOrderContextInput,
  type OrderAddressSnapshot,
  type OrderFulfillmentSnapshot,
  type OrderLineItemSnapshot,
  type OrderRefundSnapshot,
} from "../../types"
import DocumentsModuleService from "../../modules/documents/service"

export type { FetchOrderContextInput } from "../../types"

function normalizeAddress(addr: any): OrderAddressSnapshot | null {
  if (!addr || typeof addr !== "object") return null
  return {
    first_name: addr.first_name ?? null,
    last_name: addr.last_name ?? null,
    company: addr.company ?? null,
    address_1: addr.address_1 ?? null,
    address_2: addr.address_2 ?? null,
    city: addr.city ?? null,
    province: addr.province ?? null,
    postal_code: addr.postal_code ?? null,
    country_code: addr.country_code ?? null,
    phone: addr.phone ?? null,
  }
}

export const fetchOrderContextStep = createStep(
  "fetch-order-context",
  async (input: FetchOrderContextInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

    let rawOrder: any = null

    // 1. Try Query graph first (Medusa v2 standard)
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
      if (query && typeof query.graph === "function") {
        const { data } = await query.graph({
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
            "fulfillments.*",
            "fulfillments.items.*",
            "fulfillments.labels.*",
          ],
          filters: { id: input.order_id },
        })
        if (Array.isArray(data) && data.length > 0) {
          rawOrder = data[0]
        }
      }
    } catch {
      // Fall back to Order Module service
    }

    // 2. Fallback to Modules.ORDER service
    if (!rawOrder) {
      const orderModule = container.resolve(Modules.ORDER) as any
      rawOrder = await orderModule.retrieveOrder(input.order_id, {
        relations: [
          "items",
          "billing_address",
          "shipping_address",
          "fulfillments",
        ],
      })
    }

    if (!rawOrder) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order ${input.order_id} not found`
      )
    }

    const items: OrderLineItemSnapshot[] = (rawOrder.items || []).map(
      (item: any, idx: number) => {
        const qty = Number(item.quantity ?? 1)
        const unitPrice = Number(item.unit_price ?? 0)
        const subtotal = Number(item.subtotal ?? unitPrice * qty)
        const taxTotal = Number(item.tax_total ?? 0)
        const discountTotal = Number(item.discount_total ?? 0)
        const total = Number(item.total ?? subtotal + taxTotal - discountTotal)

        return {
          id: String(item.id || `item_${idx + 1}`),
          title: String(item.title || item.product_title || "Item"),
          subtitle: item.subtitle ?? null,
          variant_title: item.variant_title ?? null,
          sku: item.variant_sku ?? item.sku ?? null,
          barcode: item.variant_barcode ?? item.barcode ?? null,
          quantity: qty,
          unit_price: unitPrice,
          subtotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          total,
          weight: item.weight ? Number(item.weight) : null,
          metadata: item.metadata ?? null,
        }
      }
    )

    const computedSubtotal = items.reduce((acc, i) => acc + i.subtotal, 0)
    const computedTax = items.reduce((acc, i) => acc + i.tax_total, 0)

    const subtotal = Number(rawOrder.subtotal ?? computedSubtotal)
    const discountTotal = Number(rawOrder.discount_total ?? 0)
    const shippingTotal = Number(rawOrder.shipping_total ?? 0)
    const taxTotal = Number(rawOrder.tax_total ?? computedTax)
    const total = Number(
      rawOrder.total ?? subtotal - discountTotal + shippingTotal + taxTotal
    )

    // Extract fulfillment snapshot if requested or available
    let fulfillmentSnapshot: OrderFulfillmentSnapshot | null = null
    const fulfillments: any[] = Array.isArray(rawOrder.fulfillments)
      ? rawOrder.fulfillments
      : []
    const matchedFulfillment = input.fulfillment_id
      ? fulfillments.find((f) => f.id === input.fulfillment_id) ||
        fulfillments[fulfillments.length - 1]
      : fulfillments[fulfillments.length - 1]

    if (matchedFulfillment) {
      const labels: any[] = Array.isArray(matchedFulfillment.labels)
        ? matchedFulfillment.labels
        : []
      const trackingNumbers = [
        ...(Array.isArray(matchedFulfillment.tracking_numbers)
          ? matchedFulfillment.tracking_numbers
          : []),
        ...labels.map((l) => l.tracking_number).filter(Boolean),
      ]
      const trackingLinks = [
        ...(Array.isArray(matchedFulfillment.tracking_links)
          ? matchedFulfillment.tracking_links.map((l: any) =>
              typeof l === "string" ? l : l.url
            )
          : []),
        ...labels.map((l) => l.tracking_url).filter(Boolean),
      ].filter(Boolean)

      fulfillmentSnapshot = {
        id: String(matchedFulfillment.id),
        created_at: matchedFulfillment.created_at
          ? new Date(matchedFulfillment.created_at).toISOString()
          : null,
        shipped_at: matchedFulfillment.shipped_at
          ? new Date(matchedFulfillment.shipped_at).toISOString()
          : null,
        tracking_numbers: Array.from(new Set(trackingNumbers)),
        tracking_links: Array.from(new Set(trackingLinks)),
        carrier: matchedFulfillment.provider_id ?? null,
        warehouse_address: matchedFulfillment.delivery_address?.address_1 ?? null,
        items: Array.isArray(matchedFulfillment.items) &&
          matchedFulfillment.items.length > 0
          ? matchedFulfillment.items.map((fi: any) => {
              const orderItem = items.find(
                (oi) => oi.id === fi.line_item_id || oi.sku === fi.sku
              )
              return {
                line_item_id: fi.line_item_id,
                title: fi.title || orderItem?.title || "Item",
                sku: fi.sku || orderItem?.sku || null,
                variant_title: orderItem?.variant_title ?? null,
                quantity: Number(fi.quantity ?? orderItem?.quantity ?? 1),
                weight: orderItem?.weight ?? null,
              }
            })
          : items.map((oi) => ({
              line_item_id: oi.id,
              title: oi.title,
              sku: oi.sku,
              variant_title: oi.variant_title,
              quantity: oi.quantity,
              weight: oi.weight,
            })),
      }
    }

    // Extract refund snapshot if provided
    let refundSnapshot: OrderRefundSnapshot | null = null
    if (input.refund_id || input.refund_amount || input.refund_reason) {
      refundSnapshot = {
        id: input.refund_id || `ref_${Date.now()}`,
        amount: Math.abs(Number(input.refund_amount ?? total)),
        reason: input.refund_reason ?? "Order refund",
        created_at: new Date().toISOString(),
      }
    }

    const b2b = await documentsService.resolveOrderB2BContext(
      rawOrder,
      container
    )

    return new StepResponse({
      order: {
        id: String(rawOrder.id),
        display_id: rawOrder.display_id ?? rawOrder.id,
        created_at: rawOrder.created_at
          ? new Date(rawOrder.created_at).toISOString()
          : new Date().toISOString(),
        currency_code: String(rawOrder.currency_code || "USD").toUpperCase(),
        email: rawOrder.email ?? rawOrder.customer?.email ?? null,
        region_id: rawOrder.region_id ?? null,
        payment_status: rawOrder.payment_status ?? null,
        fulfillment_status: rawOrder.fulfillment_status ?? null,
        payment_method:
          (rawOrder.metadata?.payment_method as string) ?? undefined,
        subtotal,
        discount_total: discountTotal,
        shipping_total: shippingTotal,
        tax_total: taxTotal,
        total,
        customer: rawOrder.customer
          ? {
              id: rawOrder.customer.id,
              first_name: rawOrder.customer.first_name ?? null,
              last_name: rawOrder.customer.last_name ?? null,
              email: rawOrder.customer.email ?? null,
              phone: rawOrder.customer.phone ?? null,
              company_name: rawOrder.customer.company_name ?? null,
            }
          : null,
        billing_address: normalizeAddress(rawOrder.billing_address),
        shipping_address: normalizeAddress(rawOrder.shipping_address),
        items,
        metadata: rawOrder.metadata ?? null,
      },
      b2b,
      fulfillment: fulfillmentSnapshot,
      refund: refundSnapshot,
    })
  }
)

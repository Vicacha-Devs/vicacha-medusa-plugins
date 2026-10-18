import {
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  OdooWebhookPayload,
  OdooWebhookProcessResult,
  OdooWebhookSettings,
} from "./types"
import type { OdooModuleService } from "./service"
import { errorMessage } from "./utils/errors"
import {
  computeExternalChecksum,
  verifyOdooWebhookSignature,
} from "./utils/security"

export async function processWebhookEvent(this: OdooModuleService, params: {
  rawBody: string | Buffer
  signatureHeader?: string | null
  payload: OdooWebhookPayload
  scope?: unknown
  executeSync?: boolean
}): Promise<OdooWebhookProcessResult> {
  const config = await this.getConnectionConfig()
  const webhookSettings =
    await this.getSectionSettings<OdooWebhookSettings>("webhooks")
  const secret = webhookSettings.webhookSecret || config.webhookSecret

  if (secret) {
    const valid = verifyOdooWebhookSignature(
      params.rawBody,
      params.signatureHeader,
      secret
    )
    if (!valid) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid Odoo webhook HMAC signature"
      )
    }
  }

  const eventId =
    params.payload.event_id ||
    computeExternalChecksum({
      event: params.payload.event,
      record_id: params.payload.record_id,
      data: params.payload.data,
    })

  const existing = await this.listOdooWebhookEvents(
    { event_id: eventId },
    { take: 1 }
  )
  if (existing?.[0]) {
    return {
      ok: true,
      duplicate: true,
      eventId,
      event: params.payload.event,
      actionTaken: "ignored_duplicate",
    }
  }

  let actionTaken = "logged"
  let processingError: string | null = null
  const syncScope = params.scope as { resolve: (key: string) => unknown } | undefined
  const evt = params.payload.event
  const recordId =
    params.payload.record_id ??
    (typeof params.payload.data?.id === "number"
      ? params.payload.data.id
      : null)

  if (
    evt.startsWith("product.") &&
    webhookSettings.autoProcessProductEvents !== false
  ) {
    actionTaken = "queued_product_sync"
    if (params.executeSync !== false) {
      try {
        const res = await this.importProductsFromOdoo(syncScope, "webhook")
        if (!res.ok) processingError = res.message
      } catch (err) {
        processingError = errorMessage(err)
      }
    }
  } else if (
    evt.startsWith("stock.") &&
    webhookSettings.autoProcessStockEvents !== false
  ) {
    actionTaken = "queued_inventory_sync"
    if (typeof params.payload.data?.barcode === "string") {
      await this.invalidateBarcodeCache(params.payload.data.barcode)
    }
    if (params.executeSync !== false) {
      try {
        const res = await this.importInventoryFromOdoo(
          syncScope,
          undefined,
          "webhook"
        )
        if (!res.ok) processingError = res.message
      } catch (err) {
        processingError = errorMessage(err)
      }
    }
  } else if (
    evt.startsWith("partner.") &&
    webhookSettings.autoProcessCustomerEvents !== false
  ) {
    actionTaken = "queued_customer_sync"
    if (params.executeSync !== false) {
      try {
        const res = await this.syncCustomers({
          directionOverride: "odoo_to_medusa",
          scope: params.scope,
          trigger: "webhook",
        })
        if (!res.ok) processingError = res.message
      } catch (err) {
        processingError = errorMessage(err)
      }
    }
  } else if (
    evt.startsWith("order.") &&
    webhookSettings.autoProcessOrderEvents !== false
  ) {
    actionTaken = "queued_order_sync"
  }

  await this.createOdooWebhookEvents({
    event_id: eventId,
    event_type: evt,
    odoo_model: params.payload.model ?? null,
    odoo_record_id: recordId,
    status: processingError ? "failed" : "processed",
    error_message: processingError,
    payload: params.payload.data ?? null,
    processed_at: new Date(),
  })

  return {
    ok: !processingError,
    duplicate: false,
    eventId,
    event: evt,
    actionTaken,
  }
}

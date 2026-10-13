import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  resolveB2BNotificationContacts,
  resolveOrderDocumentAttachments,
} from "../modules/notifications/integrations/documents-and-b2b-resolver"
import type NotificationsModuleService from "../modules/notifications/service"
import {
  type ContextType,
  type HydrateEntityContextInput,
  NOTIFICATIONS_MODULE,
  type NotificationAttachment,
  type NotificationChannel,
  type RenderedNotificationPayload,
} from "../types"
import {
  getMockContextByType,
  transformInventoryLevelData,
  transformOrderData,
  transformProductData,
  transformShipmentData,
} from "../modules/notifications/utils/transformers"

export type { HydrateEntityContextInput } from "../types"

/**
 * Resolves and transforms the entity data for an event or preview request using `query.graph`
 * with safe fallback to `event_data` or mock preview data.
 */
export async function hydrateEntityContextData(
  container: { resolve: (key: string) => any },
  input: HydrateEntityContextInput
): Promise<{
  contextType: ContextType
  entityId: string | null
  rawOrder: Record<string, any> | null
  transformedData: Record<string, any>
}> {
  let mpnService: NotificationsModuleService | null = null
  try {
    mpnService = container.resolve(NOTIFICATIONS_MODULE)
  } catch {
    mpnService = null
  }
  const pluginOptions = mpnService?.getPluginOptions()
  const locale = input.locale || pluginOptions?.defaultLocale || "en"
  const evName = input.event_name || ""
  const evData = input.event_data || {}
  const entityId =
    input.entity_id ||
    evData.id ||
    evData.order_id ||
    evData.document_id ||
    evData.inventory_item_id ||
    null

  let contextType: ContextType = input.context_type || "custom"
  if (!input.context_type) {
    if (evName.startsWith("order.")) contextType = "order"
    else if (
      evName === "shipment.created" ||
      evName === "delivery.created" ||
      evName.startsWith("fulfillment.")
    ) {
      contextType = "shipment"
    } else if (evName.startsWith("inventory")) contextType = "inventory-level"
    else if (evName.startsWith("product")) contextType = "product"
    else if (evName === "document.generated") contextType = "document"
    else if (evName === "cart.abandoned") contextType = "cart"
    else if (evName === "auth.otp_generated") contextType = "otp"
  }

  let query: any = null
  try {
    query = container.resolve(ContainerRegistrationKeys.QUERY)
  } catch {
    query = null
  }

  let rawOrder: Record<string, any> | null = null

  if (contextType === "order") {
    const orderId = evData.order_id || entityId
    if (orderId && query && typeof query.graph === "function") {
      try {
        const { data } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "display_id",
            "status",
            "payment_status",
            "fulfillment_status",
            "currency_code",
            "email",
            "total",
            "subtotal",
            "item_subtotal",
            "shipping_total",
            "tax_total",
            "discount_total",
            "region_id",
            "sales_channel_id",
            "created_at",
            "metadata",
            "customer.*",
            "items.*",
            "shipping_address.*",
            "billing_address.*",
          ],
          filters: { id: orderId },
        })
        if (Array.isArray(data) && data.length > 0) {
          rawOrder = data[0]
        }
      } catch {
        // Fall back to event_data
      }
    }

    const baseOrder = rawOrder || (evData.items ? evData : null)
    const transformedData = baseOrder
      ? transformOrderData(baseOrder, pluginOptions, locale)
      : {
          ...getMockContextByType("order", pluginOptions, locale),
          ...evData,
        }
    return {
      contextType: "order",
      entityId: String(orderId || transformedData.id || ""),
      rawOrder: baseOrder,
      transformedData,
    }
  }

  if (contextType === "shipment") {
    let fulfillment: Record<string, any> | null = evData
    const fulId = evData.fulfillment_id || evData.id || entityId
    if (fulId && query && typeof query.graph === "function") {
      try {
        const { data } = await query.graph({
          entity: "fulfillment",
          fields: ["id", "provider_id", "labels.*", "order.*"],
          filters: { id: fulId },
        })
        if (Array.isArray(data) && data.length > 0) {
          fulfillment = data[0]
          rawOrder = data[0].order || null
        }
      } catch {
        // Fallback
      }
    }
    const transformedData = transformShipmentData(
      fulfillment || {},
      rawOrder || evData.order || null,
      pluginOptions,
      locale
    )
    return {
      contextType: "shipment",
      entityId: String(fulId || transformedData.fulfillment_id || ""),
      rawOrder,
      transformedData,
    }
  }

  if (contextType === "inventory-level") {
    const transformedData = transformInventoryLevelData(evData, pluginOptions)
    return {
      contextType: "inventory-level",
      entityId: String(entityId || transformedData.id || ""),
      rawOrder: null,
      transformedData,
    }
  }

  if (contextType === "product") {
    const transformedData = transformProductData(evData, pluginOptions)
    return {
      contextType: "product",
      entityId: String(entityId || transformedData.id || ""),
      rawOrder: null,
      transformedData,
    }
  }

  const fallbackMock = getMockContextByType(contextType, pluginOptions, locale)
  return {
    contextType,
    entityId: entityId ? String(entityId) : null,
    rawOrder: null,
    transformedData: {
      ...fallbackMock,
      ...evData,
    },
  }
}

/**
 * Core execution helper for dispatching all active DB mappings matching an event.
 * Can be called directly from subscribers, API routes, or inside `dispatchEventNotificationsWorkflow`.
 */
export async function executeEventNotificationsDispatch(
  container: { resolve: (key: string) => any },
  input: {
    event_name: string
    event_data: Record<string, any>
    force_send?: boolean
  }
): Promise<{
  event_name: string
  matched_mappings: number
  sent_count: number
  skipped_count: number
  failed_count: number
  results: Array<Record<string, any>>
}> {
  const mpnService = container.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const mappings = await mpnService.listMpnEventMappings({
    event_name: input.event_name,
    is_active: true,
  })

  if (!Array.isArray(mappings) || mappings.length === 0) {
    return {
      event_name: input.event_name,
      matched_mappings: 0,
      sent_count: 0,
      skipped_count: 0,
      failed_count: 0,
      results: [],
    }
  }

  const sortedMappings = [...mappings].sort(
    (a: any, b: any) => Number(b.priority ?? 0) - Number(a.priority ?? 0)
  )

  const { entityId, rawOrder, transformedData } =
    await hydrateEntityContextData(container, {
      event_name: input.event_name,
      event_data: input.event_data,
    })

  const b2bContacts = await resolveB2BNotificationContacts(
    container,
    rawOrder || transformedData
  )

  let notificationModuleService: any = null
  try {
    notificationModuleService = container.resolve(Modules.NOTIFICATION)
  } catch {
    notificationModuleService = null
  }

  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0
  const results: Array<Record<string, any>> = []

  const concurrency = Math.max(
    1,
    Number(
      mpnService.getPluginOptions().sendConcurrency ||
        process.env.MAILER_SEND_CONCURRENCY ||
        process.env.WHATSAPP_SEND_CONCURRENCY ||
        2
    )
  )

  for (let i = 0; i < sortedMappings.length; i += concurrency) {
    const batch = sortedMappings.slice(i, i + concurrency)
    const batchOutcomes = await Promise.all(
      batch.map(async (mapping: any) => {
        const channel = (mapping.channel || "email") as NotificationChannel

        // 1. Check conditions
        if (
          !mpnService.evaluateEventConditions(
            mapping.conditions,
            transformedData
          )
        ) {
          skippedCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "skipped_conditions",
          }
        }

        // 2. Load channel config
        const channelConfig = await mpnService.getOrCreateChannelConfig(channel)
        if (channelConfig && channelConfig.is_enabled === false) {
          skippedCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "skipped_channel_disabled",
          }
        }

        // Telegram verification gate for merchant channel notifications
        if (
          channel === "telegram" &&
          mapping.recipient_rule === "merchant_channel" &&
          !channelConfig.is_verified &&
          !input.force_send
        ) {
          skippedCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "skipped_telegram_unverified",
          }
        }

        // 3. Resolve recipient
        const recipient = mpnService.resolveRecipientForRule({
          rule: mapping.recipient_rule || "customer_auto",
          custom_recipient: mapping.custom_recipient,
          channel,
          data: transformedData,
          b2b_contacts: b2bContacts,
          channel_config: channelConfig,
        })

        if (!recipient) {
          skippedCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "skipped_no_recipient",
          }
        }

        // 4. Consent ledger check (SMS & WhatsApp)
        const consentCheck = await mpnService.verifyRecipientConsent({
          recipient,
          channel,
          requireExplicitOptIn: mapping.conditions?.require_consent,
        })

        if (!consentCheck.allowed && !input.force_send) {
          const idempKey = `${input.event_name}:${entityId || "global"}:${channel}:${mapping.template_id}:${recipient}`
          await mpnService.recordDeliveryLog({
            idempotency_key: idempKey,
            event_name: input.event_name,
            entity_id: entityId,
            channel,
            template_id: mapping.template_id,
            mapping_id: mapping.id,
            recipient,
            status: "skipped_no_consent",
            error_message: consentCheck.reason,
          })
          skippedCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "skipped_no_consent",
            reason: consentCheck.reason,
          }
        }

        // 5. Idempotency check
        const idemp = await mpnService.checkIdempotency({
          event_name: input.event_name,
          entity_id: entityId,
          channel,
          template_id: mapping.template_id,
          recipient,
        })

        if (idemp.duplicate && !input.force_send) {
          skippedCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "skipped_idempotent",
            idempotency_key: idemp.idempotencyKey,
          }
        }

        // 6. Resolve optional PDF attachments from medusa-documents-plugin
        let attachments: NotificationAttachment[] = []
        if (
          Array.isArray(mapping.attach_document_types) &&
          mapping.attach_document_types.length > 0
        ) {
          const orderIdForDocs =
            transformedData.order_id || transformedData.id || entityId
          attachments = await resolveOrderDocumentAttachments(
            container,
            orderIdForDocs,
            mapping.attach_document_types
          )
        }

        try {
          // 7. Render notification payload
          const rendered = await mpnService.renderTemplateById({
            template_id: mapping.template_id,
            data: {
              ...transformedData,
              RecipientEmail: recipient,
            },
            variable_map_override: mapping.variable_map,
            telegram_thread_id:
              mapping.telegram_thread_id ??
              channelConfig?.config_json?.default_thread_id ??
              null,
            attachments,
            append_sms_consent_footer: consentCheck.appendStopFooter,
          })

          // 8. Dispatch via Medusa Notification Module or Sandbox
          let externalMessageId = `mpn_${channel}_${Date.now()}`
          if (
            notificationModuleService &&
            typeof notificationModuleService.createNotifications === "function"
          ) {
            const notifRes =
              await notificationModuleService.createNotifications({
                to: recipient,
                channel,
                template: rendered.template_name,
                content: {
                  subject: rendered.subject,
                  html: rendered.html,
                  text: rendered.text,
                },
                data: {
                  ...transformedData,
                  subject: rendered.subject,
                  html: rendered.html,
                  text: rendered.text,
                  blocks_json: rendered.blocks_json,
                  telegram_options: rendered.telegram_options,
                  whatsapp_options: rendered.whatsapp_options,
                  sms_options: rendered.sms_options,
                  sender_profile_index: mapping.sender_profile_index || 1,
                },
                attachments: rendered.attachments,
              })
            if (notifRes?.id) {
              externalMessageId = String(notifRes.id)
            }
          } else {
            // Capture in sandbox when core Notification module has no provider bound
            const sbx = await mpnService.captureSandboxMessage({
              channel,
              recipient,
              subject: rendered.subject,
              body: rendered.text,
              html: rendered.html,
              attachments_meta: rendered.attachments?.map((a) => ({
                filename: a.filename,
                content_type: a.content_type,
              })),
            })
            externalMessageId = sbx.id
          }

          // Mark `first_message_sent = true` on consent record if applicable
          if (consentCheck.consentRecordId) {
            await mpnService.updateMpnConsentRecords({
              id: consentCheck.consentRecordId,
              first_message_sent: true,
            })
          }

          await mpnService.recordDeliveryLog({
            idempotency_key: idemp.idempotencyKey,
            event_name: input.event_name,
            entity_id: entityId,
            channel,
            driver: channelConfig?.driver || "default",
            template_id: mapping.template_id,
            mapping_id: mapping.id,
            recipient,
            status: "sent",
            external_message_id: externalMessageId,
            payload: rendered,
          })

          sentCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "sent",
            external_message_id: externalMessageId,
          }
        } catch (err: any) {
          await mpnService.recordDeliveryLog({
            idempotency_key: idemp.idempotencyKey,
            event_name: input.event_name,
            entity_id: entityId,
            channel,
            driver: channelConfig?.driver || "default",
            template_id: mapping.template_id,
            mapping_id: mapping.id,
            recipient,
            status: "failed",
            error_code: String(err?.code || "SEND_ERROR"),
            error_message: err?.message || "Notification dispatch failed",
          })
          failedCount++
          return {
            mapping_id: mapping.id,
            channel,
            status: "failed",
            error: err?.message || "Notification dispatch failed",
          }
        }
      })
    )
    results.push(...batchOutcomes)
  }

  return {
    event_name: input.event_name,
    matched_mappings: sortedMappings.length,
    sent_count: sentCount,
    skipped_count: skippedCount,
    failed_count: failedCount,
    results,
  }
}

const renderTemplateStep = createStep(
  "render-template",
  async (
    input: {
      template_id: string
      context_type?: ContextType
      entity_id?: string | null
      data?: Record<string, any>
      locale?: string | null
    },
    { container }
  ) => {
    const mpnService = container.resolve(
      NOTIFICATIONS_MODULE
    ) as NotificationsModuleService
    const hydrated = input.data
      ? { transformedData: input.data }
      : await hydrateEntityContextData(container, {
          context_type: input.context_type || "order",
          entity_id: input.entity_id,
          locale: input.locale,
        })

    const rendered = await mpnService.renderTemplateById({
      template_id: input.template_id,
      context_type: input.context_type,
      data: hydrated.transformedData,
      locale: input.locale,
    })

    return new StepResponse(rendered)
  }
)

export const renderNotificationTemplateWorkflow = createWorkflow(
  "render-notification-template",
  (input: {
    template_id: string
    context_type?: ContextType
    entity_id?: string | null
    data?: Record<string, any>
    locale?: string | null
  }) => {
    const rendered = renderTemplateStep(input)
    return new WorkflowResponse(rendered)
  }
)

const dispatchEventStep = createStep(
  "dispatch-event",
  async (
    input: {
      event_name: string
      event_data: Record<string, any>
      force_send?: boolean
    },
    { container }
  ) => {
    const outcome = await executeEventNotificationsDispatch(container, input)
    return new StepResponse(outcome)
  }
)

export const dispatchEventNotificationsWorkflow = createWorkflow(
  "dispatch-event-notifications",
  (input: {
    event_name: string
    event_data: Record<string, any>
    force_send?: boolean
  }) => {
    const outcome = dispatchEventStep(input)
    return new WorkflowResponse(outcome)
  }
)

export type { RenderedNotificationPayload }

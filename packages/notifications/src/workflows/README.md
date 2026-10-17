# Workflows

Medusa workflows (`@medusajs/framework/workflows-sdk`) and orchestration helpers that hydrate entity contexts, render multi-channel templates, evaluate event mappings, attach documents, and dispatch notifications.

```sh
workflows/
└── index.ts        Workflows, steps, and core hydration/dispatch orchestration functions
```

---

## Exported Workflows & Steps

| Symbol | Type | ID | Trigger / Caller |
| --- | --- | --- | --- |
| `renderNotificationTemplateWorkflow` | Workflow | `"render-notification-template"` | `POST /admin/mpn/render-template`, custom routes |
| `renderTemplateStep` (`resolveAndRenderTemplateStep`) | Step | `"render-template"` | Internal step of `renderNotificationTemplateWorkflow` |
| `dispatchEventNotificationsWorkflow` | Workflow | `"dispatch-event-notifications"` | Subscribers, scheduled jobs, `POST /admin/mpn/send` |
| `dispatchEventStep` (`dispatchEventNotificationsStep`) | Step | `"dispatch-event"` | Internal step of `dispatchEventNotificationsWorkflow` |
| `hydrateEntityContextData` | Helper | — | Hydrates live entity graph (`order`, `shipment`, `inventory-level`, `product`, `cart`, `document`, `otp`) via `query.graph` with safe mock fallback |
| `executeEventNotificationsDispatch` | Helper | — | Evaluates active `mpn_event_mapping` rules, consent, idempotency, optional `medusa-plugin-documents` PDF attachments, and dispatches via `Modules.NOTIFICATION` or Sandbox |

---

## 1. `renderNotificationTemplateWorkflow`

Resolves live entity data via `hydrateEntityContextData` (or uses provided `input.data` / mock preview context) and compiles the target template (`system_*` preset or `mpntpl_*` DB template) into channel-ready HTML, plain text, Slack Block Kit JSON, WhatsApp options, Telegram options, and SMS segment metrics.

```ts
import { renderNotificationTemplateWorkflow } from "@vicacha-devs/medusa-plugin-notifications/workflows"

const { result } = await renderNotificationTemplateWorkflow(req.scope).run({
  input: {
    template_id: "system_email_order_placed",
    context_type: "order",
    entity_id: "order_01J...",
    locale: "es",
  },
})
```

---

## 2. `dispatchEventNotificationsWorkflow` & `executeEventNotificationsDispatch`

Executes the full 8-stage notification pipeline for any emitted Medusa or custom store event:

1. **Mapping Lookup & Priority Sort**: Queries `mpn_event_mapping` for `{ event_name, is_active: true }` sorted by descending `priority`.
2. **Entity Hydration (`hydrateEntityContextData`)**: Queries `order` or `fulfillment` via `ContainerRegistrationKeys.QUERY` (`query.graph`) and normalizes data through `transformOrderData`, `transformShipmentData`, `transformInventoryLevelData`, or `transformProductData`.
3. **Condition & Channel Verification**: Evaluates `mapping.conditions` (`evaluateEventConditions`), checks `mpn_channel_config.is_enabled`, and enforces the Telegram Admin Verification Gate (`channelConfig.is_verified`) when `recipient_rule === "merchant_channel"`.
4. **Recipient & B2B Contact Resolution**: Resolves recipient via `resolveRecipientForRule` and `resolveB2BNotificationContacts`.
5. **TCPA / 10DLC & Bot Consent Check**: Calls `verifyRecipientConsent` against `mpn_consent_record` and appends `"Reply STOP to opt out"` on the first SMS message.
6. **Idempotency Check**: Calls `checkIdempotency` (`event_name:entity_id:channel:template_id:recipient`) to prevent duplicate sends.
7. **Optional Document Attachment (`resolveOrderDocumentAttachments`)**: Fetches generated PDF Invoices, Packing Slips, or Credit Notes from `medusa-plugin-documents` (`documentsModuleService`) when `mapping.attach_document_types` is non-empty.
8. **Render, Dispatch & Redacted Audit Log**: Compiles the template, dispatches via `Modules.NOTIFICATION` (`notificationModuleService.createNotifications`) or captures in `mpn_sandbox_message`, and records a PII-masked entry in `mpn_delivery_log`.

```ts
import { dispatchEventNotificationsWorkflow } from "@vicacha-devs/medusa-plugin-notifications/workflows"

const { result } = await dispatchEventNotificationsWorkflow(req.scope).run({
  input: {
    event_name: "order.placed",
    event_data: { id: "order_01J..." },
    force_send: false,
  },
})
```

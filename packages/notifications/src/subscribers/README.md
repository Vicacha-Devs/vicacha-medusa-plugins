# Subscribers

Event subscribers that listen to 25 Medusa core and custom plugin events and trigger database-driven notification mappings via `executeEventNotificationsDispatch`.

```sh
subscribers/
├── order-events.ts                         9 order.* lifecycle events
├── fulfillment-and-inventory-events.ts     6 shipment, delivery, fulfillment, and inventory events
└── customer-and-document-events.ts         10 customer, document, auth OTP, loyalty, wallet, membership & contact events
```

---

## Conventions

- Every subscriber delegates to `executeEventNotificationsDispatch(container, { event_name, event_data })` from `src/workflows/index.ts`.
- All subscribers wrap execution in a non-blocking `try / catch` block so store checkout, fulfillment, or customer creation workflows never fail if an external notification gateway is unreachable.
- `fulfillment-and-inventory-events.ts` normalizes `fulfillment.shipment_created` → `shipment.created` and `fulfillment.delivery_created` → `delivery.created` so merchants only need to configure a single canonical event mapping.

---

## Subscribed Events Reference

| Subscriber File | Event Name | Default Hydrated Context | Typical Channels & Presets |
| --- | --- | --- | --- |
| `order-events.ts` | `order.placed` | `order` | Email (`system_email_order_placed`), WhatsApp (`system_whatsapp_order_placed`), Telegram (`system_telegram_order_placed`), SMS (`system_sms_order_placed`), Slack (`system_slack_order_placed`) |
| `order-events.ts` | `order.completed` | `order` | Email, WhatsApp, Telegram, SMS |
| `order-events.ts` | `order.canceled` | `order` | Email, WhatsApp, Telegram, SMS |
| `order-events.ts` | `order.updated` | `order` | Email, Telegram |
| `order-events.ts` | `order.fulfillment_created` | `order` | Email, WhatsApp, SMS |
| `order-events.ts` | `order.fulfillment_canceled` | `order` | Email, Telegram |
| `order-events.ts` | `order.return_requested` | `order` | Email, Telegram, Slack |
| `order-events.ts` | `order.return_received` | `order` | Email, Telegram |
| `order-events.ts` | `order.refund_created` | `order` | Email (with Credit Note PDF), WhatsApp, SMS |
| `fulfillment-and-inventory-events.ts` | `shipment.created` | `shipment` | Email (`system_email_shipment_created`), WhatsApp (`system_whatsapp_shipment_created`), SMS (`system_sms_shipment_created`) |
| `fulfillment-and-inventory-events.ts` | `delivery.created` | `shipment` | Email, WhatsApp, SMS |
| `fulfillment-and-inventory-events.ts` | `fulfillment.created` | `shipment` | Email, Telegram |
| `fulfillment-and-inventory-events.ts` | `fulfillment.shipment_created` | `shipment` (normalized to `shipment.created`) | Email, WhatsApp, SMS |
| `fulfillment-and-inventory-events.ts` | `fulfillment.delivery_created` | `shipment` (normalized to `delivery.created`) | Email, WhatsApp, SMS |
| `fulfillment-and-inventory-events.ts` | `inventory-level.updated` | `inventory-level` | Email (`system_email_inventory_low`), Telegram (`system_telegram_inventory_low`), Slack |
| `customer-and-document-events.ts` | `customer.created` | `custom` | Email, WhatsApp, Telegram |
| `customer-and-document-events.ts` | `customer.updated` | `custom` | Email |
| `customer-and-document-events.ts` | `document.generated` | `document` | Email (`system_email_document_ready`), WhatsApp, Telegram (auto-attaches generated PDF from `medusa-plugin-documents`) |
| `customer-and-document-events.ts` | `auth.otp_generated` | `otp` | SMS (`system_sms_otp_code`), WhatsApp, Dummy Sandbox (`mpn-dummy-sandbox`) |
| `customer-and-document-events.ts` | `loyalty.points_credited` | `custom` | Email, SMS, WhatsApp |
| `customer-and-document-events.ts` | `loyalty.points_debited` | `custom` | Email, SMS |
| `customer-and-document-events.ts` | `wallet.credited` | `custom` | Email, SMS, Telegram |
| `customer-and-document-events.ts` | `wallet.debited` | `custom` | Email, SMS |
| `customer-and-document-events.ts` | `membership.tier_changed` | `custom` | Email, WhatsApp |
| `customer-and-document-events.ts` | `contact.form_submitted` | `custom` | Email, Telegram, Slack |

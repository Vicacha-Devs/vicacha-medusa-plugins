# CLAUDE.md — `medusa-plugin-notifications`

## 1. Purpose & Architectural Philosophy

`medusa-plugin-notifications` is a unified, multi-channel notification studio, template builder, event-mapping orchestrator, and transport provider suite for **Medusa v2 (`>= 2.21.0`)** combining the best features of:

- **`@codee-sh/medusa-plugin-notification-emails`**: Hierarchical block tree builder (`mpn_template_block`: `section`, `heading`, `text`, `row`, `separator`, `group`, `repeater`, `product-item`, `button`, `actions`, `divider`, `attachment`), two-prefix recursive interpolation (`{{data.*}}` + `{{translations.*}}`), standardized entity data transformers (`order`, `shipment`, `inventory-level`, `product`, `cart`, `document`, `otp`), live Admin entity preview (`/admin/mpn/render-template`), and Order Notification Activity widget (`order.details.after`).
- **`@sam-ael/medusa-plugin-mailer` & `@sam-ael/medusa-plugin-whatsapp`**: Database-driven **Event → Channel → Template → Recipient Rule** mappings (`mpn_event_mapping`) across 23+ Medusa & custom store events, Go-style `{{ .var }}` + `variable_map` data-path mapping, 1..5 SMTP sender profiles, Meta WhatsApp Business Cloud API approved template dispatch, redacted payload logging, and log retention cleanup.
- **OpenWA / WAHA / Evolution API Self-Hosted WhatsApp Ecosystem**: Multi-driver WhatsApp provider (`meta-cloud` | `openwa` | `waha` | `evolution`) supporting both Official Meta WABA templates (outside the 24h customer care window) AND self-hosted `@open-wa/wa-automate`, WAHA, and Evolution API gateways for free-form rich text, interactive buttons, and PDF document/invoice attachments.
- **`medusa-notification-provider` (`pradip1995`) & `@nxmad/medusa-telegram`**: Telegram Bot API provider supporting both **Merchant Supergroup / Forum Topic Alerts** (`-100...` or `@channel` with `message_thread_id` routing and Admin verification gate) AND **Customer Direct Messages** (`chat_id` linked via `/start <customer_id>` bot webhook, `InlineKeyboardMarkup` buttons, and `sendDocument` PDF uploads), backed by non-dropping rate limiting (30 msg/s global, 1 msg/s per chat) and partial unique idempotency index (`UQ_mpn_delivery_log_idempotency_active`).
- **`@signalhouse-sms/medusa-plugin`, `medusa-twilio-sms`, & `medusa-dummy-sms`**: Multi-driver SMS provider (`twilio`, `signalhouse`, `msg91`, `smsapi`, `webhook`), GSM-7 vs. UCS-2 segment calculator, TCPA/10DLC `JOIN`/`STOP` consent ledger (`mpn_consent_record`), 15-minute Abandoned Cart Recovery scheduled job with 24h per-phone cooldown, Customer Group Broadcast campaigns (`mpn_broadcast_campaign`), and a **Dummy OTP & Multi-Channel Sandbox** (`mpn_sandbox_message`).
- **Zero-Hard-Dependency Sibling Integration (`medusa-documents-plugin`)**: Automatically attaches generated PDF Invoices, Packing Slips, or Credit Notes from `medusa-documents-plugin` (`documentsModuleService`) to Email, WhatsApp/OpenWA, and Telegram notifications, and resolves B2B accounting contacts.

---

## 2. Package Exports (`package.json`)

| Import Path | Target Source | Purpose |
| :--- | :--- | :--- |
| `medusa-plugin-notifications` | `src/index.ts` | Root export (`NOTIFICATIONS_MODULE`, `NotificationsModuleService`, all 6 providers, workflows, transformers, security utilities, types) |
| `medusa-plugin-notifications/modules/notifications` | `src/modules/notifications/index.ts` | Standalone Notification Studio module (`Module("notificationsModuleService", ...)`) |
| `medusa-plugin-notifications/providers/email-smtp` | `src/providers/email-smtp/index.ts` | Medusa Notification provider (`mpn-email`) |
| `medusa-plugin-notifications/providers/whatsapp` | `src/providers/whatsapp/index.ts` | Multi-driver WhatsApp/OpenWA provider (`mpn-whatsapp`) |
| `medusa-plugin-notifications/providers/telegram` | `src/providers/telegram/index.ts` | Telegram Bot API provider (`mpn-telegram`) |
| `medusa-plugin-notifications/providers/sms` | `src/providers/sms/index.ts` | Multi-driver SMS provider (`mpn-sms`) |
| `medusa-plugin-notifications/providers/slack` | `src/providers/slack/index.ts` | Slack Block Kit provider (`mpn-slack`) |
| `medusa-plugin-notifications/providers/dummy-sandbox` | `src/providers/dummy-sandbox/index.ts` | Local/Staging Dummy OTP & Message Sandbox provider (`mpn-dummy-sandbox`) |
| `medusa-plugin-notifications/workflows` | `src/workflows/index.ts` | `renderNotificationTemplateWorkflow`, `dispatchEventNotificationsWorkflow` |

---

## 3. Directory Structure

```text
medusa-plugin-notifications/
├── src/
│   ├── index.ts                                        # Public package exports
│   ├── modules/notifications/
│   │   ├── index.ts                                    # Module("notificationsModuleService", { service: NotificationsModuleService })
│   │   ├── types.ts                                    # Core TypeScript types, channel & driver constants
│   │   ├── service.ts                                  # NotificationsModuleService (templates, cloning, rendering, consent, idempotency, sandbox)
│   │   ├── models/index.ts                             # 8 DML models (mpn_template, mpn_template_block, mpn_event_mapping, mpn_delivery_log, mpn_consent_record, mpn_broadcast_campaign, mpn_channel_config, mpn_sandbox_message)
│   │   ├── migrations/Migration20261010000000.ts       # PostgreSQL DDL & partial unique idempotency index
│   │   ├── i18n/index.ts                               # 8-locale dictionary (en, es, pl, de, fr, pt, it, nl)
│   │   ├── integrations/documents-and-b2b-resolver.ts  # Optional medusa-documents-plugin PDF attachment & B2B buyer resolver
│   │   ├── utils/
│   │   │   ├── security.ts                             # E.164/WhatsApp phone normalizer, PII masking, payload redaction, HTML/Telegram sanitizers, SSRF guard, HMAC verifier, SMS segment calculator, rate limiter
│   │   │   ├── interpolation.ts                        # Multi-pass {{data.*}}, {{translations.*}}, Go-style {{ .var }}, and variable_map engine
│   │   │   ├── transformers.ts                         # Entity data transformers & mock preview contexts
│   │   │   └── system-presets.ts                       # 11 built-in system presets across Email, WhatsApp/OpenWA, Telegram, SMS, and Slack
│   │   └── renderer/index.ts                           # Dual-Mode (Blocks + Raw) multi-channel template compiler
│   ├── providers/
│   │   ├── email-smtp/index.ts                         # SmtpEmailNotificationProviderService (mpn-email)
│   │   ├── whatsapp/index.ts                           # WhatsAppNotificationProviderService (mpn-whatsapp: meta-cloud, openwa, waha, evolution)
│   │   ├── telegram/index.ts                           # TelegramNotificationProviderService (mpn-telegram)
│   │   ├── sms/index.ts                                # SmsNotificationProviderService (mpn-sms: twilio, signalhouse, msg91, smsapi, webhook)
│   │   ├── slack/index.ts                              # SlackNotificationProviderService (mpn-slack)
│   │   └── dummy-sandbox/index.ts                      # DummySandboxNotificationProviderService (mpn-dummy-sandbox)
│   ├── workflows/index.ts                              # renderNotificationTemplateWorkflow & dispatchEventNotificationsWorkflow
│   ├── subscribers/
│   │   ├── order-events.ts                             # order.* lifecycle events
│   │   ├── fulfillment-and-inventory-events.ts         # shipment.created, delivery.created, inventory-level.updated
│   │   └── customer-and-document-events.ts             # customer.*, document.generated, auth.otp_generated, loyalty.*, wallet.*
│   ├── jobs/
│   │   ├── abandoned-cart-recovery.ts                  # Every 15m cart recovery with consent & 24h cooldown
│   │   └── log-retention-and-broadcasts.ts             # Hourly log retention & scheduled broadcasts
│   ├── api/
│   │   ├── middlewares.ts                              # Zod validation schemas & rawBody webhook config
│   │   ├── admin/mpn/                                  # Admin REST routes (templates, render-template, mappings, channels, logs, sandbox, broadcasts, send)
│   │   └── store/mpn/                                  # Storefront REST routes (consent, webhooks/[provider])
│   ├── admin/
│   │   ├── routes/mpn/page.tsx                         # /app/mpn Notification Studio
│   │   └── widgets/order-notifications-widget.tsx      # order.details.after widget
│   └── __tests__/
│       ├── register-ts-resolver.mjs                    # Node native TS module resolver hook
│       └── notifications.spec.ts                       # 17 unit, rendering, provider & security tests
```

---

## 4. Key Security & Engineering Invariants

1. **Meta WhatsApp Graph API Phone Formatting**: Always use `toWhatsAppDigitsOnly()` when building Meta Cloud API payloads (`type: "template"`, `"interactive"`, `"text"`), because leading `+` causes Meta to return HTTP 200 while silently dropping delivery.
2. **Idempotency & PII Redaction**: Every delivery log row in `mpn_delivery_log` masks recipient PII (`maskRecipientPii`) and strips tokens/passwords/OTPs/base64 buffers (`redactSensitivePayload`).
3. **SSRF & Webhook HMAC Verification**: External gateway URLs (OpenWA, WAHA, Evolution, Slack, SMS Webhooks, MMS `MediaUrl`) must pass `validateSafeExternalUrl()`. Inbound webhooks (`/store/mpn/webhooks/[provider]`) verify signatures with `verifyWebhookHmacSignature()` (`crypto.timingSafeEqual`).
4. **Type-Only Imports**: Always use `import type` for TypeScript interfaces so Node's native test runner (`--experimental-strip-types`) and `tsc` both execute cleanly.

---

## 5. Development & Verification Commands

```bash
# Run unit, multi-channel rendering, provider & security test suite
npm test

# Type-check TypeScript sources
npm run typecheck

# Build Medusa v2 plugin
npm run build
```

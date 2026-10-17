# CLAUDE.md — `medusa-plugin-notifications`

## 1. Purpose & Architectural Philosophy

`@vicacha-devs/medusa-plugin-notifications` (`medusa-plugin-notifications`) is a unified, multi-channel notification studio, template builder, event-mapping orchestrator, and transport provider suite for **Medusa v2 (`>= 2.21.0`)** combining the best features of:

- **`@codee-sh/medusa-plugin-notification-emails`**: Hierarchical block tree builder (`mpn_template_block`: `section`, `heading`, `text`, `row`, `separator`, `group`, `repeater`, `product-item`, `button`, `actions`, `divider`, `attachment`), two-prefix recursive interpolation (`{{data.*}}` + `{{translations.*}}`), standardized entity data transformers (`order`, `shipment`, `inventory-level`, `product`, `cart`, `document`, `otp`), live Admin entity preview (`/admin/mpn/render-template`), and Order Notification Activity widget (`order.details.after`).
- **`@sam-ael/medusa-plugin-mailer` & `@sam-ael/medusa-plugin-whatsapp`**: Database-driven **Event → Channel → Template → Recipient Rule** mappings (`mpn_event_mapping`) across 23+ Medusa & custom store events, Go-style `{{ .var }}` + `variable_map` data-path mapping, 1..5 SMTP sender profiles, Meta WhatsApp Business Cloud API approved template dispatch, redacted payload logging, and log retention cleanup.
- **OpenWA / WAHA / Evolution API Self-Hosted WhatsApp Ecosystem**: Multi-driver WhatsApp provider (`meta-cloud` | `openwa` | `waha` | `evolution`) supporting both Official Meta WABA templates (outside the 24h customer care window) AND self-hosted `@open-wa/wa-automate`, WAHA, and Evolution API gateways for free-form rich text, interactive buttons, and PDF document/invoice attachments.
- **`medusa-notification-provider` (`pradip1995`) & `@nxmad/medusa-telegram`**: Telegram Bot API provider supporting both **Merchant Supergroup / Forum Topic Alerts** (`-100...` or `@channel` with `message_thread_id` routing and Admin verification gate) AND **Customer Direct Messages** (`chat_id` linked via `/start <customer_id>` bot webhook, `InlineKeyboardMarkup` buttons, and `sendDocument` PDF uploads), backed by non-dropping rate limiting (30 msg/s global, 1 msg/s per chat) and partial unique idempotency index (`UQ_mpn_delivery_log_idempotency_active`).
- **`@signalhouse-sms/medusa-plugin`, `medusa-twilio-sms`, & `medusa-dummy-sms`**: Multi-driver SMS provider (`twilio`, `signalhouse`, `msg91`, `smsapi`, `webhook`), GSM-7 vs. UCS-2 segment calculator, TCPA/10DLC `JOIN`/`STOP` consent ledger (`mpn_consent_record`), 15-minute Abandoned Cart Recovery scheduled job with 24h per-phone cooldown, Customer Group Broadcast campaigns (`mpn_broadcast_campaign`), and a **Dummy OTP & Multi-Channel Sandbox** (`mpn_sandbox_message`).
- **Zero-Hard-Dependency Sibling Integration (`medusa-plugin-documents`)**: Automatically attaches generated PDF Invoices, Packing Slips, or Credit Notes from `medusa-plugin-documents` (`documentsModuleService`) to Email, WhatsApp/OpenWA, and Telegram notifications, and resolves B2B accounting contacts.

---

## 2. Package Exports (`package.json`)

| Import Path | Target Source | Purpose |
| :--- | :--- | :--- |
| `@vicacha-devs/medusa-plugin-notifications` | `src/index.ts` | Root export (`NOTIFICATIONS_MODULE`, `NotificationsModuleService`, all 6 providers, workflows, transformers, security utilities, SDK, hooks, types) |
| `@vicacha-devs/medusa-plugin-notifications/sdk` | `src/sdk/index.ts` | Typed REST client (`NotificationsApiClient`, `notificationsAdminSdk`, `notificationsStoreSdk`) & query key factory (`notificationsQueryKeys`) |
| `@vicacha-devs/medusa-plugin-notifications/hooks` | `src/hooks/index.ts` | React data-fetching & mutation hooks for templates, mappings, channels, logs, broadcasts, sandbox, consent, and order widget state |
| `@vicacha-devs/medusa-plugin-notifications/types` | `src/types/index.ts` | Shared TypeScript interfaces, enums, constants, and error classes |
| `@vicacha-devs/medusa-plugin-notifications/workflows` | `src/workflows/index.ts` | `renderNotificationTemplateWorkflow`, `dispatchEventNotificationsWorkflow`, `executeEventNotificationsDispatch`, `hydrateEntityContextData` |
| `@vicacha-devs/medusa-plugin-notifications/modules/notifications` | `src/modules/notifications/index.ts` | Standalone Notification Studio module (`Module("notificationsModuleService", ...)`) |
| `@vicacha-devs/medusa-plugin-notifications/providers/email-smtp` | `src/providers/email-smtp/index.ts` | Medusa Notification provider (`mpn-email`) |
| `@vicacha-devs/medusa-plugin-notifications/providers/whatsapp` | `src/providers/whatsapp/index.ts` | Multi-driver WhatsApp/OpenWA provider (`mpn-whatsapp`) |
| `@vicacha-devs/medusa-plugin-notifications/providers/telegram` | `src/providers/telegram/index.ts` | Telegram Bot API provider (`mpn-telegram`) |
| `@vicacha-devs/medusa-plugin-notifications/providers/sms` | `src/providers/sms/index.ts` | Multi-driver SMS provider (`mpn-sms`) |
| `@vicacha-devs/medusa-plugin-notifications/providers/slack` | `src/providers/slack/index.ts` | Slack Block Kit provider (`mpn-slack`) |
| `@vicacha-devs/medusa-plugin-notifications/providers/dummy-sandbox` | `src/providers/dummy-sandbox/index.ts` | Local/Staging Dummy OTP & Message Sandbox provider (`mpn-dummy-sandbox`) |

---

## 3. Directory Structure

```text
medusa-plugin-notifications/
├── src/
│   ├── index.ts                                        # Public package barrel exports
│   ├── types/
│   │   ├── index.ts                                    # Barrel re-exporting the type modules below
│   │   ├── core.ts, domain.ts, records.ts, translations.ts, render.ts, providers.ts, sdk-api.ts, hooks.ts  # Shared DTOs, API payloads/responses, provider options & model types
│   │   ├── constants.ts                                # NOTIFICATIONS_MODULE, channels, drivers, events, block types & locales
│   │   ├── enums.ts                                    # Enumerations for channels, modes, drivers, recipient rules & statuses
│   │   └── errors.ts                                   # Domain error definitions
│   ├── sdk/
│   │   ├── index.ts                                    # SDK barrel export
│   │   ├── client.ts                                   # NotificationsApiClient, notificationsAdminSdk & notificationsStoreSdk
│   │   └── query-keys.ts                               # notificationsQueryKeys factory & invalidation pub/sub helpers
│   ├── hooks/
│   │   ├── index.ts                                    # React hooks barrel export
│   │   ├── use-sdk-primitives.ts                       # Generic query & mutation hooks with automatic cache invalidation
│   │   ├── use-mpn-templates.ts                        # Template list, detail, create/clone, update, delete & preview hooks
│   │   ├── use-mpn-mappings.ts                         # Event mapping list, create, update & delete hooks
│   │   ├── use-mpn-channels.ts                         # Channel gateway list & save/verify hooks
│   │   ├── use-mpn-dispatch.ts                         # Logs, order logs, broadcasts, sandbox, send & storefront consent hooks
│   │   └── use-order-notifications-widget-state.ts     # State & dispatch hook for the Order Details activity widget
│   ├── modules/notifications/
│   │   ├── index.ts                                    # Module("notificationsModuleService", { service: NotificationsModuleService })
│   │   ├── types.ts                                    # Module re-exported types & constants
│   │   ├── service.ts                                  # NotificationsModuleService (templates, cloning, rendering, consent, idempotency, sandbox)
│   │   ├── models/index.ts                             # 8 DML models (mpn_template, mpn_template_block, mpn_event_mapping, mpn_delivery_log, mpn_consent_record, mpn_broadcast_campaign, mpn_channel_config, mpn_sandbox_message)
│   │   ├── migrations/Migration20261010000000.ts       # PostgreSQL DDL & partial unique idempotency index
│   │   ├── i18n/
│   │   │   ├── index.ts                                # 10-locale dictionary loader, RTL detection & deep-merge overrides
│   │   │   ├── types.ts                                # NotificationTranslationDictionary interface
│   │   │   └── locales/                                # 10 built-in locales (ar, de, en, es, fr, it, nl, pl, pt, tr)
│   │   ├── integrations/documents-and-b2b-resolver.ts  # Optional medusa-plugin-documents PDF attachment & B2B buyer resolver
│   │   ├── utils/
│   │   │   ├── security.ts                             # E.164/WhatsApp phone normalizer, PII masking, payload redaction, HTML/Telegram sanitizers, SSRF guard, HMAC verifier, SMS segment calculator, rate limiter
│   │   │   ├── interpolation.ts                        # Multi-pass {{data.*}}, {{translations.*}}, Go-style {{ .var }}, and variable_map engine
│   │   │   ├── transformers.ts                         # Entity data transformers & mock preview contexts
│   │   │   └── system-presets.ts                       # 13 built-in system presets across Email, WhatsApp/OpenWA, Telegram, SMS, and Slack
│   │   ├── service-helpers/                            # Pure/non-persistence service logic (external templates, catalog, consent, recipients, delivery log, channel config, block persistence, render input)
│   │   └── renderer/
│   │       ├── index.ts                                # Dual-Mode (Blocks + Raw) multi-channel template compiler (dispatcher)
│   │       ├── block-helpers.ts                        # Shared block meta/children/repeater-context helpers
│   │       └── email.ts, whatsapp.ts, telegram.ts, slack.ts  # Per-channel block renderers
│   ├── providers/
│   │   ├── index.ts                                    # Providers barrel export
│   │   ├── email-smtp/index.ts                         # SmtpEmailNotificationProviderService (mpn-email)
│   │   ├── whatsapp/index.ts                           # WhatsAppNotificationProviderService (mpn-whatsapp: meta-cloud, openwa, waha, evolution)
│   │   ├── telegram/index.ts                           # TelegramNotificationProviderService (mpn-telegram)
│   │   ├── sms/index.ts                                # SmsNotificationProviderService (mpn-sms: twilio, signalhouse, msg91, smsapi, webhook)
│   │   ├── slack/index.ts                              # SlackNotificationProviderService (mpn-slack)
│   │   └── dummy-sandbox/index.ts                      # DummySandboxNotificationProviderService (mpn-dummy-sandbox)
│   ├── workflows/index.ts                              # renderNotificationTemplateWorkflow & dispatchEventNotificationsWorkflow
│   ├── subscribers/
│   │   ├── order-events.ts                             # 9 order.* lifecycle events
│   │   ├── fulfillment-and-inventory-events.ts         # shipment.created, delivery.created, fulfillment.*, inventory-level.updated
│   │   └── customer-and-document-events.ts             # customer.*, document.generated, auth.otp_generated, loyalty.*, wallet.*, membership.*, contact.*
│   ├── jobs/
│   │   ├── abandoned-cart-recovery.ts                  # Every 15m cart recovery with TCPA consent & 24h cooldown
│   │   └── log-retention-and-broadcasts.ts             # Hourly log retention & scheduled broadcasts
│   ├── api/
│   │   ├── validators.ts                               # Zod validation schemas & inferred request types
│   │   ├── middlewares.ts                              # rawBody webhook config & verifyStoreCustomerSession helper
│   │   ├── admin/plugin/route.ts                       # Admin plugin health & metadata route
│   │   ├── admin/mpn/                                  # Admin REST routes (templates, render-template, mappings, channels, logs, sandbox, broadcasts, send)
│   │   ├── store/plugin/route.ts                       # Store plugin health route
│   │   └── store/mpn/                                  # Storefront REST routes (consent, webhooks/[provider])
│   ├── admin/
│   │   ├── tsconfig.json                               # Admin bundler TypeScript config
│   │   ├── vite-env.d.ts                               # Vite client declarations
│   │   ├── i18n/
│   │   │   ├── index.ts                                # Admin i18n map export
│   │   │   └── json/                                   # 10 Admin UI locale JSON files (ar, de, en, es, fr, it, nl, pl, pt, tr)
│   │   ├── components/mpn/                             # 19 modular studio components & hooks (each < 170 lines)
│   │   │   ├── index.ts
│   │   │   ├── broadcast-consent-section.tsx
│   │   │   ├── broadcasts-tab.tsx
│   │   │   ├── channels-main-section.tsx
│   │   │   ├── channels-side-section.tsx
│   │   │   ├── channels-tab.tsx
│   │   │   ├── constants.ts
│   │   │   ├── delivery-logs-tab.tsx
│   │   │   ├── event-mapping-form.tsx
│   │   │   ├── event-mappings-tab.tsx
│   │   │   ├── header-bar.tsx
│   │   │   ├── overview-cards.tsx
│   │   │   ├── sandbox-tab.tsx
│   │   │   ├── template-editor-section.tsx
│   │   │   ├── template-preview-section.tsx
│   │   │   ├── templates-list-section.tsx
│   │   │   ├── templates-tab.tsx
│   │   │   └── use-notification-studio.ts
│   │   ├── routes/mpn/                                 # Decoupled Medusa Admin routes using LayoutComposer
│   │   │   ├── page.tsx                                # /app/mpn — Overview Dashboard
│   │   │   ├── templates/page.tsx                      # /app/mpn/templates — Visual Block & Raw Template Builder
│   │   │   ├── mappings/page.tsx                       # /app/mpn/mappings — Event Mappings Orchestrator
│   │   │   ├── channels/page.tsx                       # /app/mpn/channels — Multi-Driver Gateway Configuration
│   │   │   ├── logs/page.tsx                           # /app/mpn/logs — Redacted Delivery Logs
│   │   │   ├── broadcasts/page.tsx                     # /app/mpn/broadcasts — Broadcasts & Consent Ledger
│   │   │   └── sandbox/page.tsx                        # /app/mpn/sandbox — Dummy OTP Sandbox
│   │   └── widgets/order-notifications-widget.tsx      # order.details.after widget
│   └── __tests__/
│       ├── register-ts-resolver.mjs                    # Node native TS module resolver hook
│       ├── medusa-shim.mjs                             # Lightweight test shim for Medusa framework imports
│       ├── notifications.spec.ts                       # Unit, rendering, provider & security tests
│       └── sdk.spec.ts                                 # Typed SDK & query key factory tests
```

---

## 4. Key Security & Engineering Invariants

1. **Meta WhatsApp Graph API Phone Formatting**: Always use `toWhatsAppDigitsOnly()` when building Meta Cloud API payloads (`type: "template"`, `"interactive"`, `"text"`), because a leading `+` causes Meta to return HTTP 200 while silently dropping delivery.
2. **Idempotency & PII Redaction**: Every delivery log row in `mpn_delivery_log` masks recipient PII (`maskRecipientPii`) and strips tokens/passwords/OTPs/base64 buffers (`redactSensitivePayload`).
3. **SSRF & Webhook HMAC Verification**: External gateway URLs (OpenWA, WAHA, Evolution, Slack, SMS Webhooks, MMS `MediaUrl`) must pass `validateSafeExternalUrl()`. Inbound webhooks (`/store/mpn/webhooks/[provider]`) verify signatures with `verifyWebhookHmacSignature()` (`crypto.timingSafeEqual`).
4. **Admin Component Modularity**: Every file under `src/admin/components/mpn/` and `src/admin/routes/mpn/` is kept concise (`< 170` lines) with a single clear responsibility and uses `LayoutComposer` (`CORE_LAYOUT_IDS.SINGLE_COLUMN` / `CORE_LAYOUT_IDS.TWO_COLUMN`).
5. **Type-Only Imports**: Always use `import type` for TypeScript interfaces so Node's native test runner (`--experimental-strip-types`) and `tsc` both execute cleanly.

---

## 5. Development & Verification Commands

```bash
# Run unit, multi-channel rendering, provider, SDK & security test suite
pnpm test

# Type-check TypeScript sources
pnpm run typecheck

# Build Medusa v2 plugin
pnpm run build
```

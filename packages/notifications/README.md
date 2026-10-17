# `@vicacha-devs/medusa-plugin-notifications` (`medusa-plugin-notifications`)

Unified **Multi-Channel Notification Studio, Visual Block & Raw Template Builder, DB Event Orchestrator, TCPA/10DLC Consent Ledger, Abandoned Cart Recovery, Customer Group Broadcasts, and Multi-Driver Transport Provider Suite** for **Medusa v2 (`>= 2.21.0`)**.

Combines a full-featured database-driven **Notification Studio Module (`notificationsModuleService`)** with **6 Medusa `Modules.NOTIFICATION` Transport Providers** (`mpn-email`, `mpn-whatsapp`, `mpn-telegram`, `mpn-sms`, `mpn-slack`, `mpn-dummy-sandbox`), a **Decoupled Medusa Admin UI (`/app/mpn`)** across 7 routes with 10-locale i18n (including RTL Arabic), a **Typed SDK & React Hooks layer**, and **strictly optional `medusa-plugin-documents` PDF attachment & B2B buyer contact resolution**.

---

## Table of Contents

- [`@vicacha-devs/medusa-plugin-notifications` (`medusa-plugin-notifications`)](#vicacha-devsmedusa-plugin-notifications-medusa-plugin-notifications)
  - [Table of Contents](#table-of-contents)
  - [1. Overview \& Highlights](#1-overview--highlights)
  - [2. Installation \& `medusa-config.ts` Configuration](#2-installation--medusa-configts-configuration)
    - [1. Install the package](#1-install-the-package)
    - [2. Configure `medusa-config.ts`](#2-configure-medusa-configts)
    - [3. Run Database Migrations](#3-run-database-migrations)
  - [3. Architecture \& Data Model (`mpn_` DML Models)](#3-architecture--data-model-mpn_-dml-models)
  - [4. Dual-Mode Template Renderer \& i18n](#4-dual-mode-template-renderer--i18n)
    - [Visual Block Tree Mode (`mode: "blocks"`)](#visual-block-tree-mode-mode-blocks)
    - [Raw Template Mode (`mode: "raw"`)](#raw-template-mode-mode-raw)
    - [Multi-Pass Variable Interpolation](#multi-pass-variable-interpolation)
    - [System Presets (`SYSTEM_TEMPLATE_PRESETS`)](#system-presets-system_template_presets)
    - [10 Built-In Locales](#10-built-in-locales)
  - [5. 6 Notification Transport Providers](#5-6-notification-transport-providers)
  - [6. Event Orchestration, Subscribers \& Scheduled Jobs](#6-event-orchestration-subscribers--scheduled-jobs)
    - [Subscribers (`src/subscribers/`)](#subscribers-srcsubscribers)
    - [Scheduled Jobs (`src/jobs/`)](#scheduled-jobs-srcjobs)
  - [7. Optional `medusa-plugin-documents` \& B2B Integration](#7-optional-medusa-plugin-documents--b2b-integration)
  - [8. REST API Reference (Admin \& Store)](#8-rest-api-reference-admin--store)
    - [Admin Endpoints (`/admin/mpn/*` \& `/admin/plugin`)](#admin-endpoints-adminmpn--adminplugin)
    - [Storefront \& Webhook Endpoints (`/store/mpn/*` \& `/store/plugin`)](#storefront--webhook-endpoints-storempn--storeplugin)
  - [9. Typed SDK \& React Hooks](#9-typed-sdk--react-hooks)
    - [Typed SDK (`@vicacha-devs/medusa-plugin-notifications/sdk`)](#typed-sdk-vicacha-devsmedusa-plugin-notificationssdk)
    - [React Hooks (`@vicacha-devs/medusa-plugin-notifications/hooks`)](#react-hooks-vicacha-devsmedusa-plugin-notificationshooks)
  - [10. Decoupled Admin Notification Studio (`/app/mpn`)](#10-decoupled-admin-notification-studio-appmpn)
  - [11. Security Architecture](#11-security-architecture)
  - [12. Development \& Testing](#12-development--testing)

---

## 1. Overview & Highlights

| Capability | Description |
| --- | --- |
| **Dual Architecture** | **1. Standalone Notification Studio Module (`notificationsModuleService`)**: Visual Block Tree Builder, Raw HTML/Text/JSON templates, DB-driven Event-to-Template Mappings, PII-redacted Delivery Ledger, TCPA/10DLC Consent Ledger, Customer Group Broadcasts, and Dummy OTP Sandbox.<br>**2. 6 Built-in `Modules.NOTIFICATION` Providers**: `mpn-email`, `mpn-whatsapp`, `mpn-telegram`, `mpn-sms`, `mpn-slack`, and `mpn-dummy-sandbox`. |
| **Dual-Mode Template Engine** | Build templates visually using a 12-block hierarchical tree (`section`, `heading`, `text`, `row`, `separator`, `group`, `repeater`, `product-item`, `button`, `actions`, `divider`, `attachment`) or write Raw HTML/Text/JSON with multi-pass interpolation (`{{data.*}}`, `{{translations.*}}`, Go-style `{{ .var }}`, and `variable_map`). |
| **11+ System Presets & 1-Click Clone** | Ships with read-only `system_*` presets across Email, WhatsApp/OpenWA, Telegram, SMS, and Slack (`system_email_order_placed`, `system_whatsapp_order_placed`, `system_telegram_order_placed`, `system_sms_otp_code`, `system_sms_cart_recovery`, etc.) that clone into editable database rows (`mpntpl_*` + `mpnblk_*`) with 1 click. |
| **Multi-Driver WhatsApp & OpenWA** | `mpn-whatsapp` supports **Official Meta Cloud API** (`meta-cloud` — approved WABA templates, interactive buttons, session text) AND **Self-Hosted Gateways** (**OpenWA / `@open-wa/wa-automate`**, **WAHA**, and **Evolution API v2**) for free-form rich text, interactive buttons, and PDF invoice attachments. |
| **Telegram Merchant Topics & Customer Bot** | `mpn-telegram` supports **Merchant Supergroup / Forum Topic Alerts** (`-100...` or `@channel` with `message_thread_id` routing + Admin verification gate) AND **Customer Direct Messages** (`chat_id` linked via `/start <customer_id>` bot webhook, `InlineKeyboardMarkup` buttons, and `sendDocument` PDF uploads) with 30 msg/s global & 1 msg/s per-chat rate limiting. |
| **Multi-Driver SMS, Consent & Cart Recovery** | `mpn-sms` supports **Twilio** (SMS/MMS + Messaging Service SID + `20xxx` error classification), **Signal House**, **MSG91 Flow**, **SMSAPI**, and **Generic HTTP Webhook**, backed by GSM-7 / UCS-2 segment calculation, TCPA/10DLC `JOIN`/`STOP` consent tracking, and a 15-minute Abandoned Cart Recovery job with a 24h per-phone cooldown. |
| **Zero-Hard-Dependency PDF Attachments** | Automatically attaches generated PDF Invoices, Packing Slips, or Credit Notes from `medusa-plugin-documents` (`documentsModuleService`) to Email, WhatsApp/OpenWA, and Telegram notifications when `attach_document_types` is configured, and resolves B2B accounting contacts. |
| **10 Built-In Locales (Backend + Admin UI)** | Ships with `en`, `es`, `pl`, `de`, `fr`, `pt`, `it`, `nl`, `tr`, and `ar` dictionaries for both notification template rendering (`{{translations.*}}`) and the Medusa Admin UI (`react-i18next` with RTL support for Arabic). |

---

## 2. Installation & `medusa-config.ts` Configuration

### 1. Install the package

```bash
pnpm add @vicacha-devs/medusa-plugin-notifications
# or
npm install @vicacha-devs/medusa-plugin-notifications
```

### 2. Configure `medusa-config.ts`

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@vicacha-devs/medusa-plugin-notifications",
      options: {
        defaultLocale: "en",
        storeName: "My Medusa Store",
        storeUrl: "https://store.example.com",
        enableCartRecovery: true,
        cartAbandonmentThresholdMinutes: 60,
        cartRecoveryUrlBase: "https://store.example.com/cart/recover",
        logRetentionDays: 30,
        sendConcurrency: 2,
      },
    },
  ],
  modules: [
    {
      resolve: "@vicacha-devs/medusa-plugin-notifications/modules/notifications",
      options: {
        defaultLocale: "en",
        storeName: "My Medusa Store",
        storeUrl: "https://store.example.com",
        enableCartRecovery: true,
        cartAbandonmentThresholdMinutes: 60,
        logRetentionDays: 30,
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@vicacha-devs/medusa-plugin-notifications/providers/email-smtp",
            id: "mpn-email",
            options: {
              channels: ["email"],
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
              from_name: "My Medusa Store",
              from_address: "orders@example.com",
            },
          },
          {
            resolve: "@vicacha-devs/medusa-plugin-notifications/providers/whatsapp",
            id: "mpn-whatsapp",
            options: {
              channels: ["whatsapp"],
              driver: "openwa", // "meta-cloud" | "openwa" | "waha" | "evolution"
              gatewayUrl: process.env.OPENWA_BASE_URL,
              apiKey: process.env.OPENWA_API_KEY,
              accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
              phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            },
          },
          {
            resolve: "@vicacha-devs/medusa-plugin-notifications/providers/telegram",
            id: "mpn-telegram",
            options: {
              channels: ["telegram"],
              botToken: process.env.TELEGRAM_BOT_TOKEN,
              defaultChatId: process.env.TELEGRAM_MERCHANT_CHAT_ID,
            },
          },
          {
            resolve: "@vicacha-devs/medusa-plugin-notifications/providers/sms",
            id: "mpn-sms",
            options: {
              channels: ["sms"],
              driver: "twilio", // "twilio" | "signalhouse" | "msg91" | "smsapi" | "webhook"
              twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
              twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
              twilioFrom: process.env.TWILIO_FROM_NUMBER,
            },
          },
          {
            resolve: "@vicacha-devs/medusa-plugin-notifications/providers/slack",
            id: "mpn-slack",
            options: {
              channels: ["slack"],
              webhook_url: process.env.SLACK_WEBHOOK_URL,
            },
          },
          {
            resolve: "@vicacha-devs/medusa-plugin-notifications/providers/dummy-sandbox",
            id: "mpn-dummy-sandbox",
            options: {
              channels: ["dummy"],
              log_to_console: true,
            },
          },
        ],
      },
    },
  ],
})
```

### 3. Run Database Migrations

```bash
npx medusa db:migrate
```

---

## 3. Architecture & Data Model (`mpn_` DML Models)

All database tables managed by `notificationsModuleService` (`NOTIFICATIONS_MODULE = "notificationsModuleService"`) use the `mpn_` prefix to prevent naming collisions.

| Model | Table Name | ID Prefix | Purpose |
| --- | --- | --- | --- |
| `MpnTemplate` | `mpn_template` | `mpntpl` | Stores multi-channel templates (`channel`, `mode: "blocks" \| "raw"`, `locale`, `subject`, `raw_content`, `variable_map`, `meta_template_name`, `meta_language_code`, `styles`, `source_preset_id`). |
| `MpnTemplateBlock` | `mpn_template_block` | `mpnblk` | Hierarchical visual block tree nodes (`template_id`, `type`, `position`, `parent_id`, `metadata`). |
| `MpnEventMapping` | `mpn_event_mapping` | `mpnmap` | Database-driven event routing rules (`event_name`, `channel`, `template_id`, `recipient_rule`, `custom_recipient`, `sender_profile_index`, `telegram_thread_id`, `attach_document_types`, `variable_map`, `conditions`, `priority`). |
| `MpnDeliveryLog` | `mpn_delivery_log` | `mpnlog` | Idempotent, PII-masked audit ledger (`idempotency_key`, `event_name`, `entity_id`, `channel`, `driver`, `recipient_masked`, `recipient_hash`, `status`, `external_message_id`, `payload_redacted`, `error_code`, `error_message`). Enforced by partial unique index `UQ_mpn_delivery_log_idempotency_active`. |
| `MpnConsentRecord` | `mpn_consent_record` | `mpncns` | TCPA/10DLC & bot opt-in ledger (`identifier`, `channel`, `customer_id`, `status: "opted_in" \| "opted_out" \| "pending"`, `source`, `first_message_sent`, `last_cart_recovery_at`). |
| `MpnBroadcastCampaign` | `mpn_broadcast_campaign` | `mpnbrc` | Customer Group or custom recipient broadcast campaigns (`name`, `channel`, `template_id`, `customer_group_id`, `custom_recipients`, `status`, `scheduled_at`, `sent_count`, `failed_count`, `attributed_revenue`). |
| `MpnChannelConfig` | `mpn_channel_config` | `mpncfg` | Operational channel & driver configuration (`channel`, `driver`, `is_enabled`, `is_verified`, `verified_at`, `rate_limit_per_sec`, `config_json`). |
| `MpnSandboxMessage` | `mpn_sandbox_message` | `mpnsbx` | Captured local/staging notifications and extracted OTP codes (`channel`, `recipient`, `subject`, `body`, `html`, `otp_code`, `media_urls`, `attachments_meta`). |

---

## 4. Dual-Mode Template Renderer & i18n

### Visual Block Tree Mode (`mode: "blocks"`)

Compiles a parent-child tree of `mpn_template_block` rows into channel-specific outputs (responsive HTML + plain-text fallback for Email, Markdown + interactive buttons for WhatsApp, sanitized HTML + `InlineKeyboardMarkup` for Telegram, compact text + GSM-7/UCS-2 metrics for SMS, and Block Kit JSON for Slack):

- **12 Supported Block Types**: `section`, `heading`, `text`, `row`, `separator`, `group`, `repeater`, `product-item`, `button`, `actions`, `divider`, `attachment`.

### Raw Template Mode (`mode: "raw"`)

Allows merchants to author raw HTML, Markdown, plain text, or JSON directly while enjoying full multi-pass variable interpolation.

### Multi-Pass Variable Interpolation

1. **`variable_map` Aliasing**: Maps friendly keys (e.g., `CustomerName: "shipping_address.first_name"`) before interpolation.
2. **Two-Prefix Recursive Interpolation**: Resolves `{{data.*}}` against hydrated entity data and `{{translations.*}}` against the active locale dictionary.
3. **Go-Style Template Syntax**: Resolves `{{ .VariableName }}` and `{{ .nested.path }}` (compatible with `@sam-ael/medusa-plugin-mailer` and `@sam-ael/medusa-plugin-whatsapp` templates).

### System Presets (`SYSTEM_TEMPLATE_PRESETS`)

Includes built-in read-only presets across all channels (`system_email_order_placed`, `system_email_shipment_created`, `system_email_document_ready`, `system_email_inventory_low`, `system_whatsapp_order_placed`, `system_whatsapp_shipment_created`, `system_telegram_order_placed`, `system_telegram_inventory_low`, `system_sms_order_placed`, `system_sms_shipment_created`, `system_sms_otp_code`, `system_sms_cart_recovery`, `system_slack_order_placed`). Any preset can be cloned into an editable DB template via `POST /admin/mpn/templates` (`clone_from_preset_id`).

### 10 Built-In Locales

Both the backend renderer (`src/modules/notifications/i18n/locales/`) and the Admin UI (`src/admin/i18n/json/`) include complete dictionaries for:

- `en` (English), `es` (Spanish), `pl` (Polish), `de` (German), `fr` (French), `pt` (Portuguese), `it` (Italian), `nl` (Dutch), `tr` (Turkish), and `ar` (Arabic with automatic RTL layout).

---

## 5. 6 Notification Transport Providers

| Provider ID | Module Import Path | Channel | Drivers & Capabilities |
| --- | --- | --- | --- |
| `mpn-email` | `@vicacha-devs/medusa-plugin-notifications/providers/email-smtp` | `email` | Multi-profile (`1..5` via `MAILER_FROM_NAME_1..5` / `MAILER_FROM_ADDRESS_1..5`) Nodemailer SMTP transport + HTTP Email Relay (`EMAIL_HTTP_ENDPOINT`) with base64 PDF attachment support. |
| `mpn-whatsapp` | `@vicacha-devs/medusa-plugin-notifications/providers/whatsapp` | `whatsapp` | **4 Drivers**: `meta-cloud` (Official Meta Graph API v21/v25 approved WABA templates, interactive buttons, documents, session text with digits-only recipient formatting), `openwa` (`@open-wa/wa-automate` `/sendText`, `/sendFile`, `/sendButtons`), `waha` (WAHA `/api/sendText`, `/api/sendFile`), and `evolution` (Evolution API v2 `/message/sendText/{instance}`, `/message/sendMedia/{instance}`). |
| `mpn-telegram` | `@vicacha-devs/medusa-plugin-notifications/providers/telegram` | `telegram` | Supports **Merchant Supergroup / Forum Topic Alerts** (`-100...` or `@channel` with `message_thread_id` and Admin verification gate) and **Customer Direct Messages** (`chat_id` linked via `/start` bot webhook, `InlineKeyboardMarkup`, and multipart `sendDocument` PDF uploads) with 30 msg/s global & 1 msg/s per-chat rate limiting. |
| `mpn-sms` | `@vicacha-devs/medusa-plugin-notifications/providers/sms` | `sms` | **5 Drivers**: `twilio` (SMS/MMS + Messaging Service SID + `20000`–`21999` permanent vs. retryable error classification), `signalhouse` (10DLC SMS/MMS), `msg91` (Flow API), `smsapi` (OAuth Bearer SMS), and `webhook` (Generic HTTP Webhook), with GSM-7 (160/153 chars) and UCS-2 (70/67 chars) segment calculation. |
| `mpn-slack` | `@vicacha-devs/medusa-plugin-notifications/providers/slack` | `slack` | Dispatches Slack Block Kit JSON (`blocks` + `text`) to SSRF-validated Slack Incoming Webhook URLs. |
| `mpn-dummy-sandbox` | `@vicacha-devs/medusa-plugin-notifications/providers/dummy-sandbox` | `dummy` | Intercepts notifications and automatically extracts 4–8 digit OTP codes into `mpn_sandbox_message` and in-memory storage for zero-cost local/staging inspection. |

---

## 6. Event Orchestration, Subscribers & Scheduled Jobs

### Subscribers (`src/subscribers/`)

All subscribers invoke `executeEventNotificationsDispatch` non-blockingly so store operations never fail if an external carrier is unreachable:

- **`order-events.ts`**: `order.placed`, `order.completed`, `order.canceled`, `order.updated`, `order.fulfillment_created`, `order.fulfillment_canceled`, `order.return_requested`, `order.return_received`, `order.refund_created`.
- **`fulfillment-and-inventory-events.ts`**: `shipment.created`, `delivery.created`, `fulfillment.created`, `fulfillment.shipment_created` (normalized to `shipment.created`), `fulfillment.delivery_created` (normalized to `delivery.created`), `inventory-level.updated`.
- **`customer-and-document-events.ts`**: `customer.created`, `customer.updated`, `document.generated`, `auth.otp_generated`, `loyalty.points_credited`, `loyalty.points_debited`, `wallet.credited`, `wallet.debited`, `membership.tier_changed`, `contact.form_submitted`.

### Scheduled Jobs (`src/jobs/`)

- **`abandoned-cart-recovery.ts` (`mpn-abandoned-cart-recovery`, schedule: `*/15 * * * *`)**: Scans active incomplete carts older than `cartAbandonmentThresholdMinutes` (default `60` min), verifies explicit TCPA opt-in in `mpn_consent_record`, enforces a strict **24-hour cooldown per phone number** (`last_cart_recovery_at`), and dispatches `cart.abandoned` notifications with a direct checkout recovery URL.
- **`log-retention-and-broadcasts.ts` (`mpn-log-retention-and-broadcasts`, schedule: `0 * * * *`)**: Prunes expired `mpn_delivery_log` rows older than `logRetentionDays` (default `30` days) and processes due scheduled broadcast campaigns.

---

## 7. Optional `medusa-plugin-documents` & B2B Integration

Implemented in `src/modules/notifications/integrations/documents-and-b2b-resolver.ts` with **zero hard dependency**:

1. **Automatic PDF Document Attachments (`resolveOrderDocumentAttachments`)**: When an event mapping specifies `attach_document_types` (e.g., `["invoice", "packing_slip"]`), the orchestrator checks if `documentsModuleService` (`medusa-plugin-documents`) is registered in the Medusa container, generates or retrieves the base64 PDF buffers for the order, and attaches them to Email, WhatsApp (`openwa`, `waha`, `evolution`, `meta-cloud`), or Telegram (`sendDocument`) dispatches.
2. **B2B Accounting Contact Resolution (`resolveB2BNotificationContacts`)**: Resolves B2B company accounting email, phone, WhatsApp, and Telegram chat ID from an optional `companyModuleService` / `b2b` module or `order.metadata` / `customer.metadata` when `recipient_rule: "b2b_accounting"` is selected.

---

## 8. REST API Reference (Admin & Store)

### Admin Endpoints (`/admin/mpn/*` & `/admin/plugin`)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/mpn/templates` | List all templates (`system_*` presets, `external_*`, and `mpntpl_*` DB templates) with optional `channel`, `source`, and `locale` filters. |
| `POST` | `/admin/mpn/templates` | Create a new DB template with blocks, or clone a read-only `system_*` preset via `clone_from_preset_id`. |
| `GET` | `/admin/mpn/templates/:id` | Retrieve a single template and its hierarchical block tree (`blocks` and `flatBlocks`). |
| `POST` | `/admin/mpn/templates/:id` | Update template metadata, raw content, variable map, and replace its block tree. |
| `DELETE` | `/admin/mpn/templates/:id` | Delete a custom database template (`mpntpl_*`) and its blocks. |
| `POST` | `/admin/mpn/render-template` | Live-render any template or ad-hoc block tree against real entity data (`entity_id`) or mock context (`order`, `shipment`, `inventory-level`, `product`, `cart`, `document`, `otp`) in any of the 10 locales. |
| `GET` | `/admin/mpn/mappings` | List all event-to-template mappings (`mpn_event_mapping`), supported events, recipient rules, and SMTP sender profiles. |
| `POST` | `/admin/mpn/mappings` | Create a new Event → Channel → Template → Recipient Rule mapping. |
| `POST` | `/admin/mpn/mappings/:id` | Update an existing event mapping. |
| `DELETE` | `/admin/mpn/mappings/:id` | Delete an event mapping. |
| `GET` | `/admin/mpn/channels` | List operational channel configs (`mpn_channel_config`), SMTP sender profiles, and supported WhatsApp/SMS drivers. |
| `POST` | `/admin/mpn/channels` | Save channel driver/gateway settings (automatically resets `is_verified = false` if Telegram `channel_id` changes) or run `action: "verify"` to send a live test message. |
| `GET` | `/admin/mpn/logs` | List PII-masked delivery logs (`mpn_delivery_log`) with optional `channel`, `event_name`, `entity_id`, `status`, and `limit` filters. |
| `GET` | `/admin/mpn/broadcasts` | List customer group broadcast campaigns (`mpn_broadcast_campaign`) and consent ledger summary counts (`opted_in_count`, `opted_out_count`). |
| `POST` | `/admin/mpn/broadcasts` | Create and optionally immediately dispatch (`send_now: true`) a broadcast campaign to opted-in recipients. |
| `GET` | `/admin/mpn/sandbox` | List captured sandbox messages and extracted OTP codes (`mpn_sandbox_message` + in-memory store). |
| `DELETE` | `/admin/mpn/sandbox` | Clear all captured sandbox messages. |
| `POST` | `/admin/mpn/send` | Ad-hoc manual notification dispatch or full event simulation (`event_name` + `event_data`), with optional `attach_invoice_pdf`. |
| `GET` | `/admin/plugin` | Health and capability summary endpoint for the Admin plugin surface. |

### Storefront & Webhook Endpoints (`/store/mpn/*` & `/store/plugin`)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/store/mpn/consent` | Record customer SMS/WhatsApp/Telegram opt-in or opt-out consent (`mpn_consent_record`). Enforces Anti-IDOR check via `verifyStoreCustomerSession`. |
| `GET` | `/store/mpn/webhooks/:provider` | Meta WhatsApp Cloud API webhook verification challenge (`hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`). |
| `POST` | `/store/mpn/webhooks/:provider` | Inbound webhook handler (with `preserveRawBody: true` and timing-safe HMAC verification) for `whatsapp` / `openwa` / `waha` / `evolution` (`JOIN`/`STOP` + delivery receipts), `telegram` (`/start <customer_id>`, `/stop`), and `sms` / `signalhouse` / `twilio` (`JOIN`/`START`/`YES` and `STOP`/`UNSUBSCRIBE`). |
| `GET` | `/store/plugin` | Public storefront health endpoint. |

---

## 9. Typed SDK & React Hooks

### Typed SDK (`@vicacha-devs/medusa-plugin-notifications/sdk`)

Provides `NotificationsApiClient`, pre-configured singletons (`notificationsAdminSdk`, `notificationsStoreSdk`), and hierarchical query key factories (`notificationsQueryKeys`, `invalidateNotificationsQueries`):

```ts
import {
  notificationsAdminSdk,
  notificationsStoreSdk,
  notificationsQueryKeys,
} from "@vicacha-devs/medusa-plugin-notifications/sdk"

// Admin: list templates or trigger a manual send
const { templates } = await notificationsAdminSdk.listTemplates({ channel: "whatsapp" })
await notificationsAdminSdk.sendNotification({
  channel: "telegram",
  recipient: "-1001234567890",
  template_id: "system_telegram_order_placed",
  order_id: "order_01J...",
  attach_invoice_pdf: true,
})

// Storefront: record checkout SMS marketing opt-in
await notificationsStoreSdk.updateConsent({
  identifier: "+14155552671",
  channel: "sms",
  status: "opted_in",
})
```

### React Hooks (`@vicacha-devs/medusa-plugin-notifications/hooks`)

- **Template Hooks (`use-mpn-templates.ts`)**: `useMpnTemplates`, `useMpnTemplateDetail`, `useCreateOrCloneMpnTemplate`, `useUpdateMpnTemplate`, `useDeleteMpnTemplate`, `useRenderMpnTemplatePreview`.
- **Event Mapping Hooks (`use-mpn-mappings.ts`)**: `useMpnMappings`, `useCreateMpnMapping`, `useUpdateMpnMapping`, `useDeleteMpnMapping`.
- **Channel Config Hooks (`use-mpn-channels.ts`)**: `useMpnChannels`, `useSaveOrVerifyMpnChannel`.
- **Dispatch, Logs, Broadcasts, Sandbox & Consent Hooks (`use-mpn-dispatch.ts`)**: `useMpnLogs`, `useMpnOrderLogs`, `useMpnBroadcasts`, `useCreateMpnBroadcast`, `useMpnSandboxMessages`, `useClearMpnSandbox`, `useSendMpnNotification`, `useUpdateStoreMpnConsent`.
- **Widget State Hook (`use-order-notifications-widget-state.ts`)**: `useOrderNotificationsWidgetState`.

---

## 10. Decoupled Admin Notification Studio (`/app/mpn`)

The Medusa Admin extension uses `LayoutComposer` and modular components (`src/admin/components/mpn/`, each `< 170` lines) across 7 dedicated routes plus an Order Details widget:

| Route / Zone | File | Layout | Purpose |
| --- | --- | --- | --- |
| `/app/mpn` | `src/admin/routes/mpn/page.tsx` | `SINGLE_COLUMN` | Overview dashboard with `StatCard` metrics and `NavigationCard` links to all 6 studio workspaces. |
| `/app/mpn/templates` | `src/admin/routes/mpn/templates/page.tsx` | `SINGLE_COLUMN` | Visual Block Tree & Raw Template Builder, 1-click preset cloning, and live multi-locale entity preview. |
| `/app/mpn/mappings` | `src/admin/routes/mpn/mappings/page.tsx` | `SINGLE_COLUMN` | Store Event → Channel → Template → Recipient Rule mapping orchestrator with PDF invoice attachment toggle. |
| `/app/mpn/channels` | `src/admin/routes/mpn/channels/page.tsx` | `TWO_COLUMN` | Multi-driver gateway configuration (Meta Cloud / OpenWA / WAHA / Evolution, Telegram Supergroup verification gate, SMS carrier selector). |
| `/app/mpn/logs` | `src/admin/routes/mpn/logs/page.tsx` | `SINGLE_COLUMN` | PII-masked, idempotent delivery ledger table with status badges and error inspection. |
| `/app/mpn/broadcasts` | `src/admin/routes/mpn/broadcasts/page.tsx` | `TWO_COLUMN` | Customer group broadcast campaign dispatcher & history (main) + TCPA/10DLC consent summary (side). |
| `/app/mpn/sandbox` | `src/admin/routes/mpn/sandbox/page.tsx` | `SINGLE_COLUMN` | Local/Staging Dummy OTP & multi-channel sandbox message inspector. |
| `order.details.after` | `src/admin/widgets/order-notifications-widget.tsx` | Widget | Displays per-order notification history and 1-click manual resend across Email, WhatsApp, Telegram, or SMS with optional PDF invoice attachment. |

---

## 11. Security Architecture

1. **Meta WhatsApp Graph API Digits-Only Formatting (`toWhatsAppDigitsOnly`)**: Strips the leading `+` from E.164 phone numbers specifically when building Official Meta Cloud API payloads (`type: "template"`, `"interactive"`, `"text"`), preventing Meta's HTTP 200 silent drop bug while preserving standard E.164 (`+1...`) for Twilio, Signal House, and self-hosted gateways.
2. **PII Masking & Payload Redaction (`maskRecipientPii`, `redactSensitivePayload`)**: Every `mpn_delivery_log` row masks recipient emails/phones (`j***e@example.com`, `+141****671`), stores a salted SHA-256 `recipient_hash`, and redacts secrets, tokens, passwords, OTP codes, and large base64 buffers from `payload_redacted`.
3. **SSRF Protection (`validateSafeExternalUrl`)**: Validates all merchant-configured gateway URLs (OpenWA, WAHA, Evolution, Slack Webhooks, SMS Webhooks, MMS `MediaUrl`) against private/loopback IPv4/IPv6 ranges and cloud metadata endpoints (`169.254.169.254`) in production.
4. **Timing-Safe Webhook HMAC Verification (`verifyWebhookHmacSignature`)**: Uses `crypto.timingSafeEqual` on raw request bodies (`preserveRawBody: true`) for inbound provider webhooks (`/store/mpn/webhooks/:provider`).
5. **Partial Unique Idempotency Index (`UQ_mpn_delivery_log_idempotency_active`)**: Prevents duplicate notifications for the same `event_name:entity_id:channel:template_id:recipient` when `status IN ('pending', 'sent', 'delivered')`, while allowing manual retries of `'failed'` dispatches.

---

## 12. Development & Testing

```bash
# Run the unit, multi-channel rendering, provider, SDK & security test suite
pnpm test

# Type-check all TypeScript sources (backend + Admin UI)
pnpm run typecheck

# Build the Medusa v2 plugin
pnpm run build
```

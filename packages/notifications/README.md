# `medusa-plugin-notifications`

Unified **Multi-Channel Notification Studio, Visual Block & Raw Template Builder, DB Event Orchestrator, TCPA/10DLC Consent Ledger, Abandoned Cart Recovery, and Multi-Driver Transport Provider Suite** for **Medusa v2 (`>= 2.21.0`)**.

---

## Highlights

- **Dual Architecture**:
  1. **Standalone Notification Studio Module (`notificationsModuleService`)**: Visual Block Tree Builder (`mpn_template_block`), Raw HTML/Text/JSON templates (`mpn_template`), DB-driven Event-to-Template Mappings (`mpn_event_mapping`), Redacted Delivery Ledger (`mpn_delivery_log`), TCPA/10DLC Consent Ledger (`mpn_consent_record`), Customer Group Broadcasts (`mpn_broadcast_campaign`), and Dummy OTP Sandbox (`mpn_sandbox_message`).
  2. **6 Built-In Medusa `Modules.NOTIFICATION` Providers**:
     - `mpn-email`: Multi-profile (1..5) Nodemailer SMTP + HTTP Email Relay with PDF attachment support.
     - `mpn-whatsapp`: **Multi-Driver WhatsApp Adapter** supporting **Official Meta Cloud API** (approved WABA templates + interactive buttons + session text) AND **Self-Hosted Gateways** (**OpenWA / `@open-wa/wa-automate`**, **WAHA**, and **Evolution API v2**) for free-form rich text, interactive buttons, and PDF invoice attachments.
     - `mpn-telegram`: **Telegram Bot API Provider** supporting both **Merchant Supergroup / Forum Topic Alerts** (`-100...` or `@channel` with `message_thread_id` + Admin verification gate) and **Customer Direct Messages** (`chat_id` linked via `/start` bot webhook, `InlineKeyboardMarkup` buttons, and `sendDocument` PDF uploads) with 30 msg/s global & 1 msg/s per-chat rate limiting.
     - `mpn-sms`: **Multi-Driver SMS Provider** supporting **Twilio** (SMS/MMS + Messaging Service SID + `20xxx` validation error classification), **Signal House**, **MSG91 Flow**, **SMSAPI**, and **Generic HTTP Webhook**, with accurate GSM-7 / UCS-2 segment calculation.
     - `mpn-slack`: Slack Block Kit JSON webhook provider.
     - `mpn-dummy-sandbox`: Captures OTP verification codes and test notifications across all channels in Medusa Admin without carrier cost.
- **Zero-Hard-Dependency Sibling Integration (`medusa-documents-plugin`)**: Automatically attaches generated PDF Invoices, Packing Slips, or Credit Notes to Email, WhatsApp/OpenWA, and Telegram notifications when an Event Mapping enables `attach_document_types`.

---

## Medusa Configuration (`medusa-config.ts`)

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "medusa-plugin-notifications",
      options: {
        defaultLocale: "en",
        storeName: "My Medusa Store",
        storeUrl: "https://store.example.com",
        enableCartRecovery: true,
        cartAbandonmentThresholdMinutes: 60,
      },
    },
  ],
  modules: [
    {
      resolve: "medusa-plugin-notifications/modules/notifications",
      options: {
        defaultLocale: "en",
        storeName: "My Medusa Store",
        storeUrl: "https://store.example.com",
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "medusa-plugin-notifications/providers/email-smtp",
            id: "mpn-email",
            options: { channels: ["email"] },
          },
          {
            resolve: "medusa-plugin-notifications/providers/whatsapp",
            id: "mpn-whatsapp",
            options: {
              channels: ["whatsapp"],
              driver: "openwa", // "meta-cloud" | "openwa" | "waha" | "evolution"
              gatewayUrl: process.env.OPENWA_BASE_URL,
            },
          },
          {
            resolve: "medusa-plugin-notifications/providers/telegram",
            id: "mpn-telegram",
            options: {
              channels: ["telegram"],
              botToken: process.env.TELEGRAM_BOT_TOKEN,
            },
          },
          {
            resolve: "medusa-plugin-notifications/providers/sms",
            id: "mpn-sms",
            options: {
              channels: ["sms"],
              driver: "twilio", // "twilio" | "signalhouse" | "msg91" | "smsapi" | "webhook"
            },
          },
          {
            resolve: "medusa-plugin-notifications/providers/slack",
            id: "mpn-slack",
            options: { channels: ["slack"] },
          },
          {
            resolve: "medusa-plugin-notifications/providers/dummy-sandbox",
            id: "mpn-dummy-sandbox",
            options: { channels: ["dummy"] },
          },
        ],
      },
    },
  ],
})
```

---

## Development & Verification

```bash
npm test
npm run typecheck
npm run build
```

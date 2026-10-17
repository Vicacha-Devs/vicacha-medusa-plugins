# Modules

Standalone Medusa v2 Notification Studio module (`notificationsModuleService`) managing templates, visual block trees, event mappings, delivery logs, TCPA/10DLC consent records, customer group broadcasts, channel gateway configs, and sandbox messages.

```sh
modules/
└── notifications/
    ├── index.ts                                    Exports NOTIFICATIONS_MODULE ("notificationsModuleService") + Module() definition
    ├── types.ts                                    Re-exports module types, channels, drivers & options
    ├── service.ts                                  NotificationsModuleService extending MedusaService with custom studio methods
    ├── models/
    │   └── index.ts                                8 DML models (mpn_template, mpn_template_block, mpn_event_mapping, mpn_delivery_log, mpn_consent_record, mpn_broadcast_campaign, mpn_channel_config, mpn_sandbox_message)
    ├── migrations/
    │   └── Migration20261010000000.ts              PostgreSQL DDL & partial unique idempotency index (UQ_mpn_delivery_log_idempotency_active)
    ├── i18n/
    │   ├── index.ts                                10-locale dictionary loader, RTL detection & deep-merge overrides
    │   ├── types.ts                                NotificationTranslationDictionary interface
    │   └── locales/                                10 built-in locales (ar, de, en, es, fr, it, nl, pl, pt, tr)
    ├── integrations/
    │   └── documents-and-b2b-resolver.ts           Optional medusa-plugin-documents PDF attachment & B2B buyer contact resolver
    ├── utils/
    │   ├── security.ts                             E.164/WhatsApp phone normalizer, PII masking, payload redaction, HTML/Telegram sanitizers, SSRF guard, HMAC verifier, SMS segment calculator, rate limiter
    │   ├── interpolation.ts                        Multi-pass {{data.*}}, {{translations.*}}, Go-style {{ .var }}, and variable_map engine
    │   ├── transformers.ts                         Entity data transformers & mock preview contexts (order, shipment, inventory-level, product, cart, document, otp)
    │   └── system-presets.ts                       13 built-in system presets across Email, WhatsApp/OpenWA, Telegram, SMS, and Slack
    └── renderer/
        └── index.ts                                Dual-Mode (Blocks + Raw) multi-channel template compiler
```

---

## Service Token

- **Module Key**: `NOTIFICATIONS_MODULE = "notificationsModuleService"`
- **Import Path**: `@vicacha-devs/medusa-plugin-notifications/modules/notifications`

```ts
import { NOTIFICATIONS_MODULE, type NotificationsModuleService } from "@vicacha-devs/medusa-plugin-notifications"

const mpnService = req.scope.resolve(NOTIFICATIONS_MODULE) as NotificationsModuleService
```

---

## Data Models (`mpn_` Prefix)

All 8 data models are defined in `src/modules/notifications/models/index.ts` using Medusa's DML (`model.define`):

| Model Class | Table Name | ID Prefix | Key Fields | Purpose |
| --- | --- | --- | --- | --- |
| `MpnTemplate` | `mpn_template` | `mpntpl` | `name`, `label`, `channel`, `mode` (`"blocks" \| "raw"`), `locale`, `subject`, `raw_content`, `variable_map`, `meta_template_name`, `meta_language_code`, `styles`, `is_active`, `source_preset_id` | Multi-channel notification template metadata and raw content |
| `MpnTemplateBlock` | `mpn_template_block` | `mpnblk` | `template_id`, `type`, `position`, `parent_id`, `metadata` | Hierarchical visual block tree nodes (`section`, `heading`, `text`, `row`, `separator`, `group`, `repeater`, `product-item`, `button`, `actions`, `divider`, `attachment`) |
| `MpnEventMapping` | `mpn_event_mapping` | `mpnmap` | `event_name`, `channel`, `template_id`, `recipient_rule`, `custom_recipient`, `sender_profile_index`, `telegram_thread_id`, `attach_document_types`, `variable_map`, `conditions`, `is_active`, `priority` | Routes Medusa store events to a target channel, template, recipient rule, and optional PDF document attachment |
| `MpnDeliveryLog` | `mpn_delivery_log` | `mpnlog` | `idempotency_key`, `event_name`, `entity_id`, `channel`, `provider_id`, `driver`, `template_id`, `mapping_id`, `recipient_masked`, `recipient_hash`, `status`, `attempts`, `external_message_id`, `payload_redacted`, `error_code`, `error_message` | PII-masked, idempotent audit ledger enforced by partial unique index `UQ_mpn_delivery_log_idempotency_active` |
| `MpnConsentRecord` | `mpn_consent_record` | `mpncns` | `identifier`, `channel`, `customer_id`, `status` (`"opted_in" \| "opted_out" \| "pending"`), `source`, `first_message_sent`, `last_cart_recovery_at`, `opted_in_at`, `opted_out_at` | TCPA/10DLC SMS, WhatsApp, and Telegram Bot opt-in/opt-out ledger |
| `MpnBroadcastCampaign` | `mpn_broadcast_campaign` | `mpnbrc` | `name`, `channel`, `template_id`, `customer_group_id`, `custom_recipients`, `status`, `scheduled_at`, `sent_at`, `total_recipients`, `sent_count`, `failed_count`, `attributed_orders_count`, `attributed_revenue` | Customer group or custom recipient marketing broadcast campaigns |
| `MpnChannelConfig` | `mpn_channel_config` | `mpncfg` | `channel`, `driver`, `is_enabled`, `is_verified`, `verified_at`, `rate_limit_per_sec`, `config_json` | Non-secret operational gateway config and Telegram supergroup verification state |
| `MpnSandboxMessage` | `mpn_sandbox_message` | `mpnsbx` | `channel`, `recipient`, `sender`, `subject`, `body`, `html`, `otp_code`, `media_urls`, `attachments_meta` | Local/staging captured notifications and extracted OTP verification codes |

---

## Core Custom Methods on `NotificationsModuleService`

In addition to the auto-generated `MedusaService` CRUD methods (`listMpnTemplates`, `createMpnEventMappings`, `listMpnDeliveryLogs`, etc.), `NotificationsModuleService` provides:

| Method | Description |
| --- | --- |
| `getPluginOptions()` | Returns the resolved `NotificationsPluginOptions` passed in `medusa-config.ts`. |
| `getSenderProfiles()` | Resolves up to 5 SMTP sender profiles (`MAILER_FROM_NAME_1..5`, `MAILER_FROM_ADDRESS_1..5`, `MAILER_REPLY_TO_1..5`). |
| `listAllTemplates(filters?)` | Aggregates read-only System Presets (`system_*`), External Templates (`external_*`), and DB Templates (`mpntpl_*`). |
| `getTemplateWithBlocks(templateId)` | Loads a preset or DB template along with its nested `TemplateBlockNode[]` tree and `flatBlocks`. |
| `cloneSystemPresetToDb(presetId, overrides?)` | 1-click clones a `system_*` preset and its hierarchical block tree into editable `mpn_template` + `mpn_template_block` rows. |
| `replaceTemplateBlocks(templateId, blocks)` | Replaces all `mpn_template_block` rows for a DB template while preserving parent-child tree relationships. |
| `renderTemplateById(params)` | Compiles a template (Blocks or Raw) against entity data, `variable_map`, locale dictionary (`10` locales), and channel rules into a `RenderedNotificationPayload`. |
| `evaluateEventConditions(conditions, data)` | Evaluates optional currency, region, sales channel, minimum order total, or field-match conditions on an event mapping. |
| `resolveRecipientForRule(params)` | Resolves the target recipient address/phone/chat ID for `customer_auto`, `order_email`, `order_phone`, `customer_telegram`, `merchant_channel`, `b2b_accounting`, or `custom`. |
| `verifyRecipientConsent(params)` | Checks `mpn_consent_record` for TCPA/10DLC compliance and determines whether to append the first-message `"Reply STOP to opt out"` footer. |
| `recordConsentChange(params)` | Upserts an `opted_in` or `opted_out` record in `mpn_consent_record` from checkout, Admin, or inbound `JOIN`/`STOP`/`/start` webhooks. |
| `checkIdempotency(params)` | Computes deterministic `idempotency_key` and checks `mpn_delivery_log` for active (`pending`/`sent`/`delivered`) duplicates. |
| `recordDeliveryLog(params)` | Masks recipient PII (`maskRecipientPii`), hashes the recipient (`hashRecipient`), redacts sensitive payload fields (`redactSensitivePayload`), and writes to `mpn_delivery_log`. |
| `getOrCreateChannelConfig(channel)` | Retrieves or initializes the `mpn_channel_config` row for a channel. |
| `updateChannelConfig(params)` | Updates channel driver/config and automatically resets `is_verified = false` if a Telegram `channel_id` is changed. |
| `captureSandboxMessage(params)` | Extracts 4–8 digit OTP codes (`extractOtpCode`) and stores captured test messages in `mpn_sandbox_message`. |
| `pruneExpiredDeliveryLogs()` | Deletes `mpn_delivery_log` entries older than `logRetentionDays` (default `30` days). |

---

## Generating Migrations

After editing any model in `src/modules/notifications/models/index.ts`, regenerate migrations from the plugin root:

```bash
npx medusa plugin:db:generate
```

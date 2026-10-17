# API Routes

File-based REST routes under `/admin` and `/store`, following Medusa v2's `src/api/<surface>/<path>/route.ts` convention.

```sh
api/
├── validators.ts                           Zod validation schemas & inferred request payload types
├── middlewares.ts                          Global middleware registration (rawBody for webhooks + verifyStoreCustomerSession)
├── admin/
│   ├── plugin/
│   │   └── route.ts                        GET /admin/plugin — Admin plugin status & metadata
│   └── mpn/
│       ├── templates/
│       │   ├── route.ts                    GET, POST /admin/mpn/templates (list, create, or 1-click clone preset)
│       │   └── [id]/
│       │       └── route.ts                GET, POST, DELETE /admin/mpn/templates/:id (detail, update, delete)
│       ├── render-template/
│       │   └── route.ts                    POST /admin/mpn/render-template (live multi-locale entity/mock preview)
│       ├── mappings/
│       │   ├── route.ts                    GET, POST /admin/mpn/mappings (list & create event mappings)
│       │   └── [id]/
│       │       └── route.ts                POST, DELETE /admin/mpn/mappings/:id (update & delete event mapping)
│       ├── channels/
│       │   └── route.ts                    GET, POST /admin/mpn/channels (list, save driver config, or verify channel)
│       ├── logs/
│       │   └── route.ts                    GET /admin/mpn/logs (list PII-masked delivery logs)
│       ├── broadcasts/
│       │   └── route.ts                    GET, POST /admin/mpn/broadcasts (list & create/dispatch campaigns)
│       ├── sandbox/
│       │   └── route.ts                    GET, DELETE /admin/mpn/sandbox (list & clear captured sandbox messages/OTPs)
│       └── send/
│           └── route.ts                    POST /admin/mpn/send (ad-hoc send or event simulation with optional PDF invoice)
└── store/
    ├── plugin/
    │   └── route.ts                        GET /store/plugin — Storefront plugin health check
    └── mpn/
        ├── consent/
        │   └── route.ts                    POST /store/mpn/consent (opt-in / opt-out consent registration)
        └── webhooks/
            └── [provider]/
                └── route.ts                GET, POST /store/mpn/webhooks/:provider (HMAC-verified inbound webhooks)
```

---

## Authentication & Security Middlewares

### Admin Routes (`/admin/mpn/*`)

Protected by Medusa's standard admin authentication (`user` session, bearer token, or API key). All request bodies are validated against Zod schemas defined in `src/api/validators.ts`.

### Storefront Anti-IDOR Guard (`verifyStoreCustomerSession`)

Defined in `src/api/middlewares.ts` and enforced in `POST /store/mpn/consent`:

- Inspects `req.auth_context?.actor_id` and `req.auth_context?.actor_type`.
- When a `customer_id` is supplied in the consent payload and an authenticated customer session is active, ensures `customer_id === actor_id` (returning `403 Forbidden` on mismatch) so a customer can never modify another customer's consent or Telegram linkage.

### Inbound Webhook Raw Body Preservation (`preserveRawBody: true`)

`src/api/middlewares.ts` registers `bodyParser: { preserveRawBody: true }` on `/store/mpn/webhooks/*` so `POST /store/mpn/webhooks/:provider` can verify cryptographic HMAC signatures (`X-Hub-Signature-256`, `X-Webhook-Signature`, `X-Signature`) against the exact unparsed byte stream via `verifyWebhookHmacSignature` (`crypto.timingSafeEqual`).

---

## Admin Endpoints

| Method | Endpoint | Schema (`validators.ts`) | Description |
| --- | --- | --- | --- |
| `GET` | `/admin/mpn/templates` | Query: `channel`, `source`, `locale` | Lists all System Presets (`system_*`), External Templates (`external_*`), and DB Templates (`mpntpl_*`). |
| `POST` | `/admin/mpn/templates` | `AdminCreateTemplateSchema` | Clones a system preset (`clone_from_preset_id`) into DB rows or creates a new custom template with blocks. |
| `GET` | `/admin/mpn/templates/:id` | Path: `id` | Returns `{ template, blocks, flatBlocks }` for a preset or DB template. |
| `POST` | `/admin/mpn/templates/:id` | `AdminUpdateTemplateSchema` | Updates template fields (`label`, `mode`, `subject`, `raw_content`, `variable_map`, `meta_template_name`) and replaces its block tree if `blocks` is provided. |
| `DELETE` | `/admin/mpn/templates/:id` | Path: `id` | Deletes a DB template (`mpntpl_*`) and its associated `mpn_template_block` rows (system presets cannot be deleted). |
| `POST` | `/admin/mpn/render-template` | `AdminRenderPreviewSchema` | Renders a stored `template_id` or ad-hoc `blocks`/`raw_content` against live entity data (`entity_id`) or mock context (`order`, `shipment`, `inventory-level`, `product`, `cart`, `document`, `otp`). |
| `GET` | `/admin/mpn/mappings` | — | Returns `{ mappings, supported_events, recipient_rules, sender_profiles }`. |
| `POST` | `/admin/mpn/mappings` | `AdminUpsertEventMappingSchema` | Creates a new `mpn_event_mapping` rule. |
| `POST` | `/admin/mpn/mappings/:id` | `AdminUpsertEventMappingSchema.partial()` | Updates an existing `mpn_event_mapping` rule. |
| `DELETE` | `/admin/mpn/mappings/:id` | Path: `id` | Deletes an event mapping rule. |
| `GET` | `/admin/mpn/channels` | — | Returns `{ channels, sender_profiles, supported_drivers }`. |
| `POST` | `/admin/mpn/channels` | `AdminUpdateChannelConfigSchema` | Saves operational channel settings (`driver`, `is_enabled`, `rate_limit_per_sec`, `config_json`) or runs `action: "verify"` to dispatch a test verification message. |
| `GET` | `/admin/mpn/logs` | Query: `channel`, `event_name`, `entity_id`, `status`, `limit` | Lists PII-masked `mpn_delivery_log` records sorted newest-first. |
| `GET` | `/admin/mpn/broadcasts` | — | Lists `mpn_broadcast_campaign` rows and consent summary statistics (`opted_in_count`, `opted_out_count`). |
| `POST` | `/admin/mpn/broadcasts` | `AdminCreateBroadcastSchema` | Creates a broadcast campaign and dispatches immediately when `send_now: true`. |
| `GET` | `/admin/mpn/sandbox` | Query: `channel`, `recipient`, `limit` | Lists captured `mpn_sandbox_message` entries and extracted OTP codes. |
| `DELETE` | `/admin/mpn/sandbox` | — | Clears all DB and in-memory sandbox messages. |
| `POST` | `/admin/mpn/send` | `AdminManualSendSchema` | Dispatches an ad-hoc notification (`channel` + `recipient`) or triggers all active mappings for an `event_name`, with optional `attach_invoice_pdf`. |
| `GET` | `/admin/plugin` | — | Returns plugin status and module identifier. |

---

## Storefront & Webhook Endpoints

| Method | Endpoint | Schema / Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/store/mpn/consent` | `StoreConsentSchema` + `verifyStoreCustomerSession` | Records `opted_in` or `opted_out` consent in `mpn_consent_record` for `sms`, `whatsapp`, or `telegram`. |
| `GET` | `/store/mpn/webhooks/:provider` | Query: `hub.mode`, `hub.verify_token`, `hub.challenge` | Responds to Meta WhatsApp Cloud API webhook verification challenges against `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. |
| `POST` | `/store/mpn/webhooks/:provider` | `preserveRawBody: true` + HMAC / `X-Telegram-Bot-Api-Secret-Token` | Processes inbound `whatsapp`/`openwa`/`waha`/`evolution` (`JOIN`/`STOP` + status receipts), `telegram` (`/start <customer_id>`, `/stop`), and `sms`/`signalhouse`/`twilio` (`JOIN`/`STOP`) webhooks. |
| `GET` | `/store/plugin` | Public | Storefront health check endpoint. |

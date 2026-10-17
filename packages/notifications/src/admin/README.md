# Admin

Medusa v2 Admin extension — multi-route pages, `LayoutComposer` sections, order activity widget, and data-fetching hooks for `@vicacha-devs/medusa-plugin-notifications`.

```sh
admin/
├── tsconfig.json                           TypeScript config (moduleResolution: bundler, noEmit: true)
├── vite-env.d.ts                           Vite client type definitions
├── i18n/                                   react-i18next setup and 10-locale translation files (mpn namespace)
│   ├── index.ts                            Exports 10 locale translation maps (ar, de, en, es, fr, it, nl, pl, pt, tr)
│   └── json/                               One JSON file per locale
├── components/
│   └── mpn/                                18 modular Notification Studio files (< 170 lines each)
│       ├── index.ts                        Barrel re-exporting all MPN Admin UI components & hooks
│       ├── broadcast-consent-section.tsx   TCPA/10DLC consent summary side section
│       ├── broadcasts-tab.tsx              Customer group broadcasts form & campaign history table
│       ├── channels-main-section.tsx       WhatsApp/OpenWA & Telegram gateway configuration cards
│       ├── channels-side-section.tsx       SMS carrier driver configuration side card
│       ├── channels-tab.tsx                Multi-driver channel gateway coordinator
│       ├── constants.ts                    Re-exported channel/block/locale constants
│       ├── delivery-logs-tab.tsx           PII-masked delivery ledger table
│       ├── event-mapping-form.tsx          Store event → channel → template mapping form
│       ├── event-mappings-tab.tsx          Event mappings section & active rules table
│       ├── header-bar.tsx                  Studio header with Toaster and refresh action
│       ├── overview-cards.tsx              Shared StatCard and NavigationCard components
│       ├── sandbox-tab.tsx                 Dummy OTP & local sandbox message inspector
│       ├── template-editor-section.tsx     Block tree / raw editor & metadata inputs
│       ├── template-preview-section.tsx    Multi-locale live rendered preview card
│       ├── templates-list-section.tsx      Channel-filtered templates & system presets table
│       ├── templates-tab.tsx               Templates builder coordinator
│       └── use-notification-studio.ts      Studio data orchestration hook backed by src/hooks/*
├── routes/
│   └── mpn/                                Page routes registered in the Medusa Admin shell
│       ├── page.tsx                        /app/mpn — Overview dashboard (StatCards + NavigationCards)
│       ├── templates/
│       │   └── page.tsx                    /app/mpn/templates — Visual Block & Raw Template Builder
│       ├── mappings/
│       │   └── page.tsx                    /app/mpn/mappings — Event Mappings Orchestrator
│       ├── channels/
│       │   └── page.tsx                    /app/mpn/channels — Multi-Driver Gateway Configuration
│       ├── logs/
│       │   └── page.tsx                    /app/mpn/logs — Redacted Delivery Logs
│       ├── broadcasts/
│       │   └── page.tsx                    /app/mpn/broadcasts — Broadcasts & Consent Ledger
│       └── sandbox/
│           └── page.tsx                    /app/mpn/sandbox — Dummy OTP Sandbox
└── widgets/
    └── order-notifications-widget.tsx      Order details activity widget (zone: order.details.after)
```

---

## Route Registration & Breadcrumbs

Each `page.tsx` under `src/admin/routes/mpn/` exports a `config` created with `defineRouteConfig` (including `translationNs: "mpn"`) and a `handle` object with a `breadcrumb` component:

```tsx
export const config = defineRouteConfig({
  label: "Notifications",
  translationNs: "mpn",
  icon: ChatBubbleLeftRight,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}
```

| Route Path | File | Layout ID | Widget Zone Prefix | Description |
| --- | --- | --- | --- | --- |
| `/app/mpn` | `routes/mpn/page.tsx` | `SINGLE_COLUMN` | `mpn.overview` | Overview dashboard with `StatCard` KPIs and `NavigationCard` links to all 6 sub-routes |
| `/app/mpn/templates` | `routes/mpn/templates/page.tsx` | `SINGLE_COLUMN` | `mpn.templates` | Visual Block Tree & Raw Template Builder, 1-click preset cloning, and live multi-locale preview |
| `/app/mpn/mappings` | `routes/mpn/mappings/page.tsx` | `SINGLE_COLUMN` | `mpn.mappings` | Store Event → Channel → Template → Recipient Rule mapping form and active rules table |
| `/app/mpn/channels` | `routes/mpn/channels/page.tsx` | `TWO_COLUMN` | `mpn.channels` | WhatsApp/OpenWA & Telegram verification gate in `main`; SMS carrier selector in `side` |
| `/app/mpn/logs` | `routes/mpn/logs/page.tsx` | `SINGLE_COLUMN` | `mpn.logs` | PII-masked, idempotent delivery ledger table |
| `/app/mpn/broadcasts` | `routes/mpn/broadcasts/page.tsx` | `TWO_COLUMN` | `mpn.broadcasts` | Broadcast campaign form & history table in `main`; TCPA/10DLC consent summary in `side` |
| `/app/mpn/sandbox` | `routes/mpn/sandbox/page.tsx` | `SINGLE_COLUMN` | `mpn.sandbox` | Dummy OTP & local sandbox message inspector with 1-click clear |

---

## Component Architecture (`components/mpn/`)

All Admin UI components are modular, single-responsibility files kept strictly under **170 lines per file**:

| File | Responsibility |
| --- | --- |
| `index.ts` | Barrel exporting all Notification Studio components, constants, and `useNotificationStudio` |
| `constants.ts` | Re-exports `CHANNELS`, `CONTEXT_TYPES`, `BLOCK_TYPES`, and `LOCALES` from `src/types` |
| `header-bar.tsx` | Studio header bar with `<Toaster />`, subtitle, and refresh action button |
| `overview-cards.tsx` | Reusable `StatCard` and `NavigationCard` components for `/app/mpn` |
| `templates-tab.tsx` | Coordinates `TemplatesListSection`, `TemplateEditorSection`, and `TemplatePreviewSection` |
| `templates-list-section.tsx` | Channel-filtered table of `system_*` presets and `mpntpl_*` DB templates with Preview/Clone actions |
| `template-editor-section.tsx` | Subject, Meta WABA template name, Raw content textarea, and hierarchical Block Tree editor |
| `template-preview-section.tsx` | Live rendered preview across 10 locales and 7 entity context types with SMS encoding/segment badges |
| `event-mappings-tab.tsx` | Combines `EventMappingForm` and the active event mappings table with delete action |
| `event-mapping-form.tsx` | `KeyboundForm` for binding a Medusa event to a channel, template, recipient rule, thread ID, and PDF invoice attachment |
| `channels-tab.tsx` | Coordinator rendering `ChannelsMainSection` and `ChannelsSideSection` |
| `channels-main-section.tsx` | WhatsApp driver selector (`meta-cloud`, `openwa`, `waha`, `evolution`) and Telegram supergroup verification gate |
| `channels-side-section.tsx` | SMS carrier driver selector (`twilio`, `signalhouse`, `msg91`, `smsapi`, `dummy`) |
| `delivery-logs-tab.tsx` | Paginated table of PII-masked `mpn_delivery_log` records with status badges |
| `broadcasts-tab.tsx` | Customer group / custom recipient broadcast campaign form and campaign history table |
| `broadcast-consent-section.tsx` | Side card displaying opted-in vs. opted-out counts (`mpn_consent_record`) and webhook keywords (`JOIN`/`STOP`, `/start`) |
| `sandbox-tab.tsx` | Table of captured sandbox messages (`mpn_sandbox_message`) highlighting extracted OTP codes |
| `use-notification-studio.ts` | Unified studio state hook composing the domain hooks from `src/hooks/*` |

---

## Data Fetching & Hooks

All server communication goes through the typed SDK (`src/sdk/client.ts`) and React hooks (`src/hooks/`):

- `useNotificationStudio` (`components/mpn/use-notification-studio.ts`) — orchestrates studio state, active template selection, block tree editing, live preview rendering, and mutations for `/app/mpn/*` routes.
- `useMpnTemplates`, `useMpnTemplateDetail`, `useCreateOrCloneMpnTemplate`, `useUpdateMpnTemplate`, `useDeleteMpnTemplate`, `useRenderMpnTemplatePreview` (`src/hooks/use-mpn-templates.ts`).
- `useMpnMappings`, `useCreateMpnMapping`, `useUpdateMpnMapping`, `useDeleteMpnMapping` (`src/hooks/use-mpn-mappings.ts`).
- `useMpnChannels`, `useSaveOrVerifyMpnChannel` (`src/hooks/use-mpn-channels.ts`).
- `useMpnLogs`, `useMpnOrderLogs`, `useMpnBroadcasts`, `useCreateMpnBroadcast`, `useMpnSandboxMessages`, `useClearMpnSandbox`, `useSendMpnNotification`, `useUpdateStoreMpnConsent` (`src/hooks/use-mpn-dispatch.ts`).
- `useOrderNotificationsWidgetState` (`src/hooks/use-order-notifications-widget-state.ts`) — powers `widgets/order-notifications-widget.tsx` (`order.details.after`).

---

## i18n

Translations are configured in `src/admin/i18n/` using `react-i18next` across 10 locales (`ar`, `de`, `en`, `es`, `fr`, `it`, `nl`, `pl`, `pt`, `tr`) with automatic RTL support for Arabic (`ar`). See [`i18n/README.md`](./i18n/README.md) for details.

# Workflows

Medusa workflows (`@medusajs/framework/workflows-sdk`) that orchestrate OAuth onboarding, media ingestion, live stream lifecycle transitions, outbound catalog sync, and social checkout handoffs.

```
workflows/
├── index.ts                        Barrel exporting all 6 workflows and steps
├── account-connected.workflow.ts   accountConnectedWorkflow (step: initial-account-sync)
├── media-synced.workflow.ts        mediaSyncedWorkflow (step: sync-social-media)
├── live-started.workflow.ts        liveStartedWorkflow (step: start-live-session, with rollback compensation)
├── live-ended.workflow.ts          liveEndedWorkflow (step: end-live-session)
├── catalog-sync.workflow.ts        catalogSyncWorkflow (step: sync-catalog-batch)
└── checkout-handoff.workflow.ts    checkoutHandoffWorkflow (step: build-social-checkout-handoff)
```

---

## Workflow Index

| Workflow ID | Export | Step ID | File | Trigger |
| --- | --- | --- | --- | --- |
| `account-connected` | `accountConnectedWorkflow` | `initial-account-sync` | `account-connected.workflow.ts` | `/social/oauth/callback` & `social.account_connected` subscriber |
| `media-synced` | `mediaSyncedWorkflow` | `sync-social-media` | `media-synced.workflow.ts` | `POST /admin/social/sync` |
| `live-started` | `liveStartedWorkflow` | `start-live-session` | `live-started.workflow.ts` | `POST /admin/social/live/:id` (`action: "start"`) & `social.live_started` subscriber |
| `live-ended` | `liveEndedWorkflow` | `end-live-session` | `live-ended.workflow.ts` | `POST /admin/social/live/:id` (`action: "end"`) & `social.live_ended` subscriber |
| `catalog-sync` | `catalogSyncWorkflow` | `sync-catalog-batch` | `catalog-sync.workflow.ts` | `POST /admin/social/catalog` |
| `checkout-handoff` | `checkoutHandoffWorkflow` | `build-social-checkout-handoff` | `checkout-handoff.workflow.ts` | `GET` / `POST /store/social/checkout-handoff` |

# Subscribers

Event subscribers that react to Medusa core order/product events and social domain/webhook events.

```
subscribers/
├── order-placed.subscriber.ts      Handles order.placed — confirms held live stock reservations
├── product-sync.subscriber.ts      Handles product.created & product.updated — syncs outbound catalogs
└── social-events.subscriber.ts     Handles social.* events — triggers onboarding & live session workflows
```

---

## Subscriber Index

| File | Subscribed Events | Behavior |
| --- | --- | --- |
| `order-placed.subscriber.ts` | `order.placed` | Inspects `order.metadata.reservation_id`, `order.metadata.live_reservation_ids`, and `order.cart_id` to find any held live-stream stock reservations (`status: "held"`) and calls `socialService.confirmLiveProductReservation(reservationId)` so reserved stock transitions to `sold_stock`. |
| `product-sync.subscriber.ts` | `product.created`, `product.updated` | Iterates active `SocialAccount` records (excluding `platform: "local"`) that have a configured `external_catalog_id` or `external_shop_id` and pushes updated `CatalogFeedProductItem[]` via `socialService.syncProductsToSocialCatalog`. |
| `social-events.subscriber.ts` | `social.account_connected`, `social.media_synced`, `social.live_started`, `social.live_ended` | Executes `accountConnectedWorkflow`, `liveStartedWorkflow`, or `liveEndedWorkflow` when social domain events are emitted by OAuth callbacks or incoming platform webhooks. |

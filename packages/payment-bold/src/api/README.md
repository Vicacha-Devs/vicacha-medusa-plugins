# API Routes (`src/api`)

Admin REST endpoints and Zod validation middlewares for `@vicacha-devs/medusa-plugin-payment-bold`.

```text
api/
├── middlewares.ts                  # Registers validateAndTransformBody middlewares for /admin/bold/*
├── validators.ts                   # AdminBoldPosPushSchema & AdminBoldPaymentLinkSchema
└── admin/
    └── bold/
        ├── terminals/
        │   └── route.ts            # GET /admin/bold/terminals
        ├── pos-push/
        │   └── route.ts            # POST /admin/bold/pos-push
        └── payment-link/
            └── route.ts            # POST /admin/bold/payment-link
```

---

## Endpoints

| Method | Path | Body Schema | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/bold/terminals` | — | Invokes `listActiveTerminals()` on the registered Bold payment provider to list available physical POS Dataphones. |
| `POST` | `/admin/bold/pos-push` | `AdminBoldPosPushSchema` | Creates a `pp_bold-terminal_bold` payment session on `payment_collection_id` for `amount` (remaining `payableAmount`) and pushes the charge to `terminal_serial`. |
| `POST` | `/admin/bold/payment-link` | `AdminBoldPaymentLinkSchema` | Creates a `pp_bold-link_bold` payment session on `payment_collection_id` for `amount` (remaining `payableAmount`) and returns `payment_link_url` and `payment_link_id`. |

---

## Native Medusa Webhooks

Webhook notifications from Bold are handled natively by Medusa v2's Payment Module router via `getWebhookActionAndData` in `BoldBaseProvider`:

- `POST /hooks/payment/bold-online_bold`
- `POST /hooks/payment/bold-terminal_bold`
- `POST /hooks/payment/bold-link_bold`

# `@vicacha-devs/medusa-plugin-payment-bold`

Colombian **Bold Payment Provider Suite (`bold-online`, `bold-terminal`, `bold-link`) & Admin Payment Operations Widget** for **Medusa v2**.

Supports online checkout buttons, physical Smart POS Dataphone payment pushes (API Integración), on-demand payment links & QR codes, authenticated HMAC-SHA256 webhooks, and **partial payment collection** (`partially_paid`, `partially_captured`, `partially_authorized`, and orders with remaining unpaid balance).

> **Medusa compatibility:** `>= 2.13.x / 2.21.x`

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation & Configuration](#installation--configuration)
- [Payment Providers](#payment-providers)
- [Partial Payment & Remaining Balance Support](#partial-payment--remaining-balance-support)
- [REST API & Webhooks](#rest-api--webhooks)
- [Admin UI Widget](#admin-ui-widget)
- [Development & Testing](#development--testing)
- [License](#license)

---

## Features

- **3 Bold Payment Providers in 1 Module (`src/providers/payment-bold`)**:
  - **`bold-online` (`pp_bold-online_bold`)**: Bold Botón de Pagos web checkout with `SHA-256` integrity hash generation (`{orderId}{amount}{currency}{secretKey}`).
  - **`bold-terminal` (`pp_bold-terminal_bold`)**: Bold API Integración for physical Smart POS Dataphones (dispatching live payment prompts to terminal serial numbers).
  - **`bold-link` (`pp_bold-link_bold`)**: Bold Link de Pagos API for generating shareable payment URLs and QR codes (`CREDIT_CARD`, `PSE`, `NEQUI`, `BOTON_BANCOLOMBIA`).
- **Partial Payment & Remaining Balance Collection**:
  - `BoldPaymentActionsWidget` stays enabled for both unpaid and **partially paid** orders (`partially_paid`, `partially_captured`, `partially_authorized`, or `summary.pending_difference > 0`).
  - Automatically computes the remaining `payableAmount` (`order.total - paidTotal`, preferring `order.summary.pending_difference`) and displays a **Partial Payment Balance** banner in the Admin Order Details view.
- **HMAC-SHA256 Webhook Verification**:
  - Constant-time `crypto.timingSafeEqual` signature verification on incoming Bold webhook notifications (`SALE_APPROVED`, `SALE_REJECTED`, `VOID_APPROVED`, `VOID_REJECTED`).
- **Decoupled Admin Architecture**:
  - Modular React hooks (`use-bold-widget-state.tsx`, `use-bold-pos-push.ts`, `use-bold-payment-link.ts`), pure balance evaluator (`bold-order-balance.ts`), and single-responsibility section components (`BoldPosTerminalSection`, `BoldPaymentLinkSection`).

---

## Requirements

| Dependency | Version |
| :--- | :--- |
| `@medusajs/medusa` | `>= 2.13.0` |
| Node.js | `>= 20` |
| Bold Merchant Credentials | Identity Key (`apiKey`) + Secret Key (`secretKey`) |

---

## Installation & Configuration

```bash
pnpm add @vicacha-devs/medusa-plugin-payment-bold
```

Register both the plugin (for Admin Widget & API routes) and the payment provider module in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@vicacha-devs/medusa-plugin-payment-bold",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@vicacha-devs/medusa-plugin-payment-bold/providers/payment-bold",
            id: "bold",
            options: {
              apiKey: process.env.BOLD_API_KEY,
              secretKey: process.env.BOLD_SECRET_KEY,
              webhookSecret: process.env.BOLD_WEBHOOK_SECRET, // optional override for local simulator
              environment: process.env.BOLD_ENVIRONMENT || "sandbox", // "sandbox" | "production"
              baseUrl: process.env.BOLD_BASE_URL, // optional custom API URL
            },
          },
        ],
      },
    },
  ],
})
```

---

## Payment Providers

| Provider ID | Medusa Registration ID | Use Case |
| :--- | :--- | :--- |
| `bold-online` | `pp_bold-online_bold` | Storefront Web Checkout (Bold Botón de Pagos with `integritySignature`) |
| `bold-terminal` | `pp_bold-terminal_bold` | In-store / Admin physical Smart POS Dataphone push (`POST /v1/payments/app-checkout`) |
| `bold-link` | `pp_bold-link_bold` | Remote payment links & QR codes (`POST /online/link/v1`) |

---

## Partial Payment & Remaining Balance Support

`src/admin/utils/bold-order-balance.ts` (`getBoldOrderBalanceState`) inspects the Medusa `AdminOrder` object and determines:

- **`isFullyPaid`**: `true` only when `payment_status` is `"captured"` or `"paid"` and `payableAmount <= 0`.
- **`isPartiallyPaid`**: `true` when `payment_status` is `"partially_paid"`, `"partially_captured"`, `"partially_authorized"`, or when `paidAmount > 0 && payableAmount > 0`.
- **`payableAmount`**: Prefers `order.summary.pending_difference` when positive; otherwise computes `max(0, totalAmount - paidAmount)`.

When an operator triggers **Push to Dataphone** or **Generate Payment Link** on a partially paid order, the widget sends `amount: payableAmount` to the backend route, which initializes a new payment session in the order's `PaymentCollection` for the exact remaining balance.

---

## REST API & Webhooks

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/bold/terminals` | Lists active Bold POS terminals (`GET /v1/payments/binded-terminals`) via the configured payment provider |
| `POST` | `/admin/bold/pos-push` | Initializes a `pp_bold-terminal_bold` payment session on the order's `PaymentCollection` and dispatches the charge to `terminal_serial` |
| `POST` | `/admin/bold/payment-link` | Initializes a `pp_bold-link_bold` payment session on the order's `PaymentCollection` and returns `payment_link_url` + `payment_link_id` |
| `POST` | `/hooks/payment/bold-online_bold` | Native Medusa payment webhook for Bold online payments |
| `POST` | `/hooks/payment/bold-terminal_bold` | Native Medusa payment webhook for Bold POS terminal payments |
| `POST` | `/hooks/payment/bold-link_bold` | Native Medusa payment webhook for Bold payment links |

---

## Admin UI Widget

Injected into `order.details.after` (`src/admin/widgets/bold-payment-actions.tsx`):

```text
src/admin/
├── widgets/
│   ├── bold-payment-actions.tsx          # Order details widget (renders partial balance banner + POS & Link sections)
│   └── components/
│       ├── bold-pos-terminal-section.tsx # Dataphone selector, manual S/N input, and Push button
│       └── bold-payment-link-section.tsx # Payment link generator, copy-to-clipboard, and active URL badge
├── hooks/
│   ├── use-bold-widget-state.tsx         # Orchestrates terminals query, balance calculation, and child mutation hooks
│   ├── use-bold-pos-push.ts              # Handles POS terminal push mutation
│   └── use-bold-payment-link.ts          # Handles payment link generation & clipboard state
├── utils/
│   └── bold-order-balance.ts             # Pure getBoldOrderBalanceState() helper
└── i18n/                                 # English (en) & Spanish (es) admin translations
```

---

## Development & Testing

```bash
# Build plugin
pnpm build

# Run unit tests (provider, webhooks, and partial-payment order balance calculations)
pnpm test:unit
```

---

## License

MIT © Vicacha Devs

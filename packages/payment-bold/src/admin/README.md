# Medusa v2 Bold Payment Admin Module (`src/admin`)

Injects the interactive **Bold Payment Actions** widget (`BoldPaymentActionsWidget`) into the Medusa v2 Admin Panel under the **Order Details** screen (`order.details.after`).

```text
admin/
├── widgets/
│   ├── bold-payment-actions.tsx          # Order details widget (mounts at order.details.after)
│   └── components/
│       ├── bold-pos-terminal-section.tsx # Dataphone model/serial selector & Push action
│       └── bold-payment-link-section.tsx # On-demand Payment Link generator & copy action
├── hooks/
│   ├── use-bold-widget-state.tsx         # Aggregates balance state, terminal list, and action hooks
│   ├── use-bold-pos-push.ts              # Mutation hook for POST /admin/bold/pos-push
│   └── use-bold-payment-link.ts          # Mutation hook for POST /admin/bold/payment-link
├── utils/
│   └── bold-order-balance.ts             # getBoldOrderBalanceState() for full & partial payment balances
├── i18n/                                 # English (en) & Spanish (es) translations
└── lib/
    └── sdk.ts                            # Medusa Admin SDK client instance
```

---

## Features

1. **Partial Payment & Remaining Balance Support (`bold-order-balance.ts`)**:
   - Remains active for both unpaid and **partially paid** orders (`partially_paid`, `partially_captured`, `partially_authorized`, or `summary.pending_difference > 0`).
   - Displays a **Partial Payment Balance** banner showing how much has already been paid (`paidAmount`) and the exact remaining balance (`payableAmount`) that will be charged.
   - Automatically disables actions only when the order is `canceled` or `isFullyPaid` (`payableAmount === 0`).

2. **Smart POS Terminal Push (`bold-terminal`)**:
   - Queries active bound terminals via `GET /admin/bold/terminals` with automatic fallback to manual model + serial number entry.
   - Dispatches checkout requests for `payableAmount` directly to physical Bold Smart Dataphones via `POST /admin/bold/pos-push`.

3. **Payment Link & QR Generator (`bold-link`)**:
   - Generates secure Bold online payment links on demand for `payableAmount` via `POST /admin/bold/payment-link`.
   - Includes one-click copy-to-clipboard functionality for sharing via WhatsApp, Email, or SMS.

---

## How It Works

1. **Widget Mounting**:
   - The widget binds to `order.details.after` using `defineWidgetConfig`.
   - It retrieves the active `payment_collection_id` associated with the target order.

2. **API Communication**:
   - Operations hit custom admin routes under `/admin/bold/*` (e.g., `/admin/bold/pos-push`, `/admin/bold/payment-link`).
   - The API routes delegate execution directly to Medusa's native `Modules.PAYMENT` service rather than issuing detached external HTTP calls.

3. **State Management**:
   - Payment states update asynchronously via native Medusa webhook receivers (`/hooks/payment/bold-online`, `/hooks/payment/bold-terminal`).

---

## Usage Guide

### Pushing a Payment to a Physical POS Dataphone

1. Open any pending order in the **Medusa Admin Panel**.
2. Scroll to the **Bold Payment Actions** widget at the bottom of the order details page.
3. Select the terminal model (e.g., `Smart POS` or `Bold Neo`).
4. Enter the physical Dataphone's **Serial Number (S/N)**.
5. Click **Push to Dataphone**. The terminal will prompt the customer for card tap/chip/PIN insertion immediately.

### Generating a Payment Link

1. Click **Generate Link** inside the **Payment Link & QR** section of the widget.
2. Once generated, click the **Copy Icon** to copy the URL to your clipboard.
3. Send the link to the customer via WhatsApp, Email, or SMS.

# CLAUDE.md — `@vicacha-devs/medusa-plugin-payment-bold`

## Project Overview

`@vicacha-devs/medusa-plugin-payment-bold` is a Medusa v2 payment provider and Admin order operations plugin for **Bold.co** (Colombia), providing 3 payment providers (`bold-online`, `bold-terminal`, `bold-link`), HMAC-SHA256 webhook verification, and an interactive Order Details widget (`BoldPaymentActionsWidget`) with full support for **partially paid orders**.

---

## Architecture & Directory Layout

- `src/providers/payment-bold/` —
  - `index.ts`: Registers `BoldOnlineProviderService`, `BoldTerminalProviderService`, and `BoldLinkProviderService` via `ModuleProvider(Modules.PAYMENT, ...)`.
  - `core/bold-base.ts`: Abstract `BoldBaseProvider` extending `AbstractPaymentProvider` with shared Bold API HTTP client, HMAC-SHA256 webhook verification (`crypto.timingSafeEqual`), and terminal discovery (`listActiveTerminals`).
  - `services/bold-online.ts`: `bold-online` provider generating SHA-256 `integritySignature` (`{orderId}{amount}{currency}{secretKey}`).
  - `services/bold-terminal.ts`: `bold-terminal` provider dispatching `/v1/payments/app-checkout` requests to physical Dataphones.
  - `services/bold-link.ts`: `bold-link` provider generating `/online/link/v1` URLs and polling link status.
- `src/api/` —
  - `validators.ts` & `middlewares.ts`: Zod request body schemas (`AdminBoldPosPushSchema`, `AdminBoldPaymentLinkSchema`) and route validation middlewares.
  - `admin/bold/terminals/route.ts`: `GET /admin/bold/terminals`.
  - `admin/bold/pos-push/route.ts`: `POST /admin/bold/pos-push` via `Modules.PAYMENT`.
  - `admin/bold/payment-link/route.ts`: `POST /admin/bold/payment-link` via `Modules.PAYMENT`.
- `src/admin/` —
  - `utils/bold-order-balance.ts`: `getBoldOrderBalanceState(order)` computing `isFullyPaid`, `isPartiallyPaid`, `paidAmount`, and remaining `payableAmount`.
  - `hooks/use-bold-widget-state.tsx`, `hooks/use-bold-pos-push.ts`, `hooks/use-bold-payment-link.ts`: Decoupled state and mutation hooks (`< 170` lines each).
  - `widgets/bold-payment-actions.tsx`: Order Details widget (`order.details.after`).

---

## Engineering & Security Invariants

1. **Partial Payment Support**:
   - `BoldPaymentActionsWidget` must remain enabled whenever `payableAmount > 0` (including `partially_paid`, `partially_captured`, `partially_authorized`) and must pass `payableAmount` (not the original `order.total`) when dispatching POS terminal charges or generating payment links.
2. **Native Medusa Payment Module Delegation**:
   - Admin routes under `/admin/bold/*` must resolve `Modules.PAYMENT` (`IPaymentModuleService`) and create payment sessions on the order's `payment_collection_id` rather than bypassing Medusa's payment state machine.
3. **Component Size & Decoupling**:
   - Keep all Admin components and hooks concise (`< 170` lines per file).

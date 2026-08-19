# Utils

Shared pure-function utilities used by workflows and API routes.

```
utils/
├── check-spending-limit.ts     spending-limit evaluation helpers
└── get-cart-approval-status.ts cart approval status helpers
```

---

## `check-spending-limit.ts`

Three exports used by `validate-cart-completion` hook to enforce per-employee spend caps.

| Export | Signature | Purpose |
| --- | --- | --- |
| `getSpendWindow` | `(company: Company) => { start: Date, end: Date }` | Computes the current spend window based on `spending_limit_reset_frequency` |
| `getOrderTotalInSpendWindow` | `(orders: Order[], window) => number` | Sums order totals that fall within the window |
| `checkSpendingLimit` | `(cart, customer) => boolean` | Returns `true` if `spent + cart.total > spending_limit` |

`checkSpendingLimit` returns `false` (not blocked) when `spending_limit` is `0`, since `0` means unlimited.

## `get-cart-approval-status.ts`

| Export | Signature | Purpose |
| --- | --- | --- |
| `getCartApprovalStatus` | `(cart) => { isPendingApproval, isApproved, isRejected }` | Derives aggregate approval state from `cart.approvals[]` |

Used by both `validate-add-to-cart` and `validate-update-cart` hooks.

---

## Adding utilities

Keep utilities pure functions — no Medusa module resolution, no side effects. Anything that needs `req.scope` belongs in a workflow step, not here.

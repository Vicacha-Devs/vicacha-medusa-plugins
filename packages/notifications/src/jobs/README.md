# Scheduled Jobs

Background scheduled jobs (`src/jobs/`) registered automatically by Medusa v2 for abandoned cart recovery, delivery log retention cleanup, and scheduled broadcast campaigns.

```sh
jobs/
├── abandoned-cart-recovery.ts          Every 15m abandoned cart scanner with TCPA consent & 24h cooldown
└── log-retention-and-broadcasts.ts     Hourly delivery log retention pruner & scheduled broadcasts runner
```

---

## Job Schedule Summary

| Job Name | File | Cron Schedule | Frequency | Purpose |
| --- | --- | --- | --- | --- |
| `mpn-abandoned-cart-recovery` | `abandoned-cart-recovery.ts` | `*/15 * * * *` | Every 15 minutes | Scans abandoned carts, verifies `opted_in` TCPA consent & 24h per-phone cooldown, and dispatches `cart.abandoned` notifications. |
| `mpn-log-retention-and-broadcasts` | `log-retention-and-broadcasts.ts` | `0 * * * *` | Every hour | Prunes `mpn_delivery_log` records older than `logRetentionDays` (default `30` days). |

---

## 1. `mpn-abandoned-cart-recovery` (`abandoned-cart-recovery.ts`)

Exports `runAbandonedCartRecoveryJob(container)` and the default Medusa job handler (`config.schedule = "*/15 * * * *"`).

### Execution Rules & Safeguards

1. **Opt-In Activation**: Runs only when `options.enableCartRecovery === true` or `SIGNALHOUSE_CART_ABANDONMENT_ENABLED="true"`.
2. **Inactivity Threshold**: Queries incomplete carts (`completed_at === null`) with at least 1 line item whose `updated_at` timestamp is older than `cartAbandonmentThresholdMinutes` (default `60` minutes, minimum `15` minutes).
3. **E.164 Phone Normalization**: Normalizes `cart.shipping_address.phone` or `cart.customer.phone` via `normalizeE164Phone`.
4. **Explicit TCPA / 10DLC Consent Verification**: Requires an active `mpn_consent_record` row with `status === "opted_in"` for the customer's phone number.
5. **Strict 24-Hour Per-Phone Cooldown**: Checks `activeConsent.last_cart_recovery_at` and skips any phone number that has already received a cart recovery message within the last 24 hours (`24 * 60 * 60 * 1000` ms).
6. **Event Dispatch**: Invokes `executeEventNotificationsDispatch` with `event_name: "cart.abandoned"` and `recovery_url: "${recoveryBaseUrl}?cart_id=${cart.id}"` (paired with the built-in `system_sms_cart_recovery` preset), then updates `last_cart_recovery_at`.

---

## 2. `mpn-log-retention-and-broadcasts` (`log-retention-and-broadcasts.ts`)

Runs at the top of every hour (`0 * * * *`) and invokes `mpnService.pruneExpiredDeliveryLogs()`:

- Deletes `mpn_delivery_log` rows whose `created_at` is older than `options.logRetentionDays` (or `MAILER_LOG_RETENTION_DAYS`, default `30` days) to keep the database ledger compact and GDPR/privacy compliant.

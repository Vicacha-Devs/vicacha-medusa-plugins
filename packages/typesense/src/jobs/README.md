# Scheduled Jobs

Medusa scheduled background jobs for `@vicacha-devs/medusa-plugin-typesense`.

```
jobs/
└── typesense-nightly-reconcile.ts     Runs daily at 03:00 UTC (0 3 * * *)
```

---

## Job Index

| Job Name | Schedule | File | Behavior |
| --- | --- | --- | --- |
| `typesense-nightly-reconcile` | `0 3 * * *` (Daily at 03:00) | `typesense-nightly-reconcile.ts` | Checks if `autoIndex` is enabled and the Typesense cluster is healthy (`getClusterOverview().healthy`), then executes `syncEntitiesToTypesenseWorkflow` (`triggeredBy: "scheduled_job"`) to reconcile all enabled entity collections via zero-downtime alias swaps. |

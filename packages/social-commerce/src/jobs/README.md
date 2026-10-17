# Scheduled Jobs

Medusa scheduled background jobs that refresh expiring OAuth 2.0 tokens, ingest remote social media posts & 24h stories, and reclaim expired live-stream stock reservations.

```
jobs/
├── sync-social-media-and-tokens.job.ts           Every 30 minutes (0 */30 * * * *)
└── cleanup-reservations-and-sync-catalog.job.ts  Every 5 minutes  (0 */5 * * * *)
```

---

## Job Index

| Job Name | Schedule | File | Handler Behavior |
| --- | --- | --- | --- |
| `social-commerce-sync-media-and-tokens` | `0 */30 * * * *` (Every 30 minutes) | `sync-social-media-and-tokens.job.ts` | 1. Calls `socialService.refreshExpiringAccounts(60)` to refresh any TikTok or Meta OAuth token expiring within 60 minutes.<br>2. Calls `socialService.syncAllAccountsMedia({ includeStories: true })` to ingest new videos, reels, posts, and 24-hour stories and mark expired stories. |
| `social-commerce-cleanup-expired-reservations` | `0 */5 * * * *` (Every 5 minutes) | `cleanup-reservations-and-sync-catalog.job.ts` | Calls `socialService.reservationService.cleanupExpiredReservations()` to release held flash-sale stock reservations whose TTL has elapsed without order completion. |

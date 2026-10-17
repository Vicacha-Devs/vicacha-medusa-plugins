# Scheduled Jobs

Medusa scheduled background jobs for `@vicacha-devs/medusa-plugin-stories`.

```
jobs/
└── expire-ephemeral-stories.ts     Runs every 15 minutes (*/15 * * * *)
```

---

## Job Index

| Job Name | Schedule | File | Behavior |
| --- | --- | --- | --- |
| `expire-ephemeral-stories` | `*/15 * * * *` (Every 15 minutes) | `expire-ephemeral-stories.ts` | Resolves `StoriesModuleService` (`STORIES_MODULE`) and calls `expireOutdatedStories()` to automatically set `is_active = false` on any story slide whose `expires_at` timestamp has passed. |

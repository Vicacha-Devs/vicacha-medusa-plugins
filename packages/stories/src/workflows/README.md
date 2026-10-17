# Workflows

Medusa workflows (`@medusajs/framework/workflows-sdk`) that implement story group creation, slide creation, engagement event recording, and ephemeral story expiration.

```
workflows/
└── index.ts    createStoryGroupWorkflow, createStorySlideWorkflow, recordStoryEngagementWorkflow, expireEphemeralStoriesWorkflow (and expireStoriesWorkflow alias)
```

---

## Workflow Index

| Workflow ID | Export | Step ID | Compensation | Trigger |
| --- | --- | --- | --- | --- |
| `create-story-group` | `createStoryGroupWorkflow` | `create-story-group` | Calls `storiesService.deleteGroup(groupId)` | `POST /admin/stories/groups` |
| `create-story-slide` | `createStorySlideWorkflow` | `create-story-slide` | Calls `storiesService.deleteSlide(slideId)` | `POST /admin/stories` |
| `record-story-engagement` | `recordStoryEngagementWorkflow` | `record-story-engagement` | — | `POST /store/stories/:id/events` |
| `expire-ephemeral-stories` | `expireEphemeralStoriesWorkflow` / `expireStoriesWorkflow` | `expire-ephemeral-stories` | — | Scheduled job `expire-ephemeral-stories` (`src/jobs/expire-ephemeral-stories.ts`) |

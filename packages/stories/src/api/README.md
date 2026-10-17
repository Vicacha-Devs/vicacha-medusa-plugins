# API Routes

File-based REST routes under `/admin` and `/store`, following Medusa's `src/api/<surface>/<path>/route.ts` convention.

```
api/
├── validators.ts                               Zod schemas (@medusajs/framework/zod) for all Admin & Store routes
├── middlewares.ts                              defineMiddlewares binding validateAndTransformBody
├── admin/
│   ├── plugin/
│   │   └── route.ts                            GET /admin/plugin — health check
│   └── stories/
│       ├── route.ts                            GET (list studio state), POST (create slide) /admin/stories
│       ├── groups/
│       │   ├── route.ts                        GET, POST /admin/stories/groups — list or create Story Highlight Rings
│       │   └── [id]/
│       │       └── route.ts                    GET, PATCH, DELETE /admin/stories/groups/:id
│       ├── analytics/
│       │   └── route.ts                        GET /admin/stories/analytics — conversion funnel overview
│       └── [id]/
│           ├── route.ts                        GET, PATCH, DELETE /admin/stories/:id — slide CRUD
│           ├── hotspots/
│           │   └── route.ts                    POST, DELETE /admin/stories/:id/hotspots — pin or remove product hotspot
│           └── stickers/
│               └── route.ts                    POST, DELETE /admin/stories/:id/stickers — add or remove interactive sticker
└── store/
    ├── plugin/
    │   └── route.ts                            GET /store/plugin — storefront health check
    └── stories/
        ├── route.ts                            GET /store/stories — active Story Highlight Rings & slides
        └── [id]/
            ├── events/
            │   └── route.ts                    POST /store/stories/:id/events — record engagement & funnel events
            └── interact/
                └── route.ts                    POST /store/stories/:id/interact — vote on polls, submit Q&A, claim coupons
```

---

## Endpoint Summary

### Storefront Endpoints

| Method | Path | Validator Schema | Description |
| --- | --- | --- | --- |
| `GET` | `/store/stories` | — | Returns `{ stories, groups }` filtered by `placement` (`home`, `collection`, `category`, `product`, `floating_bubble`, `global`), `target_entity_id`, `collection_id`, `group_id`, or `product_id`. Automatically filters out inactive and expired stories. |
| `POST` | `/store/stories/:id/events` | `RecordStoryEngagementSchema` | Executes `recordStoryEngagementWorkflow` to record `impression`, `complete`, `tap_forward`, `tap_back`, `exit`, `hotspot_click`, `link_click`, `add_to_cart`, or `sticker_interact`. |
| `POST` | `/store/stories/:id/interact` | `InteractWithStoryStickerSchema` | Records a `poll` vote (`option_id`), `question_badge` response (`answer_text`), or `coupon` claim on a sticker. |

### Admin Endpoints

| Method | Path | Validator Schema | Workflow / Service Method |
| --- | --- | --- | --- |
| `GET` | `/admin/stories` | — | `storiesService.listAdminStudioState` |
| `POST` | `/admin/stories` | `CreateStorySlideSchema` | `createStorySlideWorkflow` |
| `GET` / `PATCH` / `DELETE` | `/admin/stories/:id` | `UpdateStorySlideSchema` | `getSlideById`, `updateSlide`, `deleteSlide` |
| `GET` / `POST` | `/admin/stories/groups` | `CreateStoryGroupSchema` | `listGroups`, `createStoryGroupWorkflow` |
| `GET` / `PATCH` / `DELETE` | `/admin/stories/groups/:id` | `UpdateStoryGroupSchema` | `getGroupById`, `updateGroup`, `deleteGroup` |
| `POST` / `DELETE` | `/admin/stories/:id/hotspots` | `CreateStoryHotspotSchema` / `DeleteStoryHotspotSchema` | `addHotspotToSlide`, `removeHotspot` |
| `POST` / `DELETE` | `/admin/stories/:id/stickers` | `CreateStoryStickerSchema` / `DeleteStoryStickerSchema` | `addStickerToSlide`, `removeSticker` |
| `GET` | `/admin/stories/analytics` | — | `storiesService.getAnalyticsOverview` |

# Subscribers

Event subscribers that keep `StoriesModule` synchronized with Medusa core product lifecycle events.

```
subscribers/
└── product-deleted.ts      Handles product.deleted — cleans up StoryHotspot records
```

---

## Subscriber Index

| File | Subscribed Event | Behavior |
| --- | --- | --- |
| `product-deleted.ts` | `product.deleted` | Resolves `StoriesModuleService` (`STORIES_MODULE`) and calls `removeHotspotsByProductId(data.id)` so that any `StoryHotspot` pins referencing the deleted product are automatically removed. |

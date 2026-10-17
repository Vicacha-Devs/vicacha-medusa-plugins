# CLAUDE.md — `@vicacha-devs/medusa-plugin-stories`

## Project Overview

`@vicacha-devs/medusa-plugin-stories` is a Medusa v2 (`2.21.x`) plugin providing 9:16 Shoppable Stories, Highlight Rings (`StoryGroup`), Interactive X/Y Product Hotspots (`StoryHotspot`), Interactive Stickers (`StorySticker`: Polls, Countdowns, Coupons, Q&A), Conversion Funnel Analytics (`StoryEvent`), a decoupled 9:16 Admin Studio, a Product Detail Widget, and a drop-in Storefront React UI Kit.

It maintains 100% backward compatibility with `@bambiste/medusa-stories` (`STORIES_MODULE = "stories"`, `Story` model, `expireStoriesWorkflow`).

---

## Package Exports (`package.json`)

| Import Path | Target Source | Purpose |
|---|---|---|
| `@vicacha-devs/medusa-plugin-stories` | `src/index.ts` | Root export (`StoriesModule`, `StoriesModuleService`, `STORIES_MODULE`, workflows, SDK, hooks, UI kit, i18n) |
| `@vicacha-devs/medusa-plugin-stories/modules/story` | `src/modules/story/index.ts` | Medusa Module definition (`Module("stories", { service: StoriesModuleService })`) |
| `@vicacha-devs/medusa-plugin-stories/modules/stories` | `src/modules/stories/index.ts` | Alias re-exporting `src/modules/story` |
| `@vicacha-devs/medusa-plugin-stories/workflows` | `src/workflows/index.ts` | `createStoryGroupWorkflow`, `createStorySlideWorkflow`, `recordStoryEngagementWorkflow`, `expireEphemeralStoriesWorkflow`, `expireStoriesWorkflow` |
| `@vicacha-devs/medusa-plugin-stories/sdk` | `src/sdk/index.ts` | `createStoriesSdk`, `defaultStoriesSdk`, `storiesQueryKeys` |
| `@vicacha-devs/medusa-plugin-stories/hooks` | `src/hooks/index.ts` | Storefront & Admin hooks (`useStoreStories`, `useStoryPlayer`, `useRecordStoryEvent`, `useInteractStorySticker`, `useAdminStoriesState`, etc.) |
| `@vicacha-devs/medusa-plugin-stories/ui` | `src/ui/index.ts` | `<StoryRingsBar />`, `<StoryPlayerModal />`, `<StoryHotspotPin />`, `<StoryProductSheet />` |
| `@vicacha-devs/medusa-plugin-stories/types` | `src/types/index.ts` | Shared TypeScript types |

---

## Directory Structure

```text
medusa-plugin-stories/
├── src/
│   ├── index.ts                                  # Root barrel export
│   ├── modules/
│   │   ├── story/
│   │   │   ├── index.ts                          # Module("stories", { service: StoriesModuleService })
│   │   │   ├── models/index.ts                   # 5 DML models (StoryGroup, Story, StoryHotspot, StorySticker, StoryEvent)
│   │   │   ├── service.ts                        # StoriesModuleService
│   │   │   ├── types.ts                          # DTOs, ring themes, placement zones, sticker & event types
│   │   │   └── utils/security.ts                 # sanitizeSafeUrl, sanitizeHexColor, clampPercentage
│   │   └── stories/
│   │       └── index.ts                          # Re-export alias for modules/story
│   ├── workflows/
│   │   └── index.ts                              # createStoryGroupWorkflow, createStorySlideWorkflow, recordStoryEngagementWorkflow, expireEphemeralStoriesWorkflow
│   ├── jobs/
│   │   └── expire-ephemeral-stories.ts           # Every 15m (*/15 * * * *): deactivates expired stories
│   ├── subscribers/
│   │   └── product-deleted.ts                    # Removes StoryHotspot records when a product is deleted
│   ├── api/
│   │   ├── validators.ts                         # Centralized Zod schemas (@medusajs/framework/zod)
│   │   ├── middlewares.ts                        # Route body validation bindings (defineMiddlewares)
│   │   ├── admin/stories/                        # /admin/stories, /admin/stories/[id], /groups, /hotspots, /stickers, /analytics
│   │   └── store/stories/                        # /store/stories, /store/stories/[id]/events, /store/stories/[id]/interact
│   ├── admin/
│   │   ├── components/                           # 15 decoupled presentational components (< 170 lines each)
│   │   ├── hooks/                                # useStoriesStudio & useProductStories
│   │   ├── i18n/                                 # 10 locales (en, es, fr, de, it, pt, nl, pl, tr, ar)
│   │   ├── routes/stories/                       # Overview, canvas, rings (+ @create), stickers, analytics
│   │   ├── utils/                                # Ring theme gradient & canvas coordinate helpers
│   │   └── widgets/product-stories-widget.tsx    # product.details.after widget
│   ├── sdk/index.ts                              # Typed Store & Admin SDK client
│   ├── hooks/                                    # Storefront & Admin React hooks + useStoryPlayer state machine
│   ├── ui/                                       # Storefront 9:16 React UI components
│   └── __tests__/
│       ├── register-ts-resolver.mjs
│       ├── medusa-shim.mjs
│       └── stories-plugin.spec.ts
├── package.json
└── tsconfig.json
```

---

## Engineering & Lint Invariants

1. **Module & Error Handling (`src/modules/story/`)**:
   - `STORIES_MODULE = "stories"` (100% backward-compatible with `@bambiste/medusa-stories`).
   - All public methods on `StoriesModuleService` are `async` and throw `MedusaError` from `@medusajs/framework/utils`.
2. **Workflows (`src/workflows/index.ts`)**:
   - Uses explicit string workflow & step IDs (`create-story-group`, `create-story-slide`, `record-story-engagement`, `expire-ephemeral-stories`) to satisfy `@medusajs/eslint-plugin`.
3. **Centralized API Validators (`src/api/validators.ts`)**:
   - All Zod schemas live in `src/api/validators.ts` importing `z` from `@medusajs/framework/zod` and are wired in `src/api/middlewares.ts`.
4. **Decoupled Admin UI (`src/admin/`, `< 170` lines per file)**:
   - Routes (`src/admin/routes/stories/**/page.tsx`) and Widget (`src/admin/widgets/product-stories-widget.tsx`) are thin entrypoints using `LayoutComposer`, `defineRouteConfig`, and `defineWidgetConfig`.
   - State & mutations live in `src/admin/hooks/use-stories-studio.ts` and `src/admin/hooks/use-product-stories.ts`.
   - Presentational tabs, forms, tables & cards live in `src/admin/components/`.
   - Never import `@medusajs/framework/utils` inside `src/admin/` (`@medusajs/admin-no-medusa-utils-import`).

---

## Commands

- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Lint**: `npm run lint` (`medusa lint`)
- **Run Unit Tests**: `npm test` (`node --import ./src/__tests__/register-ts-resolver.mjs --test src/__tests__/*.spec.ts`)
- **Build**: `npm run build` (`medusa plugin:build && tsc-alias -p tsconfig.json`)

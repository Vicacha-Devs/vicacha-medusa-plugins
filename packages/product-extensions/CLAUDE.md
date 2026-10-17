# CLAUDE.md — `@vicacha-devs/medusa-plugin-product-extensions`

## Project Overview

`@vicacha-devs/medusa-plugin-product-extensions` is a Medusa v2 (`2.21.x`) plugin providing a unified Product Extension, Rich Media (MP4/WebM/HLS/YouTube/Vimeo/Mux/Cloudflare Stream + 3D `.glb`/`.usdz` + PDF attachments + CSV Image Alt-Text), Variant Galleries with Base-Option Bulk Assignment, Typed Custom Attributes (9 types + SI/Imperial unit normalization + category inheritance), Hierarchical Content Sections (`tree@1` / `diff@1`), Feature Badges, Option Swatches, and Multi-Storefront Presentation Overrides.

It maintains 100% drop-in backward compatibility with `@bambiste/medusa-product-ext` (`PRODUCT_EXT_MODULE = "ProductExt"`, `ProductExtService`, `ProductExtension`, `VariantExtension`, `upsertProductExtWorkflow`, `upsertVariantExtWorkflow`).

---

## Package Exports (`package.json`)

| Import Path | Target Source | Purpose |
|---|---|---|
| `@vicacha-devs/medusa-plugin-product-extensions` | `src/index.ts` | Root barrel export (module, service, models, workflows, SDK, hooks, UI kit, i18n) |
| `@vicacha-devs/medusa-plugin-product-extensions/modules/product-ext` | `src/modules/product-ext/index.ts` | Medusa Module definition (`ProductExtModule`) |
| `@vicacha-devs/medusa-plugin-product-extensions/workflows` | `src/workflows/index.ts` | All 15 compensated workflows and steps |
| `@vicacha-devs/medusa-plugin-product-extensions/sdk` | `src/sdk/index.ts` | `createProductExtSdk` & `productExtQueryKeys` |
| `@vicacha-devs/medusa-plugin-product-extensions/hooks` | `src/hooks/index.ts` | `useStoreProductExtension`, `useVariantResolvedGallery`, `useProductAttributeFilter` |
| `@vicacha-devs/medusa-plugin-product-extensions/ui` | `src/ui/index.tsx` | Storefront React UI Kit (`ProductMediaGallery`, `VariantOptionSwatchPicker`, `ProductFeatureBadges`, `ProductSpecsTable`, `HierarchicalInfoAccordion`, `ProductAttachmentsList`) |
| `@vicacha-devs/medusa-plugin-product-extensions/types` | `src/types/index.ts` | TypeScript DTOs, inputs, and utility types |

---

## Directory Structure

```text
medusa-plugin-product-extensions/
├── src/
│   ├── index.ts                                  # Root barrel export
│   ├── modules/product-ext/
│   │   ├── index.ts                              # Module(PRODUCT_EXT_MODULE, { service: ProductExtModuleService })
│   │   ├── models/index.ts                       # 6 DML models (ProductExtension, VariantExtension, AttributeDefinition, AttributeTemplate, ProductAttributeValue, ProductFeature)
│   │   ├── service.ts                            # ProductExtModuleService (and ProductExtService alias)
│   │   ├── types.ts                              # Module DTOs, unit types, tree@1 / diff@1 schemas
│   │   └── utils/
│   │       ├── security.ts                       # SSRF validator, HTML/CSV escaping, filename sanitizer, Unicode/Cyrillic slugifier
│   │       ├── media-parser.ts                   # Multi-provider video parser, unified media gallery builder, CSV alt-text parser/exporter
│   │       ├── unit-converter.ts                 # SI/Imperial unit conversion & normalization (normalizeToSI, convertUnit)
│   │       └── content-tree.ts                   # tree@1 and diff@1 validation (DFS cycle detection) & resolution (resolveTree)
│   ├── links/
│   │   ├── index.ts
│   │   ├── product-extension-link.ts             # Product ↔ ProductExtension (1:1)
│   │   └── variant-extension-link.ts             # ProductVariant ↔ VariantExtension (1:1)
│   ├── workflows/
│   │   ├── index.ts                              # 15 compensated workflows & steps
│   │   ├── upsert-product-ext.ts                 # Re-exports upsertProductExtWorkflow
│   │   └── upsert-variant-ext.ts                 # Re-exports upsertVariantExtWorkflow
│   ├── subscribers/
│   │   ├── product-created.ts                    # Auto-applies matching category AttributeTemplate on product.created
│   │   └── product-deleted.ts                    # Purges extension & attribute data on product.deleted / product-variant.deleted
│   ├── api/
│   │   ├── validators.ts                         # Centralized Zod schemas (@medusajs/framework/zod)
│   │   ├── middlewares.ts                        # Route body validation bindings (defineMiddlewares)
│   │   ├── admin/                                # /admin/products/:product_id/* and /admin/product-ext/* routes
│   │   └── store/                                # /store/products/:product_id/extension and /store/product-ext/filter
│   ├── admin/
│   │   ├── components/                           # 12 decoupled presentational components (< 170 lines each)
│   │   ├── hooks/                                # useProductExtStudio & useProductExtWidget / useCategoryAttributesWidget
│   │   ├── i18n/                                 # 10 locales (en, es, fr, de, it, pt, nl, pl, tr, ar)
│   │   ├── routes/product-ext/                   # Overview, attributes (+ @create), templates (+ @create), features (+ @create), variant-media, image-alts
│   │   └── widgets/                              # product-ext-widget.tsx & category-attributes-widget.tsx
│   ├── sdk/index.ts                              # Store & Admin typed SDK
│   ├── hooks/index.ts                            # Storefront React hooks
│   ├── ui/index.tsx                              # Storefront React UI components
│   └── __tests__/
│       ├── register-ts-resolver.mjs
│       ├── medusa-shim.mjs
│       └── product-ext.spec.ts
├── package.json
└── tsconfig.json
```

---

## Mandatory Coding & Lint Invariants

1. **ESLint (`@medusajs/eslint-plugin` strict)**:
   - Run `npm run lint` (`medusa lint`).
   - All public service methods must be `async` and throw `MedusaError`.
   - All `createStep` and `createWorkflow` calls must have explicit kebab-case string IDs.
   - All API Zod schemas must reside in `src/api/validators.ts` (imported from `@medusajs/framework/zod`) and be bound in `src/api/middlewares.ts`.
   - Route handlers in `src/api/**/route.ts` must delegate mutations (`create*`, `update*`, `delete*`) to workflows rather than calling mutation-named service methods directly.
   - `src/admin/**` must never import `@medusajs/framework/utils`.
2. **Decoupled Admin UI Architecture (`< 170` lines per file)**:
   - Keep route `page.tsx` and widget files thin entrypoints using `LayoutComposer`, `defineRouteConfig`, or `defineWidgetConfig`.
   - Delegate state management to `src/admin/hooks/` (`useProductExtStudio`, `useProductExtWidget`, `useCategoryAttributesWidget`) and UI rendering to `src/admin/components/`.
3. **Security**:
   - Validate all external URLs via `validateExternalMediaUrl` to block SSRF (`127.0.0.1`, `localhost`, `169.254.169.254`, private RFC1918/IPv6 ranges, and `javascript:`/`file:`/`data:` schemes).
   - Never use `dangerouslySetInnerHTML`, `innerHTML`, `alert()`, `confirm()`, or `prompt()`.

---

## Commands

- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Lint**: `npm run lint` (`medusa lint`)
- **Test**: `npm test` (`node --import ./src/__tests__/register-ts-resolver.mjs --test src/__tests__/*.spec.ts`)
- **Build**: `npm run build` (`medusa plugin:build && tsc-alias -p tsconfig.json`)

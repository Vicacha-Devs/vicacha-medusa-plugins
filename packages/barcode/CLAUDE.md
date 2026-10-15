# CLAUDE.md — Complete Architecture & Contributor Reference (`medusa-plugin-barcode`)

## 1. Mission & Scope
`medusa-plugin-barcode` is a 4-in-1 **GS1 Barcode, Dynamic QR, Thermal/Sheet Price Label Printing, 10-Provider GTIN Product Lookup & Warehouse Inventory Stock-Take Suite** for **Medusa v2**.

It supersedes `@bambiste/medusa-barcode`, `@bambiste/medusa-qr`, `medusa-pos-plugin` (barcode lookup routes), and `inventory-count` while maintaining backward-compatible exports.

---

## 2. File-by-File Codebase Map

```text
medusa-plugin-barcode/
├── package.json
├── tsconfig.json
├── eslint.config.ts
├── README.md
├── CLAUDE.md
└── src/
    ├── index.ts                                        # Root package entrypoint
    ├── types/
    │   ├── index.ts                                    # Public type re-exports
    │   └── medusa-ui.d.ts                              # Ambient types for @medusajs/ui
    ├── modules/barcode/
    │   ├── index.ts                                    # Module("barcode", { service: BarcodeModuleService })
    │   ├── types.ts                                    # BARCODE_MODULE, DTOs, options, provider & label types
    │   ├── models/index.ts                             # 6 DML models (Product, Cache, Tag, Template, Session, Item)
    │   ├── service.ts                                  # BarcodeModuleService (alias BarcodeService)
    │   ├── providers/index.ts                          # BaseBarcodeProvider, ProviderRegistry & 10 providers
    │   └── utils/
    │       ├── barcode-parser.ts                       # Right-to-left GS1 Modulo-10, UPC-E, GS1-128 AI, Digital Link
    │       ├── normalize-product.ts                    # mergeNormalizedProducts & mapToMedusaCreateProduct
    │       ├── svg-renderer.ts                         # Pure SVG 1D/2D barcode & QR/DataMatrix generator
    │       ├── label-printer.ts                        # 7 thermal/A4 presets, HTML+SVG & Zebra ZPL II generator
    │       └── security.ts                             # HMAC-SHA256 signer/verifier, SSRF guard & escapeHtml
    ├── workflows/
    │   └── index.ts                                    # 6 Medusa v2 workflows with compensation/rollback
    ├── subscribers/
    │   └── product-created.ts                          # Auto-assigns GS1 EAN-13 on product/variant creation
    ├── jobs/
    │   └── purge-expired-barcode-cache.ts              # Cron job (0 */6 * * *) purging expired cache rows
    ├── api/
    │   ├── validators.ts                               # Zod schemas for all Admin & Store endpoints
    │   ├── middlewares.ts                              # Route-level validateAndTransformBody bindings
    │   ├── admin/barcodes/
    │   │   ├── route.ts                                # GET /admin/barcodes
    │   │   ├── lookup/route.ts                         # POST /admin/barcodes/lookup
    │   │   ├── create-from-barcode/route.ts            # POST /admin/barcodes/create-from-barcode
    │   │   ├── batch/route.ts                          # POST /admin/barcodes/batch
    │   │   ├── bulk-generate/route.ts                  # POST /admin/barcodes/bulk-generate
    │   │   ├── scan/route.ts                           # POST /admin/barcodes/scan
    │   │   ├── cache/route.ts                          # GET, DELETE /admin/barcodes/cache
    │   │   ├── [barcode]/route.ts                      # GET, DELETE /admin/barcodes/[barcode]
    │   │   ├── tags/route.ts                           # GET, POST /admin/barcodes/tags
    │   │   ├── tags/[id]/route.ts                      # GET, PATCH, DELETE /admin/barcodes/tags/[id]
    │   │   ├── templates/route.ts                      # GET, POST /admin/barcodes/templates
    │   │   ├── print/route.ts                          # POST /admin/barcodes/print
    │   │   ├── count-sessions/route.ts                 # GET, POST /admin/barcodes/count-sessions
    │   │   ├── count-sessions/[id]/scan/route.ts       # POST /admin/barcodes/count-sessions/[id]/scan
    │   │   └── count-sessions/[id]/apply/route.ts      # POST /admin/barcodes/count-sessions/[id]/apply
    │   └── store/barcodes/
    │       ├── [code]/route.ts                         # GET /store/barcodes/[code] (?format=json|svg)
    │       └── [code]/verify/route.ts                  # GET, POST /store/barcodes/[code]/verify
    ├── sdk/
    │   └── index.ts                                    # createBarcodeSdk & barcodeQueryKeys
    ├── hooks/
    │   └── index.ts                                    # useHidBarcodeScanner, useCameraBarcodeScanner, useStoreBarcodeResolver
    ├── ui/
    │   └── index.tsx                                   # BarcodeImage, AuthenticityVerifierBadge, StorefrontBarcodeScanner
    ├── admin/
    │   ├── routes/barcodes/page.tsx                    # Thin Admin Studio route (/app/barcodes)
    │   ├── widgets/product-barcode-widget.tsx          # Thin Product Detail Widget (product.details.after)
    │   ├── hooks/use-barcode-studio.ts                 # Studio state & actions hook
    │   ├── hooks/use-product-barcodes.ts               # Product widget state & actions hook
    │   └── components/index.tsx                        # Presentation components for all 5 Studio tabs & widget
    └── __tests__/
        ├── register-ts-resolver.mjs                    # Node module resolution hook for TypeScript tests
        ├── medusa-shim.mjs                             # Lightweight Medusa v2 framework test shim
        └── barcode.spec.ts                             # 10 unit, workflow, provider, label & security test suites
```

---

## 3. Strict Medusa v2 & Security Engineering Rules
1. **`@medusajs/eslint-plugin` Compliance**:
   - Every public method on `BarcodeModuleService` in `src/modules/barcode/service.ts` **must** be `async` and throw `MedusaError` from `@medusajs/framework/utils`.
   - Every `createStep` and `createWorkflow` in `src/workflows/index.ts` **must** have an explicit kebab-case ID matching the step/workflow name (e.g. `"lookup-and-create-product"`).
   - All API Zod schemas **must** live in `src/api/validators.ts` (importing `z` from `@medusajs/framework/zod`) and be bound in `src/api/middlewares.ts`.
   - Files under `src/admin/**` **must never** import `@medusajs/framework/utils` (`@medusajs/admin-no-medusa-utils-import`).
   - Admin routes (`src/admin/routes/**`) and widgets (`src/admin/widgets/**`) **must** remain thin entrypoints delegating state to `src/admin/hooks/**` and presentation to `src/admin/components/**`.
2. **Security Invariants**:
   - **Never** use `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, or `document.write`.
   - **Always** escape dynamic strings in SVG/HTML generators via `escapeHtml`.
   - **Always** validate external image URLs with `validateExternalImageUrl` before calling `fetch` to prevent SSRF.
   - **Always** verify HMAC-SHA256 signatures via `verifyAuthenticityHmac` (`crypto.timingSafeEqual`).

---

## 4. Verification Commands

```bash
npm run typecheck
npm run lint
npm test
```

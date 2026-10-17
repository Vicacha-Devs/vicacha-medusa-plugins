# API Routes (`src/api`)

Admin (`/admin/dian/*`) and Store (`/store/dian/*`) REST endpoints, Zod validators, and middlewares for `@vicacha-devs/medusa-plugin-dian`.

```text
api/
├── middlewares.ts                              # Binds Zod validation middlewares to admin & store routes
├── validators.ts                               # All DIAN Zod request schemas (config, resolutions, documents, fiscal profiles, NIT)
├── admin/
│   └── dian/
│       ├── config/route.ts                     # GET, PUT /admin/dian/config
│       ├── resolutions/
│       │   ├── route.ts                        # GET, POST /admin/dian/resolutions
│       │   ├── sync/route.ts                   # POST /admin/dian/resolutions/sync (DIAN GetNumberingRange SOAP)
│       │   └── [id]/route.ts                   # PATCH, DELETE /admin/dian/resolutions/:id
│       ├── documents/
│       │   ├── route.ts                        # GET, POST /admin/dian/documents
│       │   └── [id]/
│       │       ├── route.ts                    # GET /admin/dian/documents/:id
│       │       ├── credit-note/route.ts        # POST /admin/dian/documents/:id/credit-note
│       │       ├── debit-note/route.ts         # POST /admin/dian/documents/:id/debit-note
│       │       ├── radian/route.ts             # POST /admin/dian/documents/:id/radian
│       │       ├── retry/route.ts              # POST /admin/dian/documents/:id/retry
│       │       ├── xml/route.ts                # GET /admin/dian/documents/:id/xml
│       │       ├── pdf/route.ts                # GET /admin/dian/documents/:id/pdf
│       │       └── zip/route.ts                # GET /admin/dian/documents/:id/zip
│       └── fiscal-profiles/route.ts            # GET, POST /admin/dian/fiscal-profiles
└── store/
    └── dian/
        ├── validate-nit/route.ts               # POST /store/dian/validate-nit
        ├── carts/[id]/fiscal-data/route.ts     # GET, POST /store/dian/carts/:id/fiscal-data
        └── orders/[id]/documents/route.ts      # GET /store/dian/orders/:id/documents
```

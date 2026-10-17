# Providers

Native Medusa `2.21` Search Module Provider (`@medusajs/medusa/search` / `Modules.SEARCH`) implementation for Typesense.

```
providers/
└── typesense/
    ├── index.ts        ModuleProvider(Modules.SEARCH, { services: [TypesenseSearchProviderService] })
    └── service.ts      TypesenseSearchProviderService (extends AbstractSearchProviderService)
```

---

## Registration (`medusa-config.ts`)

```ts
import { defineConfig, Modules } from "@medusajs/framework/utils"

export default defineConfig({
  modules: [
    {
      resolve: Modules.SEARCH,
      options: {
        providers: [
          {
            resolve: "@vicacha-devs/medusa-plugin-typesense/providers/typesense",
            id: "typesense",
            options: {
              host: process.env.TYPESENSE_HOST || "http://127.0.0.1:8108",
              apiKey: process.env.TYPESENSE_API_KEY!,
              collectionPrefix: process.env.TYPESENSE_COLLECTION_PREFIX || "medusa",
              zeroDowntimeSwap: true,
            },
          },
        ],
      },
    },
  ],
})
```

---

## Provider Contract (`TypesenseSearchProviderService`)

- **Identifier:** `TYPESENSE_PROVIDER_IDENTIFIER = "typesense"`
- **Methods:**
  - `createIndex(indexName, options)` — Creates a physical Typesense collection and points the alias `indexName` to it.
  - `getIndex(indexName)` — Retrieves the Typesense collection schema for `indexName`.
  - `addDocuments(indexName, documents, type)` — Transforms and batch-imports documents via JSONL (`action: "upsert"`).
  - `replaceDocuments(indexName, documents, type)` — Performs a zero-downtime versioned collection build (`{indexName}_v_{timestamp}`), imports documents, swaps the alias, and prunes old physical collections.
  - `deleteDocument(indexName, document_id)` / `deleteDocuments(indexName, document_ids)` / `deleteAllDocuments(indexName)` — Deletes one, many, or all documents in `indexName`.
  - `search(indexName, query, options)` — Executes a Typesense search (`keyword`, `semantic`, or `hybrid`).
  - `updateSettings(indexName, settings)` — Updates collection schema fields, synonyms, and curations/overrides.

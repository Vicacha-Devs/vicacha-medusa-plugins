# Workflows

Medusa workflows (`@medusajs/framework/workflows-sdk`) that execute full zero-downtime collection alias rebuilds, incremental document upserts, and compensated document deletions in `@vicacha-devs/medusa-plugin-typesense`.

```
workflows/
├── index.ts                Barrel exporting all 3 workflows and steps
├── sync-entities.ts        syncEntitiesToTypesenseWorkflow (zero-downtime rebuild or incremental graph sync)
├── upsert-documents.ts     upsertTypesenseDocumentsWorkflow (with rollback compensation)
└── delete-documents.ts     deleteTypesenseDocumentsWorkflow (snapshots & restores deleted docs on rollback)
```

---

## Workflow Index

| Workflow ID | Export | Step IDs | Compensation Behavior | Trigger |
| --- | --- | --- | --- | --- |
| `sync-entities-to-typesense-workflow` | `syncEntitiesToTypesenseWorkflow` | `resolve-typesense-entities-step`, `execute-typesense-entity-sync-step` | If a zero-downtime rebuild fails mid-flight, drops the temporary physical collection while keeping the live alias untouched | `POST /admin/typesense/collections`, `POST /admin/typesense/collections/:entity/sync`, nightly cron job |
| `upsert-typesense-documents-workflow` | `upsertTypesenseDocumentsWorkflow` | `upsert-typesense-documents-step` | Restores pre-existing documents to their previous snapshot and deletes newly inserted documents | `product.*`, `product-category.*`, `product-collection.*` subscribers & `POST /admin/typesense/documents/:entity/:id` |
| `delete-typesense-documents-workflow` | `deleteTypesenseDocumentsWorkflow` | `delete-typesense-documents-step` | Re-imports the pre-deletion document snapshots back into Typesense on workflow rollback | `*.deleted` subscribers & `DELETE /admin/typesense/documents/:entity/:id` |

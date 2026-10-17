# Entity Links & ERP Mappings (`mpo_erp_mapping`)

Unlike intra-Medusa module links that join two internal PostgreSQL tables via `defineLink`, an external ERP integration maps **Medusa string IDs (`prod_*`, `variant_*`, `order_*`, `cus_*`, `sloc_*`, `iitem_*`)** to **remote Odoo integer primary keys (`product.template`, `product.product`, `sale.order`, `account.move`, `res.partner`, `stock.warehouse`)** alongside sync direction, SHA-256 loop-prevention checksums, and last-synced timestamps.

`medusa-plugin-odoo` manages all cross-system associations through the dedicated **`ErpMapping` (`mpo_erp_mapping`)** DML model (`src/modules/odoo/models/index.ts`) rather than rigid join tables.

---

## Why `ErpMapping` (`mpo_erp_mapping`) Instead of Static Join Tables

1. **External Integer IDs & Model Names**: Odoo records live in an external PostgreSQL database managed by Odoo ORM and are identified by `(odoo_model, odoo_id)` pairs (e.g. `("product.template", 42)` or `("sale.order", 108)`).
2. **Circular-Sync Loop Prevention**: Every mapping stores `external_checksum` (computed via `computeExternalChecksum` in `src/modules/odoo/utils/security.ts`), allowing `OdooModuleService` to detect whether an entity actually changed before firing an outbound RPC call.
3. **Directional Control per Entity**: Individual mappings track `sync_direction` (`"odoo_to_medusa"`, `"medusa_to_odoo"`, or `"bidirectional"`) and `status` (`"active"`).
4. **Rich ERP Metadata**: Order mappings store linked invoice and payment IDs (`{ odooInvoiceId, odooPaymentId }`) directly in `metadata` without requiring extra schema migrations.

---

## Mapped Entity Types (`OdooEntityType`)

| `entity_type` | Medusa Entity (`medusa_id`) | Odoo Model (`odoo_model`) | Odoo ID (`odoo_id`) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `"product"` | Product (`prod_*`) | `product.template` | `number` | Links a Medusa Product to an Odoo Product Template. |
| `"variant"` | ProductVariant (`variant_*`) | `product.product` | `number` | Links a Medusa Variant to a specific Odoo Product Variant (`sku` / `barcode`). |
| `"inventory"` | InventoryItem / Variant (`iitem_*` / `variant_*`) | `stock.quant` | `number` | Tracks stock quant linkage across warehouses. |
| `"warehouse"` | StockLocation (`sloc_*`) | `stock.warehouse` | `number` | Maps a Medusa Stock Location to an Odoo Warehouse (`lot_stock_id`). |
| `"order"` | Order (`order_*`) | `sale.order` | `number` | Links a Medusa Order to an Odoo Sales Order; stores `odooInvoiceId` in `metadata`. |
| `"invoice"` | Order (`order_*`) | `account.move` | `number` | Links a Medusa Order to a posted Odoo Customer Invoice. |
| `"customer"` | Customer (`cus_*`) | `res.partner` | `number` | Links a Medusa Customer to an Odoo Partner record. |
| `"category"` | ProductCategory / Collection | `product.category` | `number` | Maps Medusa catalog groupings to Odoo internal categories. |

---

## `ErpMapping` Schema (`mpo_erp_mapping`)

```ts
export const ErpMapping = model
  .define("mpo_erp_mapping", {
    id: model.id().primaryKey(),
    entity_type: model.text().searchable(),
    medusa_id: model.text().searchable(),
    odoo_id: model.number(),
    odoo_model: model.text().default(""),
    sync_direction: model.text().default("bidirectional"),
    external_checksum: model.text().nullable(),
    status: model.text().default("active"),
    last_synced_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["entity_type", "medusa_id"],
      name: "IDX_mpo_erp_mapping_entity_medusa",
    },
    {
      on: ["entity_type", "odoo_id"],
      name: "IDX_mpo_erp_mapping_entity_odoo",
    },
  ])
```

---

## Querying & Upserting Mappings

### 1. Via REST API (`/admin/odoo/mappings`)

```bash
# Query mapping for a specific Medusa order
GET /admin/odoo/mappings?entity_type=order&medusa_id=order_01J...

# Manually link a Medusa product to an Odoo product.template ID
POST /admin/odoo/mappings
Content-Type: application/json
{
  "entityType": "product",
  "medusaId": "prod_01J...",
  "odooId": 42,
  "odooModel": "product.template",
  "direction": "bidirectional"
}
```

### 2. Via Typed SDK & React Hooks

```ts
import { useOdooMappings } from "@vicacha-devs/medusa-plugin-odoo/hooks"

const { data } = useOdooMappings({
  entity_type: "product",
  medusa_id: productId,
})
const mapping = data?.mappings?.[0]
```

### 3. Inside Backend Services or Workflows (`OdooModuleService`)

```ts
const odooService = container.resolve(ODOO_MODULE) as OdooModuleService

// List mappings by Medusa ID
const mappings = await odooService.listMappings({
  entity_type: "variant",
  medusa_id: variantId,
})

// Upsert a mapping
await odooService.upsertMapping({
  entityType: "variant",
  medusaId: variantId,
  odooId: 105,
  odooModel: "product.product",
  direction: "bidirectional",
})
```

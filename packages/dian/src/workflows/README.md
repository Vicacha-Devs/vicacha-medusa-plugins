# Workflows & Subscribers (`src/workflows` & `src/subscribers`)

Compensated Medusa v2 workflows and event subscribers for `@vicacha-devs/medusa-plugin-dian`.

## Workflows (`src/workflows/index.ts`)

| Workflow ID | Step ID | Description |
| :--- | :--- | :--- |
| `dian-emit-invoice` | `dian-emit-invoice-step` | Emits an Electronic Invoice (`01` / `02` / `03`) with rollback compensation if downstream steps fail |
| `dian-emit-credit-note` | `dian-emit-credit-note-step` | Emits a Nota Crédito Electrónica (`91`) linked to the original invoice CUFE |
| `dian-emit-debit-note` | `dian-emit-debit-note-step` | Emits a Nota Débito Electrónica (`92`) linked to the original invoice CUFE |
| `dian-emit-pos-equivalent` | `dian-emit-pos-step` | Emits a Documento Equivalente POS (`20` — Resolución 000165) |
| `dian-emit-radian-event` | `dian-emit-radian-step` | Registers a RADIAN title-value event (`030`–`034`) |
| `dian-upsert-fiscal-profile` | `dian-upsert-fiscal-profile-step` | Validates NIT Modulo-11 DV and B2B Legal Client link before upserting a fiscal profile |

## Event Subscribers (`src/subscribers/`)

- **`order-placed.ts` (`order.placed`)**: Automatically emits a Factura Electrónica (`01`) or Documento Equivalente POS (`20`) when `auto_emit_on_order_placed` is enabled in `DianConfig`.
- **`order-canceled.ts` (`order.canceled`)**: Automatically emits a Concept `2` (*Anulación de factura electrónica*) Nota Crédito (`91`) when `auto_credit_note_on_cancel` is enabled.
- **`refund-created.ts` (`payment.refund_created`)**: Automatically emits a partial or full Nota Crédito (`91`) when `auto_credit_note_on_refund` is enabled.

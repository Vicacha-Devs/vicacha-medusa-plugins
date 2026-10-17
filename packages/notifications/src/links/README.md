# Module Links & Loose Entity Associations

How `@vicacha-devs/medusa-plugin-notifications` associates notification records with Medusa core entities (`Order`, `Customer`, `Fulfillment`, `Cart`) and optional sibling plugins (`medusa-plugin-documents`, B2B modules) while maintaining strict module isolation.

```sh
links/
└── README.md       Documentation on loose entity associations and optional custom module links
```

---

## Loose Coupled Association Strategy (Zero Cross-Module FK Lock-In)

Rather than enforcing hard foreign-key links that would couple `notificationsModuleService` to optional modules or prevent log retention pruning when orders/carts are archived, `medusa-plugin-notifications` associates entities using **indexed string identifiers and customer metadata**:

| Model / Storage | Field | Associated Entity | Purpose |
| --- | --- | --- | --- |
| `mpn_delivery_log` | `entity_id` | `order.id`, `fulfillment.id`, `cart.id`, `document.id`, `product.id` | Associates delivery logs with any Medusa or custom entity. Queried by the Order Details widget (`GET /admin/mpn/logs?entity_id=order_01J...`). |
| `mpn_delivery_log` | `recipient_masked` & `recipient_hash` | Customer email, E.164 phone, or Telegram `chat_id` | Allows privacy-safe lookup and audit verification without storing raw PII in the delivery ledger. |
| `mpn_consent_record` | `customer_id` & `identifier` | `customer.id` + E.164 phone or Telegram `chat_id` | Links TCPA/10DLC `JOIN`/`STOP` and Telegram `/start <customer_id>` opt-ins to a Medusa customer. |
| `mpn_broadcast_campaign` | `customer_group_id` | `customer_group.id` | Associates a broadcast campaign with a Medusa Customer Group. |
| `customer.metadata` | `telegram_chat_id`, `telegram_username`, `whatsapp_opt_in`, `sms_opt_in` | `Customer` | Populated automatically by `POST /store/mpn/webhooks/telegram` (`/start <customer_id>`) and read by `resolveRecipientForRule` during event dispatch. |
| `order.metadata` | `company_id`, `accounting_email`, `accounting_phone`, `telegram_chat_id` | `Order` / B2B Company | Read by `resolveB2BNotificationContacts` (`src/modules/notifications/integrations/documents-and-b2b-resolver.ts`) when `recipient_rule === "b2b_accounting"`. |

---

## Querying Across Entities (`query.graph`)

When an event fires (e.g., `order.placed` or `shipment.created`), `hydrateEntityContextData` in `src/workflows/index.ts` uses `ContainerRegistrationKeys.QUERY` (`query.graph`) to hydrate the full entity graph (`order.*`, `customer.*`, `items.*`, `shipping_address.*`, `billing_address.*`, `fulfillment.labels.*`) on the fly without requiring a custom link table.

---

## Defining Optional Custom Links (`defineLink`)

If your host Medusa application wants to traverse `mpn_consent_record` or `mpn_delivery_log` directly through `query.graph` from `Customer` or `Order`, you can add a link file in `src/links/` using `defineLink`:

```ts
import CustomerModule from "@medusajs/medusa/customer"
import { defineLink } from "@medusajs/framework/utils"
import NotificationsModule from "../modules/notifications"

export default defineLink(
  CustomerModule.linkable.customer,
  {
    linkable: NotificationsModule.linkable.mpnConsentRecord,
    isList: true,
  }
)
```

After adding a link file, sync the link table in the host application:

```bash
npx medusa db:migrate
```

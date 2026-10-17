# `@vicacha-devs/medusa-plugin-dian`

Colombian **DIAN Electronic Invoicing (*Facturación Electrónica DIAN — Anexo Técnico 1.9 & Resolución 000165*)** plugin for **Medusa v2**.

Supports both **Native "Software Propio"** transmission (UBL 2.1 XML, SHA-384 CUFE/CUDE, XAdES-EPES digital signature, DIAN SOAP Web Services, and RADIAN events) and **Pluggable Colombian Proveedores Tecnológicos / ERPs** (`siigo`, `alegra`, `dataico`, `facturatech`).

> **Medusa compatibility:** `>= 2.21.0`

---

## Contents

- [Key Features](#key-features)
- [Ecosystem & Legal Invariants](#ecosystem--legal-invariants)
- [Installation & Configuration](#installation--configuration)
- [Architecture](#architecture)
- [Data Models (`dian` Module)](#data-models-dian-module)
- [Workflows](#workflows)
- [REST API](#rest-api)
- [Admin UI & Widgets](#admin-ui--widgets)
- [Development & Testing](#development--testing)
- [License](#license)

---

## Key Features

1. **Hybrid Transmission Engine**:
   - **Native "Software Propio" (`mode: "native"`)**: Generates compliant UBL 2.1 XML (`Invoice`, `CreditNote`, `DebitNote`, `AttachedDocument`), computes **CUFE / CUDE (`SHA-384`)**, signs XML with **XAdES-EPES** (PKCS#12 `.p12`/`.pfx`), and communicates with DIAN Web Services (`SendBillSync`, `SendTestSetAsync`, `GetStatus`, `GetNumberingRange`, `GetAcquirer`).
   - **Pluggable Provider Adapter (`mode: "provider"`)**: Built-in adapters for **Siigo**, **Alegra**, **Dataico**, and **FacturaTech**.
2. **Complete DIAN Document Suite**:
   - **Factura Electrónica de Venta (`01` Nacional, `02` Exportación, `03` Contingencia)** with CUFE.
   - **Nota Crédito Electrónica (`91`) & Nota Débito Electrónica (`92`)** with CUDE and mandatory `BillingReference` to the original invoice CUFE.
   - **Documento Equivalente Electrónico POS (`20` — Tiquete POS Electrónico, Resolución 000165)** with CUDE and 80mm/58mm thermal QR representation.
   - **RADIAN Events (`030`, `031`, `032`, `033`, `034`)** for title-value (*Título Valor*) lifecycle tracking.
3. **Colombian Tax & Modulo-11 Engine**:
   - DIAN Modulo-11 check digit (`calcularDigitoVerificacion`) with prime weights `[3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]`.
   - Automatic separation of taxes (`IVA 01`, `INC 04`, `ICA 03`) and Colombian withholdings (*Retenciones*: `ReteFuente 06`, `ReteIVA 05`, `ReteICA 07`).
   - Formulario 1876 numbering resolution validation (expiry date, range exhaustion, and low-folio alerts).

---

## Ecosystem & Legal Invariants

1. **Named Electronic Invoice Requires a Registered Client**:
   - Any buyer requesting a named Electronic Invoice (`requires_electronic_invoice: true` or non-`222222222222` identification) must be a registered Medusa `Customer` (`customer_id`) with both a valid **email** (`ElectronicMail`) and **phone** (`Telephone`).
   - Anonymous buyers automatically default to **Consumidor Final (`222222222222`, `tipo_persona: "2"`, `tipo_documento: "13"`)**.
2. **Legal Client (`Persona Jurídica = "1"`) Requires `@vicacha-devs/medusa-plugin-b2b`**:
   - Registering or invoicing a Legal Client (*Persona Jurídica* / NIT `31` + Modulo-11 DV) strictly requires `@vicacha-devs/medusa-plugin-b2b` (`company` module) and a valid `b2b_company_id`.
3. **PDF Generation (*Representación Gráfica*) Requires `@vicacha-devs/medusa-plugin-documents`**:
   - Generating the *Representación Gráfica* PDF (A4 Invoice, Credit/Debit Note, or 80mm/58mm POS Receipt with DIAN QR code, CUFE/CUDE, Resolution 1876 text, NIT+DV, and Retenciones) strictly delegates to `@vicacha-devs/medusa-plugin-documents` (`documents` module).

---

## Installation & Configuration

```bash
pnpm add @vicacha-devs/medusa-plugin-dian
```

Register in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@vicacha-devs/medusa-plugin-dian",
      options: {},
    },
  ],
})
```

Run database migrations:

```bash
npx medusa db:migrate
```

---

## Architecture

```text
src/
├── modules/dian/
│   ├── index.ts                # DIAN_MODULE = "dian"
│   ├── service.ts              # DianModuleService (emission, notes, POS, RADIAN, PDF, ZIP, resolutions)
│   ├── models/                 # DianConfig, DianResolution, DianDocument, DianCustomerFiscalProfile
│   ├── engines/                # nit-dv, cufe, ubl-builder, xades-signer, soap-client, radian-builder, pdf-generator
│   └── providers/              # Pluggable adapters (siigo, alegra, dataico, facturatech)
├── workflows/                  # emitDianInvoiceWorkflow, emitDianCreditNoteWorkflow, emitDianPosWorkflow, etc.
├── subscribers/                # order-placed, order-canceled, refund-created event subscribers
├── api/                        # /admin/dian/* and /store/dian/* REST routes + Zod validators
├── admin/                      # Multi-route Admin UI (/dian, /dian/resolutions, /dian/fiscal-profiles, /settings/dian) + Order Widget
├── sdk/                        # Typed Admin & Storefront SDK client
└── hooks/                      # React hooks for storefront & admin consumption
```

---

## Data Models (`dian` Module)

| Model | Description |
| :--- | :--- |
| `DianConfig` | Emisor (*Obligado a Facturar Electrónicamente — OFE*) NIT, DV, Software ID/PIN, Clave Técnica, Ambiente (`1` Producción / `2` Habilitación), XAdES certificate, and provider credentials. |
| `DianResolution` | Formulario 1876 authorization numbers, prefix (`SETT`, `FE`, `POS`, `NC`, `ND`), range (`from_number` – `to_number`), `current_number`, and validity dates. |
| `DianDocument` | Emitted electronic documents (`01`, `02`, `03`, `91`, `92`, `20`), `cufe_cude`, status (`draft`, `validated`, `rejected`, `contingency_03`), UBL XML, `ApplicationResponse` XML, PDF URL, and RADIAN status. |
| `DianCustomerFiscalProfile` | Buyer fiscal identity (`tipo_persona`, `tipo_documento`, `numero_documento`, `dv`, `razon_social`, `regimen_fiscal`, `responsabilidades_fiscales`, `b2b_company_id`). |

---

## Workflows

| Workflow ID | Description |
| :--- | :--- |
| `dian-emit-invoice` | Emits an Electronic Invoice (`01` / `02` / `03`) with atomic folio reservation and rollback compensation |
| `dian-emit-credit-note` | Emits a Nota Crédito (`91`) referencing the original invoice's CUFE |
| `dian-emit-debit-note` | Emits a Nota Débito (`92`) referencing the original invoice's CUFE |
| `dian-emit-pos-equivalent` | Emits a Documento Equivalente POS (`20` — Resolución 000165) |
| `dian-emit-radian-event` | Emits a RADIAN event (`030`–`034`) on a validated invoice |
| `dian-upsert-fiscal-profile` | Validates NIT Modulo-11 DV and B2B Legal Client link before upserting a fiscal profile |

---

## REST API

### Admin Routes (`/admin/dian/*`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` / `PUT` | `/admin/dian/config` | Retrieve or update Emisor OFE configuration (redacts secrets on `GET`) |
| `GET` / `POST` | `/admin/dian/resolutions` | List or create Formulario 1876 numbering resolutions |
| `POST` | `/admin/dian/resolutions/sync` | Synchronize active resolutions from DIAN `GetNumberingRange` SOAP service |
| `PATCH` / `DELETE` | `/admin/dian/resolutions/:id` | Update or delete a numbering resolution |
| `GET` / `POST` | `/admin/dian/documents` | List electronic documents (with KPI summary) or emit a new Invoice / POS document |
| `GET` | `/admin/dian/documents/:id` | Retrieve document details |
| `POST` | `/admin/dian/documents/:id/credit-note` | Emit a Nota Crédito (`91`) against a validated invoice |
| `POST` | `/admin/dian/documents/:id/debit-note` | Emit a Nota Débito (`92`) against a validated invoice |
| `POST` | `/admin/dian/documents/:id/radian` | Register a RADIAN event (`030`–`034`) |
| `POST` | `/admin/dian/documents/:id/retry` | Retry transmission of a rejected/contingency document |
| `GET` | `/admin/dian/documents/:id/xml` | Download signed UBL 2.1 XML or `AttachedDocument` |
| `GET` | `/admin/dian/documents/:id/pdf` | Generate/download *Representación Gráfica* PDF via `@vicacha-devs/medusa-plugin-documents` |
| `GET` | `/admin/dian/documents/:id/zip` | Download DIAN-compliant `.zip` (`z...zip` containing `fv...xml` + `.pdf`) |
| `GET` / `POST` | `/admin/dian/fiscal-profiles` | List or upsert Customer & B2B Legal Client fiscal profiles |

### Store Routes (`/store/dian/*`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/store/dian/validate-nit` | Computes Modulo-11 DV and optionally queries DIAN `GetAcquirer` |
| `GET` / `POST` | `/store/dian/carts/:id/fiscal-data` | Read or attach Colombian fiscal profile data to a checkout cart |
| `GET` | `/store/dian/orders/:id/documents` | Retrieve validated electronic documents (`cufe_cude`, `qr_url`, `pdf_url`) for an order |

---

## Admin UI & Widgets

- `/dian` (`src/admin/routes/dian/page.tsx`): Overview KPI cards (`DianOverviewSection`) + Electronic Documents table (`DianDocumentsTableSection`).
- `/dian/resolutions` (`src/admin/routes/dian/resolutions/page.tsx`): Formulario 1876 Numbering Resolutions (`DianResolutionsSection`) + DIAN SOAP sync.
- `/dian/fiscal-profiles` (`src/admin/routes/dian/fiscal-profiles/page.tsx`): Client & B2B Legal Client fiscal profiles (`DianFiscalProfilesSection`).
- `/settings/dian` (`src/admin/routes/settings/dian/page.tsx`): Emisor OFE configuration (`DianSettingsEmisorSection`) + Tax & Retenciones automation (`DianSettingsTaxAutomationSection`).
- `order.details.after` Widget (`src/admin/widgets/order-dian-widget.tsx`): Order-level DIAN emission, Credit Note modal, and XML/PDF/ZIP downloads (`DianOrderWidgetSection`).

---

## Development & Testing

```bash
# Lint (0 warnings, 0 errors)
npm run lint

# Run unit & security PoC test suite
npm test

# Build plugin
npm run build
```

---

## License

MIT © Vicacha Devs

# CLAUDE.md — `@vicacha-devs/medusa-plugin-dian`

## Project Overview

`@vicacha-devs/medusa-plugin-dian` is a Colombian **DIAN Electronic Invoicing (*Facturación Electrónica DIAN — Anexo Técnico 1.9 & Resolución 000165*)** plugin for **Medusa v2**, supporting both Native "Software Propio" (UBL 2.1 XML, SHA-384 CUFE/CUDE, XAdES-EPES signature, DIAN SOAP WcfDianCustomerServices, RADIAN events) and pluggable Colombian Proveedores Tecnológicos (`siigo`, `alegra`, `dataico`, `facturatech`).

---

## Core Domain & Ecosystem Rules

1. **Named Electronic Invoice Requires a Registered Client**:
   - Buyers requesting a named Electronic Invoice must be registered Medusa Customers (`customer_id`) with both email (`ElectronicMail`) and phone (`Telephone`). Anonymous buyers default to Consumidor Final (`222222222222`).
2. **Legal Client (`Persona Jurídica = "1"`) Requires `@vicacha-devs/medusa-plugin-b2b`**:
   - Registering or invoicing a Legal Client (*Persona Jurídica*, NIT `31` + Modulo-11 DV) strictly requires `@vicacha-devs/medusa-plugin-b2b` (`company` module) and a valid `b2b_company_id`.
3. **PDF Generation Requires `@vicacha-devs/medusa-plugin-documents`**:
   - Generating the *Representación Gráfica* PDF (A4 Invoice, Credit/Debit Note, or 80mm/58mm POS thermal ticket) strictly requires `@vicacha-devs/medusa-plugin-documents` (`documents` module).

---

## Mandatory Coding & Lint Invariants

1. **ESLint (`@medusajs/eslint-plugin` strict)**:
   - Run `npm run lint` (`eslint "src/**/*.{ts,tsx}" --max-warnings=0`).
   - Every public method on `DianModuleService` must be `async` and throw `MedusaError`.
   - Every `createStep` and `createWorkflow` must have an explicit kebab-case string ID.
   - All API Zod schemas must live in `src/api/validators.ts` and be registered in `src/api/middlewares.ts`.
   - `src/admin/**` must never import `@medusajs/framework/utils`.
2. **Security & XML Hardening**:
   - Escape all dynamic values interpolated into UBL 2.1 XML and SOAP envelopes via `escapeXml()`.
   - Disable `DOCTYPE` / external entities (`XXE`) when parsing DIAN SOAP XML responses.
   - Validate all external provider URLs via `assertSafeExternalUrl()` to prevent SSRF.
   - Redact `certificate_p12_base64`, `certificate_password`, `software_pin`, `clave_tecnica`, and `provider_api_secret` on config read endpoints.
3. **Admin Modularity**:
   - Keep all Admin routes, widgets, and section components under `170` lines per file.

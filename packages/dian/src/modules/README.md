# DIAN Module (`src/modules/dian`)

Core data models, cryptographic/UBL 2.1 engines, pluggable provider adapters, and `DianModuleService` for `@vicacha-devs/medusa-plugin-dian`.

```text
modules/dian/
├── index.ts                        # Exports DIAN_MODULE = "dian" and Module() definition
├── service.ts                      # DianModuleService extending MedusaService
├── models/
│   ├── index.ts
│   ├── dian-config.ts              # DianConfig (Emisor OFE settings, XAdES cert, provider config)
│   ├── dian-resolution.ts          # DianResolution (Formulario 1876 prefixes, ranges, validity)
│   ├── dian-document.ts            # DianDocument (Invoices, Credit/Debit Notes, POS, RADIAN state)
│   └── dian-fiscal-profile.ts      # DianCustomerFiscalProfile (Adquirente NIT/DV, B2B company link)
├── engines/
│   ├── nit-dv.ts                   # Modulo-11 check digit calculator & NIT normalizer
│   ├── cufe.ts                     # SHA-384 CUFE / CUDE & DIAN QR URL builder
│   ├── ubl-builder.ts              # UBL 2.1 XML generator (Invoice, CreditNote, DebitNote, AttachedDocument)
│   ├── xades-signer.ts             # XAdES-EPES XML digital signature engine
│   ├── soap-client.ts              # DIAN WcfDianCustomerServices SOAP 1.2 client + XXE-safe parser
│   ├── radian-builder.ts           # RADIAN ApplicationResponse (030–034) builder
│   ├── pdf-generator.ts            # Representación Gráfica payload builder for @vicacha-devs/medusa-plugin-documents
│   └── zip-packager.ts             # DIAN-compliant ZIP archive builder (fv*.xml + *.pdf)
└── providers/
    └── provider-adapter.ts         # Pluggable adapters for Siigo, Alegra, Dataico, and FacturaTech
```

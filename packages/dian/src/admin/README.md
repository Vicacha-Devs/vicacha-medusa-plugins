# `@vicacha-devs/medusa-plugin-dian` — Admin Extensions

Multi-route Medusa v2 Admin extensions for Colombian DIAN Electronic Invoicing (*Facturación Electrónica DIAN*), built with `LayoutComposer` (`CORE_LAYOUT_IDS.SINGLE_COLUMN`) and decoupled single-responsibility subcomponents:

- `/dian` (`src/admin/routes/dian/page.tsx`): Overview KPI cards (`DianOverviewSection`) + Electronic Documents table (`DianDocumentsTableSection`).
- `/dian/resolutions` (`src/admin/routes/dian/resolutions/page.tsx`): Formulario 1876 Numbering Resolutions (`DianResolutionsSection`) + DIAN `GetNumberingRange` SOAP sync.
- `/dian/fiscal-profiles` (`src/admin/routes/dian/fiscal-profiles/page.tsx`): Client & B2B Legal Client (`@vicacha-devs/medusa-plugin-b2b`) fiscal profiles (`DianFiscalProfilesSection`).
- `/settings/dian` (`src/admin/routes/settings/dian/page.tsx`): Emisor OFE configuration (`DianSettingsEmisorSection`) + Auto-emission & Retenciones (`DianSettingsTaxAutomationSection`).
- `order.details.after` Widget (`src/admin/widgets/order-dian-widget.tsx`): Order-level DIAN emission & downloads (`DianOrderWidgetSection`).

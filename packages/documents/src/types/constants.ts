export const DOCUMENTS_MODULE = "documentsModuleService"

export const DOCUMENT_TYPES = [
  "invoice",
  "packing_slip",
  "credit_note",
  "receipt",
] as const

export const DOCUMENT_STATUSES = ["draft", "generated", "failed"] as const

export const SIGNATURE_STATUSES = [
  "pending",
  "sent",
  "opened",
  "completed",
  "declined",
  "expired",
] as const

export const TEMPLATE_ENGINES = ["react-pdf", "handlebars"] as const

export const PAGE_SIZES = ["A4", "LETTER", "80MM", "58MM"] as const

export const PAGE_ORIENTATIONS = ["portrait", "landscape"] as const

export const BUILTIN_PRESETS = [
  "clean",
  "classic",
  "compact",
  "packing_slip",
  "credit_note",
  "pos_80mm",
  "pos_58mm",
] as const

export const TEMPLATE_PRESETS = [
  "clean",
  "classic",
  "compact",
  "packing_slip",
  "credit_note",
  "pos_80mm",
  "pos_58mm",
] as const

export const PACKING_SLIP_PRESETS = [
  "packing_slip",
  "clean",
  "compact",
] as const

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "pl",
  "de",
  "fr",
  "pt",
  "it",
  "nl",
  "tr",
  "ar",
] as const

export const STORE_DOCUMENT_PDF_TYPES = [
  "invoice",
  "packing-slip",
  "credit-note",
  "receipt",
  "signed",
] as const

export const SUPPORTED_UI_LOCALES = [
  { code: "en", label: "English (EN)" },
  { code: "es", label: "Español (ES)" },
  { code: "de", label: "Deutsch (DE)" },
  { code: "fr", label: "Français (FR)" },
  { code: "pt", label: "Português (PT)" },
  { code: "it", label: "Italiano (IT)" },
  { code: "nl", label: "Nederlands (NL)" },
  { code: "pl", label: "Polski (PL)" },
  { code: "tr", label: "Türkçe (TR)" },
  { code: "ar", label: "العربية (AR)" },
] as const

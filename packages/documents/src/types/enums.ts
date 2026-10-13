export const EDocumentType = {
  INVOICE: "invoice",
  PACKING_SLIP: "packing_slip",
  CREDIT_NOTE: "credit_note",
  RECEIPT: "receipt",
} as const
export type EDocumentType = (typeof EDocumentType)[keyof typeof EDocumentType]

export const EDocumentStatus = {
  DRAFT: "draft",
  GENERATED: "generated",
  FAILED: "failed",
} as const
export type EDocumentStatus =
  (typeof EDocumentStatus)[keyof typeof EDocumentStatus]

export const ESignatureStatus = {
  PENDING: "pending",
  SENT: "sent",
  OPENED: "opened",
  COMPLETED: "completed",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const
export type ESignatureStatus =
  (typeof ESignatureStatus)[keyof typeof ESignatureStatus]

export const ETemplateEngine = {
  REACT_PDF: "react-pdf",
  HANDLEBARS: "handlebars",
} as const
export type ETemplateEngine =
  (typeof ETemplateEngine)[keyof typeof ETemplateEngine]

export const EPageSize = {
  A4: "A4",
  LETTER: "LETTER",
  POS_80MM: "80MM",
  POS_58MM: "58MM",
} as const
export type EPageSize = (typeof EPageSize)[keyof typeof EPageSize]

export const EPageOrientation = {
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
} as const
export type EPageOrientation =
  (typeof EPageOrientation)[keyof typeof EPageOrientation]

export const EBuiltinPreset = {
  CLEAN: "clean",
  CLASSIC: "classic",
  COMPACT: "compact",
  PACKING_SLIP: "packing_slip",
  CREDIT_NOTE: "credit_note",
  POS_80MM: "pos_80mm",
  POS_58MM: "pos_58mm",
} as const
export type EBuiltinPreset =
  (typeof EBuiltinPreset)[keyof typeof EBuiltinPreset]

export const EDianDocumentType = {
  INVOICE_NATIONAL: "01",
  INVOICE_EXPORT: "02",
  INVOICE_CONTINGENCY_ISSUER: "03",
  INVOICE_CONTINGENCY_DIAN: "04",
  POS_EQUIVALENT: "20",
  CREDIT_NOTE: "91",
  DEBIT_NOTE: "92",
} as const
export type EDianDocumentType =
  (typeof EDianDocumentType)[keyof typeof EDianDocumentType]

export const EDianDocumentStatus = {
  DRAFT: "draft",
  PENDING: "pending",
  VALIDATED: "validated",
  REJECTED: "rejected",
  CONTINGENCY: "contingency",
  CANCELLED: "cancelled",
} as const
export type EDianDocumentStatus =
  (typeof EDianDocumentStatus)[keyof typeof EDianDocumentStatus]

export const EDianEnvironment = {
  PRODUCTION: "1",
  HABILITATION: "2",
} as const
export type EDianEnvironment =
  (typeof EDianEnvironment)[keyof typeof EDianEnvironment]

export const EDianOrganizationType = {
  LEGAL_ENTITY: "1",
  NATURAL_PERSON: "2",
} as const
export type EDianOrganizationType =
  (typeof EDianOrganizationType)[keyof typeof EDianOrganizationType]

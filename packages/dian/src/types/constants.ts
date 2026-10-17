export const DIAN_MODULE = "dian"
export const DOCUMENTS_MODULE_KEY = "documents"
export const B2B_COMPANY_MODULE_KEY = "company"

export const DIAN_DOCUMENT_TYPES = [
  "01", // Factura Electrónica de Venta (Nacional)
  "02", // Factura Electrónica de Venta de Exportación
  "03", // Factura por Contingencia Facturador
  "04", // Factura por Contingencia DIAN
  "20", // Documento Equivalente Electrónico - Tiquete de Máquina Registradora con Sistema POS
  "91", // Nota Crédito Electrónica
  "92", // Nota Débito Electrónica
] as const

export const DIAN_DOCUMENT_STATUSES = [
  "draft",
  "pending",
  "validated",
  "rejected",
  "contingency",
  "cancelled",
] as const

export const DIAN_ENVIRONMENTS = [
  "1", // Producción
  "2", // Habilitación / Pruebas
] as const

export const DIAN_PROVIDER_TYPES = [
  "native_soap", // Software Propio DIAN SOAP Web Services
  "siigo",
  "alegra",
  "dataico",
  "facturatech",
] as const

export const DIAN_ORGANIZATION_TYPES = [
  "1", // Persona Jurídica (requires @vicacha-devs/medusa-plugin-b2b)
  "2", // Persona Natural (requires Medusa Customer with email & phone)
] as const

export const DIAN_IDENTIFICATION_TYPES = [
  "11", // Registro civil
  "12", // Tarjeta de identidad
  "13", // Cédula de ciudadanía
  "21", // Tarjeta de extranjería
  "22", // Cédula de extranjería
  "31", // NIT
  "41", // Pasaporte
  "42", // Documento de identificación extranjero
  "47", // PEP (Permiso Especial de Permanencia)
  "48", // PPT (Permiso Protección Temporal)
  "50", // NIT de otro país
  "91", // NUIP
] as const

export const DIAN_TAX_REGIMES = [
  "48", // Responsable del Impuesto sobre las Ventas - IVA
  "49", // No responsable de IVA
] as const

export const DIAN_FISCAL_RESPONSIBILITIES = [
  "O-13", // Gran contribuyente
  "O-15", // Autorretenedor
  "O-23", // Agente de retención IVA
  "O-47", // Régimen simple de tributación - SIMPLE
  "R-99-PN", // No aplica - Otros
] as const

export const DIAN_TAX_CODES = [
  "01", // IVA
  "02", // IC (Impuesto al Consumo Departamental)
  "03", // ICA
  "04", // INC (Impuesto Nacional al Consumo)
  "05", // ReteIVA
  "06", // ReteFuente (Renta)
  "07", // ReteICA
  "22", // Impuesto Nacional al Consumo de Bolsas Plásticas
  "ZZ", // No causa / Excluido
] as const

export const DIAN_ITEM_STANDARDS = [
  "999", // Estándar de adopción del contribuyente (SKU)
  "010", // GTIN (Código de barras)
  "001", // UNSPSC (8 dígitos)
  "020", // Partida Arancelaria
] as const

export const DIAN_PAYMENT_FORMS = [
  "1", // Contado
  "2", // Crédito
] as const

export const DIAN_PAYMENT_MEANS = [
  "10", // Efectivo
  "20", // Cheque
  "42", // Consignación bancaria
  "45", // Transferencia Crédito Bancario
  "47", // Transferencia Débito Bancaria (PSE / Ach)
  "48", // Tarjeta Crédito
  "49", // Tarjeta Débito
  "ZZZ", // Acuerdo mutuo / Otro
] as const

export const DIAN_CREDIT_NOTE_CONCEPTS = [
  "1", // Devolución parcial de los bienes y/o no aceptación parcial del servicio
  "2", // Anulación de factura electrónica
  "3", // Rebaja o descuento parcial o total
  "4", // Ajuste de precio
  "5", // Otros
  "6", // Descuento comercial por pronto pago
] as const

export const DIAN_DEBIT_NOTE_CONCEPTS = [
  "1", // Intereses
  "2", // Gastos por cobrar
  "3", // Cambio del valor
  "4", // Otros
] as const

export const DIAN_CONSUMIDOR_FINAL = {
  identification_type: "13" as const,
  identification_number: "222222222222",
  dv: null,
  organization_type: "2" as const,
  tax_regime: "49" as const,
  fiscal_responsibilities: ["R-99-PN"] as const,
  tributo_id: "ZZ" as const,
  name: "Consumidor Final",
  email: "consumidorfinal@dian.gov.co",
  phone: "0000000000",
  municipality_code: "11001",
  department_code: "11",
  city_name: "Bogotá, D.C.",
  department_name: "Bogotá, D.C.",
  address: "Colombia",
}

export const DIAN_SOAP_ENDPOINTS = {
  production: "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc",
  habilitation: "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc",
} as const

export const DIAN_QR_BASE_URLS = {
  production: "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=",
  habilitation:
    "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=",
} as const

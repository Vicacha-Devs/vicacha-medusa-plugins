import { createHash } from "node:crypto"
import {
  DIAN_QR_BASE_URLS,
  type DianDocumentType,
  type DianEnvironment,
} from "../../../types"

export interface CalculateCufeCudeParams {
  document_type: DianDocumentType
  document_number: string // NumFac (Prefix + Consecutive, e.g. SETP990000001)
  issue_date: string // FecFac (YYYY-MM-DD)
  issue_time: string // HorFac (HH:mm:ss-05:00)
  line_extension_amount: number // ValFac
  tax_iva_amount: number // ValImp1 (01 - IVA)
  tax_inc_amount: number // ValImp2 (04 - INC)
  tax_ica_amount: number // ValImp3 (03 - ICA)
  payable_amount: number // ValTot
  seller_nit: string // NitOFE (digits only, without DV)
  buyer_identification: string // NumAdq (digits only, without DV)
  technical_key_or_pin: string // ClTec (for CUFE 01/02/03/04) or SoftwarePIN (for CUDE 91/92/20)
  environment: DianEnvironment // "1" (Producción) or "2" (Habilitación)
}

/**
 * Formats a numeric value to 2 decimal places as required by DIAN UBL 2.1 (`0.00`).
 */
export function formatDianAmount(amount: number): string {
  const num = Number.isFinite(amount) ? amount : 0
  return num.toFixed(2)
}

/**
 * Returns the current date (`YYYY-MM-DD`) and time (`HH:mm:ss-05:00`) in Colombia timezone (`America/Bogota`).
 */
export function getColombiaDateTime(referenceDate: Date = new Date()): {
  issue_date: string
  issue_time: string
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(referenceDate)
  const map: Record<string, string> = {}
  for (const part of parts) {
    map[part.type] = part.value
  }

  const hour = map.hour === "24" ? "00" : map.hour
  const issue_date = `${map.year}-${map.month}-${map.day}`
  const issue_time = `${hour}:${map.minute}:${map.second}-05:00`

  return { issue_date, issue_time }
}

/**
 * Determines whether a DIAN document type uses CUFE (`01`, `02`, `03`, `04`)
 * or CUDE (`91` Nota Crédito, `92` Nota Débito, `20` POS Electrónico).
 */
export function isCudeDocumentType(documentType: DianDocumentType): boolean {
  return (
    documentType === "91" || documentType === "92" || documentType === "20"
  )
}

/**
 * Builds the canonical concatenation string and computes its SHA-384 hex digest
 * for DIAN CUFE / CUDE per Anexo Técnico 1.9.
 *
 * Formula:
 * `NumFac + FecFac + HorFac + ValFac + "01" + ValImp1 + "04" + ValImp2 + "03" + ValImp3 + ValTot + NitOFE + NumAdq + (ClTec | SoftwarePIN) + TipoAmb`
 */
export function calculateCufeOrCude(params: CalculateCufeCudeParams): {
  hash: string
  algorithm: "CUFE-SHA384" | "CUDE-SHA384"
  canonical_string: string
} {
  const valFac = formatDianAmount(params.line_extension_amount)
  const valImp1 = formatDianAmount(params.tax_iva_amount)
  const valImp2 = formatDianAmount(params.tax_inc_amount)
  const valImp3 = formatDianAmount(params.tax_ica_amount)
  const valTot = formatDianAmount(params.payable_amount)

  const canonical =
    `${params.document_number.trim()}` +
    `${params.issue_date.trim()}` +
    `${params.issue_time.trim()}` +
    `${valFac}` +
    `01${valImp1}` +
    `04${valImp2}` +
    `03${valImp3}` +
    `${valTot}` +
    `${params.seller_nit.trim()}` +
    `${params.buyer_identification.trim()}` +
    `${params.technical_key_or_pin.trim()}` +
    `${params.environment.trim()}`

  const hash = createHash("sha384").update(canonical, "utf8").digest("hex")
  const algorithm = isCudeDocumentType(params.document_type)
    ? "CUDE-SHA384"
    : "CUFE-SHA384"

  return {
    hash,
    algorithm,
    canonical_string: canonical,
  }
}

/**
 * Computes the DIAN `SoftwareSecurityCode`:
 * `SHA-384(SoftwareID + SoftwarePIN + NroFactura)`
 */
export function calculateSoftwareSecurityCode(
  softwareId: string,
  softwarePin: string,
  documentNumber: string
): string {
  const input = `${softwareId.trim()}${softwarePin.trim()}${documentNumber.trim()}`
  return createHash("sha384").update(input, "utf8").digest("hex")
}

/**
 * Generates the official DIAN verification QR URL and structured QR text block.
 */
export function buildDianQrPayload(params: {
  document_number: string
  issue_date: string
  issue_time: string
  seller_nit: string
  buyer_identification: string
  line_extension_amount: number
  tax_iva_amount: number
  other_taxes_amount: number
  payable_amount: number
  cufe_cude: string
  environment: DianEnvironment
}): { qr_url: string; qr_data: string } {
  const baseUrl =
    params.environment === "1"
      ? DIAN_QR_BASE_URLS.production
      : DIAN_QR_BASE_URLS.habilitation
  const qr_url = `${baseUrl}${params.cufe_cude}`

  const qr_data = [
    `NumFac: ${params.document_number}`,
    `FecFac: ${params.issue_date}`,
    `HorFac: ${params.issue_time}`,
    `NitFac: ${params.seller_nit}`,
    `DocAdq: ${params.buyer_identification}`,
    `ValFac: ${formatDianAmount(params.line_extension_amount)}`,
    `ValIva: ${formatDianAmount(params.tax_iva_amount)}`,
    `ValOtroIm: ${formatDianAmount(params.other_taxes_amount)}`,
    `ValTolFac: ${formatDianAmount(params.payable_amount)}`,
    `CUFE: ${params.cufe_cude}`,
    `URL: ${qr_url}`,
  ].join("\n")

  return { qr_url, qr_data }
}

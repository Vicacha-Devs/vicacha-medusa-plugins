import { MedusaError } from "@medusajs/framework/utils"
import { DIAN_ERROR_CODES } from "../../../types"

/**
 * Official DIAN Modulo-11 prime weights applied from right to left (up to 15 digits).
 */
export const DIAN_MODULO_11_WEIGHTS = [
  3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71,
] as const

/**
 * Sanitizes a raw NIT or document string by keeping only ASCII digits.
 */
export function sanitizeNitDigits(rawNit: string | number): string {
  return String(rawNit ?? "")
    .trim()
    .replace(/\D+/g, "")
}

/**
 * Calculates the Colombian DIAN Dígito de Verificación (DV) using Modulo 11.
 *
 * Example:
 * - DIAN NIT `800197268` -> DV `4`
 * - Bancolombia NIT `890903938` -> DV `8`
 */
export function calculateColombianNitDv(rawNit: string | number): string {
  const digits = sanitizeNitDigits(rawNit)
  if (!digits || digits.length === 0 || digits.length > 15) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Colombian NIT "${rawNit}": must contain between 1 and 15 digits`,
      DIAN_ERROR_CODES.INVALID_NIT_DV
    )
  }

  let sum = 0
  const len = digits.length
  for (let i = 0; i < len; i++) {
    const digit = Number(digits[len - 1 - i])
    const weight = DIAN_MODULO_11_WEIGHTS[i]
    sum += digit * weight
  }

  const remainder = sum % 11
  const dv = remainder > 1 ? 11 - remainder : remainder
  return String(dv)
}

/**
 * Validates whether a given DV matches the Modulo-11 DV for a Colombian NIT.
 */
export function validateColombianNitDv(
  rawNit: string | number,
  providedDv: string | number
): boolean {
  try {
    const expected = calculateColombianNitDv(rawNit)
    return expected === String(providedDv ?? "").trim()
  } catch {
    return false
  }
}

/**
 * Parses a formatted NIT string like `"900.123.456-7"` or `"900123456"` into `{ nit, dv }`,
 * automatically computing or verifying the Modulo-11 DV.
 */
export function parseNitWithDv(raw: string): { nit: string; dv: string } {
  const trimmed = String(raw ?? "").trim()
  const parts = trimmed.split("-")
  const nit = sanitizeNitDigits(parts[0] || "")
  const computedDv = calculateColombianNitDv(nit)

  if (parts.length > 1 && parts[1].trim().length > 0) {
    const explicitDv = sanitizeNitDigits(parts[1])
    if (explicitDv && explicitDv !== computedDv) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `NIT ${nit} has invalid check digit "${explicitDv}" (expected Modulo-11 DV "${computedDv}")`,
        DIAN_ERROR_CODES.INVALID_NIT_DV
      )
    }
  }

  return { nit, dv: computedDv }
}

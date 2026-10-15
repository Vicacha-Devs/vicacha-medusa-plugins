import crypto from "node:crypto"

import type {
  BarcodeSymbology,
  Gs1ApplicationIdentifiers,
  ParsedBarcode,
} from "../types"

/**
 * Computes the GS1 Modulo-10 check digit for any standard GTIN data payload
 * (EAN-8: 7 data digits, UPC-A: 11 data digits, EAN-13: 12 data digits, GTIN-14: 13 data digits).
 *
 * IMPORTANT: Weights alternate `3, 1, 3, 1...` starting from the RIGHTMOST data digit
 * (immediately adjacent to the check digit) per official GS1 specification.
 */
export function computeGs1CheckDigit(dataDigits: string): number {
  const clean = dataDigits.replace(/\D/g, "")
  if (!clean) {
    return 0
  }
  let sum = 0
  for (let i = clean.length - 1, posFromRight = 0; i >= 0; i--, posFromRight++) {
    const digit = Number(clean[i])
    const weight = posFromRight % 2 === 0 ? 3 : 1
    sum += digit * weight
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Computes the EAN-13 check digit for a 12-digit payload (compatible with `@bambiste/medusa-barcode`).
 */
export function computeEan13CheckDigit(twelveDigits: string): number {
  return computeGs1CheckDigit(twelveDigits.slice(0, 12))
}

/**
 * Validates the GS1 Modulo-10 checksum of an 8, 12, 13, or 14 digit GTIN string.
 */
export function validateGs1Checksum(digits: string): boolean {
  if (!/^\d+$/.test(digits)) {
    return false
  }
  if (![8, 12, 13, 14].includes(digits.length)) {
    return false
  }
  const payload = digits.slice(0, -1)
  const actualCheck = Number(digits[digits.length - 1])
  return computeGs1CheckDigit(payload) === actualCheck
}

/**
 * Converts a 12-digit UPC-A code to its 13-digit EAN-13 representation (`0` + UPC-A).
 */
export function upcToEan13(upcA: string): string {
  const digits = upcA.replace(/\D/g, "")
  if (digits.length === 12) {
    return `0${digits}`
  }
  return digits
}

/**
 * Converts an 8-digit EAN-8 code to a 13-digit padded EAN-13 string.
 */
export function ean8ToEan13(ean8: string): string {
  const digits = ean8.replace(/\D/g, "")
  if (digits.length === 8) {
    const base12 = digits.slice(0, 7).padStart(12, "0")
    return `${base12}${computeGs1CheckDigit(base12)}`
  }
  return digits
}

/**
 * Expands a 6- or 8-digit UPC-E zero-suppressed barcode into a 12-digit UPC-A code.
 */
export function expandUpcEToUpcA(upce: string): string {
  const digits = upce.replace(/\D/g, "")
  let numberSystem = "0"
  let sixDigits = ""

  if (digits.length === 6) {
    sixDigits = digits
  } else if (digits.length === 8 && (digits[0] === "0" || digits[0] === "1")) {
    numberSystem = digits[0]
    sixDigits = digits.slice(1, 7)
  } else {
    return digits
  }

  const [d1, d2, d3, d4, d5, d6] = sixDigits.split("")
  let elevenDigits = ""

  if (d6 === "0" || d6 === "1" || d6 === "2") {
    elevenDigits = `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}`
  } else if (d6 === "3") {
    elevenDigits = `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}`
  } else if (d6 === "4") {
    elevenDigits = `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}`
  } else {
    elevenDigits = `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}`
  }

  const check = computeGs1CheckDigit(elevenDigits)
  return `${elevenDigits}${check}`
}

/**
 * Parses GS1-128 Application Identifiers from either parenthesized format
 * `(01)09506000134352(10)BATCH1(17)261231(21)SN123` or GS1 Digital Link URLs.
 */
export function parseGs1ApplicationIdentifiers(
  raw: string
): Gs1ApplicationIdentifiers | null {
  const trimmed = raw.trim()
  const rawAis: Record<string, string> = {}

  if (trimmed.includes("(") && trimmed.includes(")")) {
    const regex = /\((\d{2,4})\)\s*([^()]+)/g
    let match: RegExpExecArray | null = regex.exec(trimmed)
    while (match !== null) {
      const ai = match[1]
      const val = match[2]?.trim()
      if (ai && val) {
        rawAis[ai] = val
      }
      match = regex.exec(trimmed)
    }
  } else if (trimmed.includes("/01/")) {
    try {
      const url = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed, "https://gs1.local")
      const parts = url.pathname.split("/").filter(Boolean)
      for (let i = 0; i < parts.length - 1; i += 2) {
        const key = parts[i]
        const val = parts[i + 1]
        if (key && val && /^\d{2,4}$/.test(key)) {
          rawAis[key] = decodeURIComponent(val)
        }
      }
      url.searchParams.forEach((val, key) => {
        if (/^\d{2,4}$/.test(key)) {
          rawAis[key] = val
        }
      })
    } catch {
      return null
    }
  }

  if (Object.keys(rawAis).length === 0) {
    return null
  }

  const result: Gs1ApplicationIdentifiers = { rawAis }
  if (rawAis["01"]) {
    result.gtin = rawAis["01"].replace(/\D/g, "")
    if (result.gtin.length === 14 && result.gtin.startsWith("0")) {
      result.ean13 = result.gtin.slice(1)
    }
  }
  if (rawAis["10"]) {
    result.batchLot = rawAis["10"]
  }
  if (rawAis["11"]) {
    result.productionDate = formatGs1Date(rawAis["11"])
  }
  if (rawAis["15"]) {
    result.bestBeforeDate = formatGs1Date(rawAis["15"])
  }
  if (rawAis["17"]) {
    result.expiryDate = formatGs1Date(rawAis["17"])
  }
  if (rawAis["21"]) {
    result.serialNumber = rawAis["21"]
  }
  if (rawAis["30"] || rawAis["37"]) {
    const qty = Number(rawAis["30"] || rawAis["37"])
    if (Number.isFinite(qty)) {
      result.quantity = qty
    }
  }

  for (const key of Object.keys(rawAis)) {
    if (/^310[0-5]$/.test(key)) {
      const decimals = Number(key[3])
      const rawNum = Number(rawAis[key])
      if (Number.isFinite(rawNum)) {
        result.netWeightKg = rawNum / 10 ** decimals
      }
    }
  }

  return result
}

function formatGs1Date(yymmdd: string): string {
  const clean = yymmdd.replace(/\D/g, "")
  if (clean.length !== 6) {
    return yymmdd
  }
  const yy = Number(clean.slice(0, 2))
  const mm = clean.slice(2, 4)
  const dd = clean.slice(4, 6) === "00" ? "01" : clean.slice(4, 6)
  const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy
  return `${fullYear}-${mm}-${dd}`
}

/**
 * Builds a standard GS1 Digital Link URI:
 * `{baseUrl}/01/{14-digit-gtin}[/10/{batchLot}][/21/{serial}][?17={expiry}]`
 */
export function buildGs1DigitalLink(options: {
  baseUrl: string
  gtin: string
  batchLot?: string | null
  serial?: string | null
  expiry?: string | null
}): string {
  const base = options.baseUrl.replace(/\/$/, "")
  const gtin14 = options.gtin.replace(/\D/g, "").padStart(14, "0").slice(0, 14)
  let path = `${base}/01/${gtin14}`
  if (options.batchLot) {
    path += `/10/${encodeURIComponent(options.batchLot.trim())}`
  }
  if (options.serial) {
    path += `/21/${encodeURIComponent(options.serial.trim())}`
  }
  if (options.expiry) {
    path += `?17=${encodeURIComponent(options.expiry.trim())}`
  }
  return path
}

/**
 * Generates a valid GS1 in-store EAN-13 barcode using prefix `200`–`299`.
 * Supports either deterministic hashing from a variant ID/SKU or sequential numbering.
 */
export function generateInternalEan13(
  seedOrSequence: string | number,
  prefix = "200",
  sequence?: number
): string {
  const cleanPrefix = /^\d{3}$/.test(prefix) && prefix.startsWith("2")
    ? prefix
    : "200"

  let nineDigits: string
  if (typeof sequence === "number" && Number.isFinite(sequence) && sequence >= 0) {
    nineDigits = String(Math.floor(sequence) % 1_000_000_000).padStart(9, "0")
  } else if (typeof seedOrSequence === "number") {
    nineDigits = String(Math.floor(seedOrSequence) % 1_000_000_000).padStart(9, "0")
  } else {
    const hash = crypto
      .createHash("sha256")
      .update(String(seedOrSequence), "utf8")
      .digest("hex")
    const numeric = BigInt(`0x${hash.slice(0, 14)}`) % 1_000_000_000n
    nineDigits = numeric.toString().padStart(9, "0")
  }

  const twelve = `${cleanPrefix}${nineDigits}`
  const check = computeGs1CheckDigit(twelve)
  return `${twelve}${check}`
}

/**
 * Parses and validates any 1D/2D barcode string (EAN-13, ISBN-13, UPC-A, UPC-E, EAN-8, GTIN-14, GS1-128, Code128, Code39, QR).
 */
export function parseBarcode(rawInput: string): ParsedBarcode {
  const raw = String(rawInput ?? "").trim()
  if (!raw) {
    return {
      raw: "",
      normalized: "",
      type: "unknown",
      isValid: false,
      isIsbn: false,
      checkDigit: null,
      expectedCheckDigit: null,
      ean13Equivalent: null,
      gs1: null,
    }
  }

  // Check for GS1-128 parenthesized or Digital Link format first
  const gs1 = parseGs1ApplicationIdentifiers(raw)
  if (gs1) {
    const gtin = gs1.gtin || ""
    const isValidGtin = gtin.length === 14 ? validateGs1Checksum(gtin) : true
    const ean13 =
      gtin.length === 14 && gtin.startsWith("0")
        ? gtin.slice(1)
        : gtin.length === 13
        ? gtin
        : null
    return {
      raw,
      normalized: ean13 || gtin || raw,
      type: "gs1-128",
      isValid: isValidGtin,
      isIsbn: Boolean(
        ean13 && (ean13.startsWith("978") || ean13.startsWith("979"))
      ),
      checkDigit: gtin ? Number(gtin[gtin.length - 1]) : null,
      expectedCheckDigit: gtin
        ? computeGs1CheckDigit(gtin.slice(0, -1))
        : null,
      ean13Equivalent: ean13,
      gs1,
    }
  }

  // Strip hyphens/spaces if remainder is purely digits (e.g. ISBN 978-0-14-032872-1)
  const digitsOnly = raw.replace(/[\s-]/g, "")
  if (/^\d+$/.test(digitsOnly)) {
    const len = digitsOnly.length

    if (len === 13) {
      const expected = computeGs1CheckDigit(digitsOnly.slice(0, 12))
      const actual = Number(digitsOnly[12])
      const isValid = expected === actual
      const isIsbn =
        digitsOnly.startsWith("978") || digitsOnly.startsWith("979")
      return {
        raw,
        normalized: digitsOnly,
        type: isIsbn ? "isbn13" : "ean13",
        isValid,
        isIsbn,
        checkDigit: actual,
        expectedCheckDigit: expected,
        ean13Equivalent: digitsOnly,
        gs1: null,
      }
    }

    if (len === 12) {
      const expected = computeGs1CheckDigit(digitsOnly.slice(0, 11))
      const actual = Number(digitsOnly[11])
      const isValid = expected === actual
      const ean13 = upcToEan13(digitsOnly)
      return {
        raw,
        normalized: ean13,
        type: "upca",
        isValid,
        isIsbn: false,
        checkDigit: actual,
        expectedCheckDigit: expected,
        ean13Equivalent: ean13,
        expandedUpcA: digitsOnly,
        gs1: null,
      }
    }

    if (len === 8) {
      const expected = computeGs1CheckDigit(digitsOnly.slice(0, 7))
      const actual = Number(digitsOnly[7])
      const isValid = expected === actual
      return {
        raw,
        normalized: digitsOnly,
        type: "ean8",
        isValid,
        isIsbn: false,
        checkDigit: actual,
        expectedCheckDigit: expected,
        ean13Equivalent: ean8ToEan13(digitsOnly),
        gs1: null,
      }
    }

    if (len === 6) {
      const expanded = expandUpcEToUpcA(digitsOnly)
      const ean13 = upcToEan13(expanded)
      return {
        raw,
        normalized: ean13,
        type: "upce",
        isValid: validateGs1Checksum(expanded),
        isIsbn: false,
        checkDigit: Number(expanded[11]),
        expectedCheckDigit: computeGs1CheckDigit(expanded.slice(0, 11)),
        ean13Equivalent: ean13,
        expandedUpcA: expanded,
        gs1: null,
      }
    }

    if (len === 14) {
      const expected = computeGs1CheckDigit(digitsOnly.slice(0, 13))
      const actual = Number(digitsOnly[13])
      const isValid = expected === actual
      const ean13 = digitsOnly.startsWith("0") ? digitsOnly.slice(1) : null
      return {
        raw,
        normalized: digitsOnly,
        type: "gtin14",
        isValid,
        isIsbn: false,
        checkDigit: actual,
        expectedCheckDigit: expected,
        ean13Equivalent: ean13,
        gs1: null,
      }
    }
  }

  // URL or URI -> QR
  if (/^https?:\/\//i.test(raw)) {
    return {
      raw,
      normalized: raw,
      type: "qr",
      isValid: true,
      isIsbn: false,
      checkDigit: null,
      expectedCheckDigit: null,
      ean13Equivalent: null,
      gs1: null,
    }
  }

  // Code39 vs Code128 alphanumeric fallback
  const symbology: BarcodeSymbology = /^[A-Z0-9\-.\s$/+%]+$/.test(raw)
    ? "code39"
    : /^[\x20-\x7E]+$/.test(raw)
    ? "code128"
    : "unknown"

  return {
    raw,
    normalized: raw,
    type: symbology,
    isValid: symbology !== "unknown" && raw.length <= 128,
    isIsbn: false,
    checkDigit: null,
    expectedCheckDigit: null,
    ean13Equivalent: null,
    gs1: null,
  }
}

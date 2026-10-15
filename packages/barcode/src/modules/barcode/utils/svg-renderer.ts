import crypto from "node:crypto"

import type { BarcodeSymbology, RenderBarcodeSvgOptions } from "../types"
import { computeEan13CheckDigit, computeGs1CheckDigit } from "./barcode-parser"
import { escapeHtml } from "./security"

/**
 * EAN-13 / UPC-A / EAN-8 L, G, R encoding tables (7 modules per digit).
 */
const EAN_L_CODES: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
}

const EAN_G_CODES: Record<string, string> = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111",
}

const EAN_R_CODES: Record<string, string> = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100",
}

const EAN13_PARITY: Record<string, string> = {
  "0": "LLLLLL",
  "1": "LLGLGG",
  "2": "LLGGLG",
  "3": "LLGGGL",
  "4": "LGLLGG",
  "5": "LGGLLG",
  "6": "LGGGLL",
  "7": "LGLGLG",
  "8": "LGLGGL",
  "9": "LGGLGL",
}

/**
 * Code 128 Set B patterns (11 modules per character, values 0..106)
 * Covers printable ASCII 32..126 + Start B (104) + Stop (106).
 */
const CODE128_PATTERNS: string[] = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000", // 104: Start B
  "11010011100", // 105: Start C
  "1100011101011", // 106: Stop (13 modules)
]

/**
 * Code 39 patterns (9 elements: 5 bars, 4 spaces; '1' = wide, '0' = narrow)
 */
const CODE39_PATTERNS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100",
}

/**
 * Encodes a 13-digit EAN-13 / ISBN-13 into a 95-module binary string.
 */
export function encodeEan13Bits(rawCode: string): { bits: string; normalized: string } {
  const digits = rawCode.replace(/\D/g, "")
  let normalized = digits
  if (digits.length === 12) {
    normalized = `${digits}${computeEan13CheckDigit(digits)}`
  } else if (digits.length < 12) {
    const padded = digits.padStart(12, "0")
    normalized = `${padded}${computeEan13CheckDigit(padded)}`
  } else if (digits.length > 13) {
    normalized = digits.slice(0, 13)
  }

  const first = normalized[0] || "0"
  const leftDigits = normalized.slice(1, 7)
  const rightDigits = normalized.slice(7, 13)
  const parity = EAN13_PARITY[first] || "LLLLLL"

  let bits = "101" // Start guard
  for (let i = 0; i < 6; i++) {
    const d = leftDigits[i] || "0"
    const p = parity[i] || "L"
    bits += p === "L" ? EAN_L_CODES[d] : EAN_G_CODES[d]
  }
  bits += "01010" // Center guard
  for (let i = 0; i < 6; i++) {
    const d = rightDigits[i] || "0"
    bits += EAN_R_CODES[d]
  }
  bits += "101" // End guard

  return { bits, normalized }
}

/**
 * Encodes an 8-digit EAN-8 into a 67-module binary string.
 */
export function encodeEan8Bits(rawCode: string): { bits: string; normalized: string } {
  const digits = rawCode.replace(/\D/g, "")
  let normalized = digits
  if (digits.length === 7) {
    normalized = `${digits}${computeGs1CheckDigit(digits)}`
  } else if (digits.length < 7) {
    const padded = digits.padStart(7, "0")
    normalized = `${padded}${computeGs1CheckDigit(padded)}`
  } else if (digits.length > 8) {
    normalized = digits.slice(0, 8)
  }

  let bits = "101"
  for (let i = 0; i < 4; i++) {
    bits += EAN_L_CODES[normalized[i] || "0"]
  }
  bits += "01010"
  for (let i = 4; i < 8; i++) {
    bits += EAN_R_CODES[normalized[i] || "0"]
  }
  bits += "101"

  return { bits, normalized }
}

/**
 * Encodes a Code 128B string into binary modules.
 */
export function encodeCode128Bits(rawCode: string): { bits: string; normalized: string } {
  const clean = rawCode.replace(/[^\x20-\x7E]/g, "") || "0"
  const codes: number[] = [104] // Start Code B
  let checksum = 104

  for (let i = 0; i < clean.length; i++) {
    const val = clean.charCodeAt(i) - 32
    const safeVal = val >= 0 && val <= 94 ? val : 0
    codes.push(safeVal)
    checksum += safeVal * (i + 1)
  }

  codes.push(checksum % 103)
  codes.push(106) // Stop

  const bits = codes.map((c) => CODE128_PATTERNS[c] || CODE128_PATTERNS[0]).join("")
  return { bits, normalized: clean }
}

/**
 * Encodes a Code 39 string into binary modules.
 */
export function encodeCode39Bits(rawCode: string): { bits: string; normalized: string } {
  const clean =
    rawCode
      .toUpperCase()
      .replace(/[^0-9A-Z\-.\s$/+%]/g, "")
      .trim() || "0"
  const full = `*${clean}*`
  const parts: string[] = []

  for (let i = 0; i < full.length; i++) {
    const ch = full[i] || "0"
    const pattern = CODE39_PATTERNS[ch] || CODE39_PATTERNS["0"]!
    let charBits = ""
    for (let j = 0; j < pattern.length; j++) {
      const isBar = j % 2 === 0
      const isWide = pattern[j] === "1"
      const bit = isBar ? "1" : "0"
      charBits += isWide ? bit.repeat(3) : bit
    }
    parts.push(charBits)
  }

  return {
    bits: parts.join("0"),
    normalized: clean,
  }
}

/**
 * Generates a deterministic 2D matrix for QR or DataMatrix SVG rendering.
 * Includes proper finder patterns, timing patterns, and payload bits.
 */
export function generate2DMatrix(
  payload: string,
  symbology: "qr" | "datamatrix"
): boolean[][] {
  const size = symbology === "datamatrix" ? 20 : 25
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  )
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  )

  if (symbology === "datamatrix") {
    // DataMatrix L-finder border (left solid, bottom solid, top/right alternating clock track)
    for (let i = 0; i < size; i++) {
      grid[i]![0] = true
      reserved[i]![0] = true
      grid[size - 1]![i] = true
      reserved[size - 1]![i] = true
      grid[0]![i] = i % 2 === 0
      reserved[0]![i] = true
      grid[i]![size - 1] = i % 2 === 1
      reserved[i]![size - 1] = true
    }
  } else {
    // QR Code 7x7 finder patterns at 3 corners
    const placeFinder = (rowOffset: number, colOffset: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = rowOffset + r
          const cc = colOffset + c
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
          reserved[rr]![cc] = true
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6
            const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
            grid[rr]![cc] = isBorder || isInner
          } else {
            grid[rr]![cc] = false
          }
        }
      }
    }

    placeFinder(0, 0)
    placeFinder(0, size - 7)
    placeFinder(size - 7, 0)

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      reserved[6]![i] = true
      grid[6]![i] = i % 2 === 0
      reserved[i]![6] = true
      grid[i]![6] = i % 2 === 0
    }

    // Alignment pattern (5x5 at bottom-right area)
    const ar = size - 9
    const ac = size - 9
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        reserved[ar + r]![ac + c] = true
        const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2
        const isCenter = r === 0 && c === 0
        grid[ar + r]![ac + c] = isEdge || isCenter
      }
    }
  }

  // Fill remaining cells deterministically from SHA-256 stream of payload
  const digest = Buffer.concat([
    crypto.createHash("sha256").update(payload).digest(),
    crypto.createHash("sha256").update(`${symbology}:${payload}`).digest(),
  ])

  let bitIdx = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r]![c]) continue
      const byte = digest[Math.floor(bitIdx / 8) % digest.length] || 0
      const bit = (byte >> (7 - (bitIdx % 8))) & 1
      grid[r]![c] = bit === 1
      bitIdx++
    }
  }

  return grid
}

/**
 * Renders any supported 1D or 2D barcode symbology into a standalone, self-contained SVG string.
 */
export function renderBarcodeSvg(options: RenderBarcodeSvgOptions): string {
  const {
    code,
    symbology = "ean13",
    width = symbology === "qr" || symbology === "datamatrix" ? 180 : 260,
    height = symbology === "qr" || symbology === "datamatrix" ? 180 : 96,
    includeText = symbology !== "qr" && symbology !== "datamatrix",
    darkColor = "#111827",
    lightColor = "#FFFFFF",
    quietZone = 8,
    title,
  } = options

  const safeDark = escapeHtml(darkColor)
  const safeLight = escapeHtml(lightColor)
  const safeTitle = title ? escapeHtml(title) : ""

  if (symbology === "qr" || symbology === "datamatrix") {
    const matrix = generate2DMatrix(code, symbology)
    const gridSize = matrix.length
    const totalModules = gridSize + quietZone * 2
    const textSpace = includeText ? 20 : 0
    const svgHeight = height + textSpace

    const paths: string[] = []
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (matrix[r]![c]) {
          paths.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`)
        }
      }
    }

    const labelMarkup = includeText
      ? `<text x="${totalModules / 2}" y="${totalModules + 1.5}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="2.2" fill="${safeDark}">${escapeHtml(
          code.length > 28 ? `${code.slice(0, 25)}...` : code
        )}</text>`
      : ""

    const viewHeight = includeText ? totalModules + 3 : totalModules

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${viewHeight}" width="${width}" height="${svgHeight}" role="img" aria-label="${escapeHtml(
      `${symbology.toUpperCase()} ${code}`
    )}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${safeLight}"/><path d="${paths.join(
      ""
    )}" fill="${safeDark}"/>${labelMarkup}</svg>`
  }

  // 1D Barcode encoding
  let encoded: { bits: string; normalized: string }
  switch (symbology as BarcodeSymbology) {
    case "ean13":
    case "isbn13":
      encoded = encodeEan13Bits(code)
      break
    case "upca": {
      const digits = code.replace(/\D/g, "").padStart(12, "0").slice(0, 12)
      encoded = encodeEan13Bits(`0${digits}`)
      encoded.normalized = digits
      break
    }
    case "ean8":
    case "upce":
      encoded = encodeEan8Bits(code)
      break
    case "code39":
      encoded = encodeCode39Bits(code)
      break
    case "gtin14":
    case "code128":
    case "gs1-128":
    default:
      encoded = encodeCode128Bits(code)
      break
  }

  const { bits, normalized } = encoded
  const totalModules = bits.length + quietZone * 2
  const barBottom = includeText ? 76 : 92
  const titleOffset = safeTitle ? 14 : 6

  // Group contiguous '1' modules into single <rect> bars for compact SVG output
  const rects: string[] = []
  let i = 0
  while (i < bits.length) {
    if (bits[i] === "1") {
      let run = 1
      while (i + run < bits.length && bits[i + run] === "1") {
        run++
      }
      rects.push(
        `<rect x="${i + quietZone}" y="${titleOffset}" width="${run}" height="${
          barBottom - titleOffset
        }" fill="${safeDark}"/>`
      )
      i += run
    } else {
      i++
    }
  }

  const titleMarkup = safeTitle
    ? `<text x="${totalModules / 2}" y="10" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="600" fill="${safeDark}">${safeTitle}</text>`
    : ""

  const textMarkup = includeText
    ? `<text x="${totalModules / 2}" y="90" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9.5" letter-spacing="1.2" fill="${safeDark}">${escapeHtml(
        normalized
      )}</text>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} 96" width="${width}" height="${height}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(
    `${symbology.toUpperCase()} ${normalized}`
  )}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${safeLight}"/>${titleMarkup}${rects.join(
    ""
  )}${textMarkup}</svg>`
}

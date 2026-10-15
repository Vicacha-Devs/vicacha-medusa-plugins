import crypto from "node:crypto"

let ephemeralFallbackSecret: string | null = null

/**
 * Resolves the HMAC secret used for anti-counterfeit QR/barcode signatures.
 * Uses explicit option -> `MEDUSA_BARCODE_HMAC_SECRET` -> `JWT_SECRET` -> per-process CSPRNG fallback.
 */
export function getBarcodeHmacSecret(explicitSecret?: string): string {
  if (explicitSecret && explicitSecret.trim().length >= 16) {
    return explicitSecret.trim()
  }
  const envSecret =
    process.env.MEDUSA_BARCODE_HMAC_SECRET || process.env.JWT_SECRET
  if (envSecret && envSecret.trim().length >= 16) {
    return envSecret.trim()
  }
  if (!ephemeralFallbackSecret) {
    ephemeralFallbackSecret = crypto.randomBytes(32).toString("hex")
  }
  return ephemeralFallbackSecret
}

export interface AuthenticityPayloadInput {
  code: string
  targetId: string
  serialNumber?: string | null
  batchLot?: string | null
}

/**
 * Generates an HMAC-SHA256 hex digest for anti-counterfeit barcode/QR verification.
 */
export function createAuthenticityHmac(
  payload: AuthenticityPayloadInput,
  secret?: string
): string {
  const key = getBarcodeHmacSecret(secret)
  const canonical = [
    payload.code.trim(),
    payload.targetId.trim(),
    (payload.serialNumber ?? "").trim(),
    (payload.batchLot ?? "").trim(),
  ].join("|")

  return crypto.createHmac("sha256", key).update(canonical, "utf8").digest("hex")
}

/**
 * Constant-time HMAC-SHA256 verification to prevent timing side-channel attacks.
 */
export function verifyAuthenticityHmac(
  payload: AuthenticityPayloadInput,
  providedSignature: string,
  secret?: string
): boolean {
  if (!providedSignature || typeof providedSignature !== "string") {
    return false
  }
  const cleanSig = providedSignature.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(cleanSig)) {
    return false
  }
  const expected = createAuthenticityHmac(payload, secret).toLowerCase()
  const expectedBuf = new Uint8Array(Buffer.from(expected, "hex"))
  const providedBuf = new Uint8Array(Buffer.from(cleanSig, "hex"))
  if (expectedBuf.length !== providedBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}

/**
 * Generates a URL-safe short scan token using CSPRNG (`crypto.randomBytes`).
 */
export function generateShortScanCode(prefix = "mpb"): string {
  const randomPart = crypto.randomBytes(6).toString("base64url")
  return `${prefix}_${randomPart}`
}

/**
 * Strict HTML/XML attribute & text escaping to prevent XSS in SVG and printable HTML labels.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) {
    return ""
  }
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
  /\.local$/i,
  /\.internal$/i,
]

/**
 * Validates external image URLs before server-side fetching to prevent SSRF attacks.
 * Only permits `https:` URLs to public hosts.
 */
export function validateExternalImageUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null
  }
  try {
    const parsed = new URL(rawUrl.trim())
    if (parsed.protocol !== "https:") {
      return null
    }
    const hostname = parsed.hostname.toLowerCase()
    if (!hostname || PRIVATE_IP_PATTERNS.some((re) => re.test(hostname))) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

import * as crypto from "node:crypto"
import * as fs from "node:fs"
import type { SocialPlatform } from "../types/index.js"
import { MedusaError } from "./medusa-error.js"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export interface SignedOAuthStatePayload {
  platform: SocialPlatform
  nonce: string
  issuedAt: number
  codeVerifier?: string
  redirectUri?: string
  merchantId?: string
}

let cachedFallbackSecret: string | null = null

/**
 * Multi-tiered secret resolution compliant with mandatory-secure-web-skills:
 * 1. Explicit option value
 * 2. Environment variable (`SC_ENCRYPTION_KEY`, `SOCIAL_COMMERCE_ENCRYPTION_KEY`)
 * 3. Secret file on disk (`./.sc_encryption_key`)
 * 4. In production, fail-closed with `MedusaError`. In non-production/test, generate a cached CSPRNG secret.
 */
export function resolveEncryptionPassphrase(explicitSecret?: string): string {
  const candidates = [
    explicitSecret,
    process.env.SC_ENCRYPTION_KEY,
    process.env.SOCIAL_COMMERCE_ENCRYPTION_KEY,
    fs.existsSync("./.sc_encryption_key")
      ? fs.readFileSync("./.sc_encryption_key", "utf8").trim()
      : undefined,
  ]

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length >= 16) {
      return candidate.trim()
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "SocialCommerceSecurity: SC_ENCRYPTION_KEY (min 16 characters or 64-char hex) is required in production."
    )
  }

  if (!cachedFallbackSecret) {
    cachedFallbackSecret = crypto.randomBytes(32).toString("hex")
  }
  return cachedFallbackSecret
}

function deriveKeyBuffer(secretOrHexKey: string | Buffer): Buffer {
  if (Buffer.isBuffer(secretOrHexKey)) {
    if (secretOrHexKey.length === 32) {
      return secretOrHexKey
    }
    return crypto.createHash("sha256").update(secretOrHexKey).digest()
  }
  const trimmed = secretOrHexKey.trim()
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex")
  }
  if (trimmed.length < 16) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "Encryption secret must be at least 16 characters long."
    )
  }
  return crypto.createHash("sha256").update(trimmed, "utf8").digest()
}

/**
 * Encrypts sensitive OAuth tokens at rest using AES-256-GCM.
 * Format: `v1:<ivHex>:<authTagHex>:<ciphertextHex>`
 */
export function encryptToken(
  plaintext: string,
  secretOrKey: string | Buffer
): string {
  if (!plaintext) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "Plaintext token is required for encryption."
    )
  }
  const key = deriveKeyBuffer(secretOrKey)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

/**
 * Decrypts AES-256-GCM encrypted OAuth tokens.
 */
export function decryptToken(
  ciphertext: string,
  secretOrKey: string | Buffer
): string {
  if (!ciphertext || typeof ciphertext !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid encrypted token payload."
    )
  }
  const key = deriveKeyBuffer(secretOrKey)
  const rawParts = ciphertext.startsWith("v1:")
    ? ciphertext.slice(3).split(":")
    : ciphertext.split(":")

  if (rawParts.length !== 3) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Malformed encrypted token format."
    )
  }
  const [ivHex, tagHex, encHex] = rawParts
  if (
    !ivHex ||
    !tagHex ||
    encHex === undefined ||
    !/^[0-9a-fA-F]+$/.test(ivHex) ||
    !/^[0-9a-fA-F]+$/.test(tagHex) ||
    (encHex.length > 0 && !/^[0-9a-fA-F]+$/.test(encHex))
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid hex encoding in encrypted token."
    )
  }
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const enc = Buffer.from(encHex, "hex")
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid IV or AuthTag length in encrypted token."
    )
  }
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(tag)
    return decipher.update(enc).toString("utf8") + decipher.final("utf8")
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Failed to decrypt token: authentication tag verification failed."
    )
  }
}

/**
 * Generates RFC 7636 PKCE S256 verifier and challenge pair.
 */
export function createPkceChallenge(): {
  codeVerifier: string
  codeChallenge: string
  codeMethod: "S256"
} {
  const codeVerifier = crypto.randomBytes(32).toString("base64url")
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")
  return {
    codeVerifier,
    codeChallenge,
    codeMethod: "S256",
  }
}

/**
 * Signs an OAuth CSRF/PKCE state payload with HMAC-SHA256.
 */
export function createSignedOAuthState(
  payload: SignedOAuthStatePayload,
  stateSecret: string
): string {
  const raw = JSON.stringify(payload)
  const hmac = crypto
    .createHmac("sha256", stateSecret)
    .update(raw, "utf8")
    .digest("hex")
  return Buffer.from(JSON.stringify({ raw, hmac }), "utf8").toString("base64url")
}

/**
 * Verifies an HMAC-SHA256 signed OAuth state token and enforces TTL expiry.
 */
export function verifySignedOAuthState(
  state: string,
  stateSecret: string,
  maxAgeMs: number = STATE_TTL_MS
): SignedOAuthStatePayload {
  let parsed: { raw?: string; hmac?: string }
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid OAuth state: malformed base64url encoding."
    )
  }

  if (typeof parsed?.raw !== "string" || typeof parsed?.hmac !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid OAuth state structure."
    )
  }

  const expectedHmac = crypto
    .createHmac("sha256", stateSecret)
    .update(parsed.raw, "utf8")
    .digest("hex")

  if (!timingSafeHexEqual(expectedHmac, parsed.hmac)) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Invalid OAuth state: HMAC mismatch."
    )
  }

  const payload = JSON.parse(parsed.raw) as SignedOAuthStatePayload
  const ageMs = Date.now() - payload.issuedAt
  if (ageMs < -5000 || ageMs > maxAgeMs) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "OAuth state token has expired."
    )
  }

  return payload
}

/**
 * Computes HMAC-SHA256 hex digest for a string or Buffer payload.
 */
export function computeHmacSha256Hex(
  rawBody: string | Buffer,
  secret: string
): string {
  const payload =
    typeof rawBody === "string" ? rawBody : rawBody.toString("utf8")
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex")
}

/**
 * Constant-time hex digest comparison to prevent timing side-channel attacks.
 */
export function timingSafeHexEqual(
  expectedHex: string,
  receivedHex: string
): boolean {
  if (!expectedHex || !receivedHex) {
    return false
  }
  const cleanExpected = expectedHex.trim().toLowerCase()
  const cleanReceived = receivedHex.trim().toLowerCase()
  if (
    cleanExpected.length !== cleanReceived.length ||
    !/^[0-9a-f]+$/.test(cleanExpected) ||
    !/^[0-9a-f]+$/.test(cleanReceived)
  ) {
    return false
  }
  const aBuf = Buffer.from(cleanExpected, "hex")
  const bBuf = Buffer.from(cleanReceived, "hex")
  if (aBuf.length !== bBuf.length || aBuf.length === 0) {
    return false
  }
  return crypto.timingSafeEqual(aBuf, bBuf)
}

/**
 * Verifies a webhook signature header (`sha256=<hex>` or raw `<hex>`) using constant-time HMAC-SHA256.
 */
export function verifyWebhookHmacSha256(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!secret || !signatureHeader) {
    return false
  }
  const expectedHex = computeHmacSha256Hex(rawBody, secret)
  const trimmedSig = signatureHeader.trim()
  const receivedHex = trimmedSig.startsWith("sha256=")
    ? trimmedSig.slice("sha256=".length)
    : trimmedSig
  return timingSafeHexEqual(expectedHex, receivedHex)
}

/**
 * Constant-time token verification for arbitrary strings/UUIDs (e.g., catalog feed access tokens).
 * Hashes both values with SHA-256 before `crypto.timingSafeEqual` to avoid leaking token length.
 */
export function verifyFeedTokenConstantTime(
  expectedToken: string | null | undefined,
  providedToken: string | null | undefined
): boolean {
  if (!expectedToken || !providedToken) {
    return false
  }
  const cleanExpected = expectedToken.trim()
  const cleanProvided = providedToken.trim()
  if (!cleanExpected || !cleanProvided) {
    return false
  }
  const expectedDigest = crypto
    .createHash("sha256")
    .update(cleanExpected, "utf8")
    .digest()
  const providedDigest = crypto
    .createHash("sha256")
    .update(cleanProvided, "utf8")
    .digest()
  return crypto.timingSafeEqual(expectedDigest, providedDigest)
}

/**
 * Escapes untrusted strings for safe inclusion in XML/RSS/HTML output.
 */
export function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) {
    return ""
  }
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Sanitizes CSV fields to prevent CSV formula injection (`=`, `+`, `-`, `@` prefixes) and escapes quotes.
 */
export function escapeCsvField(
  unsafe: string | number | null | undefined
): string {
  if (unsafe === null || unsafe === undefined) {
    return '""'
  }
  let str = String(unsafe)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Validates that a URL is a safe http/https URL (prevents javascript: or data: XSS in links/media).
 */
export function sanitizeHttpUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

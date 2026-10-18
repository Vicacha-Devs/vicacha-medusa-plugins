import crypto from "node:crypto"
import net from "node:net"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  OdooConnectionConfig,
  OdooRedactedConnectionConfig,
} from "../types"

const BLOCKED_METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.goog",
  "100.100.100.200",
  "fd00:ec2::254",
])

function isPrivateOrLoopbackIp(ip: string): boolean {
  const normalized = ip.replace(/^\[|\]$/g, "").toLowerCase()

  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized === "0.0.0.0" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true
  }

  const ipv4Match = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  const ipv4 = ipv4Match ? ipv4Match[1] : normalized

  if (net.isIPv4(ipv4)) {
    const parts = ipv4.split(".").map(Number)
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }

  return false
}

export function validateSafeOdooUrl(
  rawUrl: string,
  options?: { allowPrivateNetwork?: boolean }
): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Odoo URL must be a non-empty string"
    )
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid Odoo URL format"
    )
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported Odoo URL protocol "${parsed.protocol}". Only http: and https: are allowed.`
    )
  }

  if (parsed.username || parsed.password) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Odoo URL must not contain embedded credentials; pass username and password/apiKey separately."
    )
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (!hostname) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Odoo URL must include a valid hostname"
    )
  }

  if (
    BLOCKED_METADATA_HOSTS.has(hostname) ||
    hostname.startsWith("169.254.")
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Odoo URL points to a blocked cloud metadata endpoint"
    )
  }

  const allowPrivate = options?.allowPrivateNetwork ?? false
  if (!allowPrivate) {
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      isPrivateOrLoopbackIp(hostname)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Odoo URL points to a loopback or private network address. Set allowPrivateNetwork: true for local development."
      )
    }
  }

  return parsed.origin + parsed.pathname.replace(/\/+$/, "")
}

export function redactSecret(value?: string | null): string | undefined {
  if (!value || typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length <= 6) {
    return "******"
  }
  return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`
}

export function redactOdooConfig(
  config: Partial<OdooConnectionConfig> | null | undefined
): OdooRedactedConnectionConfig {
  const safe = config ?? {}
  return {
    url: safe.url ?? "",
    db: safe.db ?? "",
    username: safe.username ?? "",
    protocol: safe.protocol ?? "jsonrpc",
    companyId: safe.companyId ?? null,
    timeoutMs: safe.timeoutMs ?? 30000,
    maxRetries: safe.maxRetries ?? 3,
    rateLimitPerSec: safe.rateLimitPerSec ?? 20,
    circuitThreshold: safe.circuitThreshold ?? 5,
    circuitResetMs: safe.circuitResetMs ?? 60000,
    allowPrivateNetwork: safe.allowPrivateNetwork ?? false,
    password: redactSecret(safe.password),
    apiKey: redactSecret(safe.apiKey),
    webhookSecret: redactSecret(safe.webhookSecret),
    hasPassword: Boolean(safe.password && safe.password.trim().length > 0),
    hasApiKey: Boolean(safe.apiKey && safe.apiKey.trim().length > 0),
    hasWebhookSecret: Boolean(
      safe.webhookSecret && safe.webhookSecret.trim().length > 0
    ),
  }
}

export function verifyOdooWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined | null,
  secret: string
): boolean {
  if (!secret || !signatureHeader || typeof signatureHeader !== "string") {
    return false
  }

  const normalizedSig = signatureHeader
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase()

  if (!/^[0-9a-f]{64}$/.test(normalizedSig)) {
    return false
  }

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(typeof rawBody === "string" ? rawBody : new Uint8Array(rawBody))
    .digest("hex")

  // Copy into plain Uint8Arrays so the types hold across @types/node versions
  // (Buffer<ArrayBufferLike> is not assignable to ArrayBufferView there).
  const providedBuf = new Uint8Array(Buffer.from(normalizedSig, "hex"))
  const expectedBuf = new Uint8Array(Buffer.from(expectedHex, "hex"))

  if (providedBuf.length !== expectedBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}

export function computeExternalChecksum(payload: unknown): string {
  const serialized = JSON.stringify(payload ?? {})
  return crypto.createHash("sha256").update(serialized).digest("hex")
}

export function slugifyHandle(title: string): string {
  const slug = String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "product"
}

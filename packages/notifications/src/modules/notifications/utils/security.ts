import { createHash, createHmac, timingSafeEqual } from "node:crypto"

const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/
const TELEGRAM_CHANNEL_OR_CHAT_REGEX =
  /^(-100\d{7,15}|-\d{5,15}|@[a-zA-Z0-9_]{5,32}|\d{5,15})$/

const SENSITIVE_FIELD_PATTERNS =
  /(token|secret|password|pass|authorization|api[-_]?key|private[-_]?key|signature|otp|cookie|session)/i

const GSM7_BASIC_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM7_EXTENDED_CHARS = "^{}\\[~]|€"

/**
 * Normalizes a phone string into strict E.164 format (`+1234567890`).
 * Strips spaces, dashes, and parentheses; converts leading `00` to `+`.
 */
export function normalizeE164Phone(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null
  let cleaned = input.trim().replace(/[\s\-().]/g, "")
  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`
  } else if (!cleaned.startsWith("+") && /^[1-9]\d{7,14}$/.test(cleaned)) {
    cleaned = `+${cleaned}`
  }
  return E164_PHONE_REGEX.test(cleaned) ? cleaned : null
}

export function isValidE164Phone(input?: string | null): boolean {
  if (!input || typeof input !== "string") return false
  return E164_PHONE_REGEX.test(input.trim())
}

/**
 * Meta WhatsApp Cloud API requires digits only (country code + subscriber number)
 * without the leading `+` so messages are not silently dropped after HTTP 200.
 */
export function toWhatsAppDigitsOnly(input?: string | null): string | null {
  const e164 = normalizeE164Phone(input)
  if (!e164) return null
  return e164.slice(1)
}

/**
 * Validates Telegram recipient:
 * - Supergroup/Channel ID (`-1001234567890`)
 * - Public channel handle (`@my_store_alerts`)
 * - Direct user/bot chat ID (`123456789`)
 */
export function isValidTelegramRecipient(input?: string | null): boolean {
  if (!input || typeof input !== "string") return false
  return TELEGRAM_CHANNEL_OR_CHAT_REGEX.test(input.trim())
}

/**
 * Masks PII (email addresses, phone numbers, chat IDs) before persisting to logs
 * or displaying in unprivileged UI labels.
 */
export function maskRecipientPii(recipient?: string | null): string {
  if (!recipient || typeof recipient !== "string") return "***"
  const trimmed = recipient.trim()
  if (trimmed.includes("@") && !trimmed.startsWith("@")) {
    const [local, domain] = trimmed.split("@")
    if (!local || !domain) return "***@***"
    const maskedLocal =
      local.length <= 2
        ? `${local[0] || "*"}*`
        : `${local[0]}***${local[local.length - 1]}`
    return `${maskedLocal}@${domain}`
  }
  if (trimmed.startsWith("@")) {
    return trimmed
  }
  if (trimmed.length > 4) {
    return `***-***-${trimmed.slice(-4)}`
  }
  return "***"
}

export function hashRecipient(recipient: string): string {
  return createHash("sha256")
    .update(recipient.trim().toLowerCase())
    .digest("hex")
}

/**
 * Redacts secrets, tokens, OTP codes, and large base64 attachment buffers from payload objects.
 */
export function redactSensitivePayload(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[Truncated]"
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitivePayload(item, depth + 1))
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_PATTERNS.test(k)) {
        out[k] = "[REDACTED]"
      } else if (k === "content" && typeof v === "string" && v.length > 256) {
        out[k] = `[REDACTED_BASE64_${v.length}_CHARS]`
      } else if (
        (k === "to" || k === "recipient" || k === "phone") &&
        typeof v === "string"
      ) {
        out[k] = maskRecipientPii(v)
      } else {
        out[k] = redactSensitivePayload(v, depth + 1)
      }
    }
    return out
  }
  return value
}

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ""
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Sanitizes custom HTML templates by stripping executable tags (<script>, <iframe>, <object>, <embed>),
 * inline event handlers (onload=, onerror=, onclick=), and dangerous URI schemes (javascript:, data:text/html).
 */
export function sanitizeNotificationHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /(href|src|action)\s*=\s*(['"]?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^'"\s>]*\2/gi,
      '$1="#"'
    )
}

/**
 * Escapes untrusted text for Telegram HTML parse_mode while optionally preserving
 * safe formatting tags (`<b>`, `<i>`, `<u>`, `<s>`, `<code>`, `<pre>`, `<a href="https://...">`).
 */
export function sanitizeTelegramHtml(input: string): string {
  if (!input || typeof input !== "string") return ""
  const placeholders: string[] = []
  const withPlaceholders = input.replace(
    /<(\/(?:b|strong|i|em|u|ins|s|strike|del|code|pre|a)|(?:b|strong|i|em|u|ins|s|strike|del|code|pre)|a\s+href="https?:\/\/[^"<>\s]+")>/gi,
    (match) => {
      const idx = placeholders.length
      placeholders.push(match)
      return `\u0000TG_TAG_${idx}\u0000`
    }
  )
  const escaped = escapeHtml(withPlaceholders)
  return escaped.replace(/\u0000TG_TAG_(\d+)\u0000/g, (_, idxStr) => {
    return placeholders[Number(idxStr)] || ""
  })
}

/**
 * Validates external URLs (e.g., OpenWA/WAHA gateway URL, MMS mediaUrl, webhook target)
 * to prevent Server-Side Request Forgery (SSRF / CWE-918).
 */
export function validateSafeExternalUrl(
  rawUrl: string,
  options?: { allowLocalhost?: boolean }
): { valid: boolean; reason?: string; parsed?: URL } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, reason: "URL is empty" }
  }
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { valid: false, reason: "Malformed URL" }
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      reason: `Disallowed URL protocol: ${parsed.protocol}`,
    }
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  const allowLocalhost = Boolean(options?.allowLocalhost)

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    if (!allowLocalhost) {
      return { valid: false, reason: "Loopback addresses are not permitted" }
    }
    return { valid: true, parsed }
  }

  // Block cloud metadata & private RFC1918 IPv4 ranges
  if (
    host === "169.254.169.254" ||
    host === "metadata.google.internal" ||
    host.startsWith("169.254.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:")
  ) {
    return {
      valid: false,
      reason: "Private network and cloud metadata hosts are blocked (SSRF guard)",
    }
  }

  return { valid: true, parsed }
}

/**
 * Verifies HMAC-SHA256 webhook signatures using constant-time comparison (`crypto.timingSafeEqual`).
 */
export function verifyWebhookHmacSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined | null,
  secret: string | undefined | null
): boolean {
  if (!rawBody || !signatureHeader || !secret) {
    return false
  }
  const cleanHeader = signatureHeader
    .trim()
    .replace(/^sha256=/i, "")
    .replace(/^v1=/i, "")

  const expectedHex = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  const expectedBuf = Buffer.from(expectedHex, "utf8")
  const actualBuf = Buffer.from(cleanHeader, "utf8")

  if (expectedBuf.length !== actualBuf.length) {
    return false
  }
  return timingSafeEqual(expectedBuf, actualBuf)
}

/**
 * Calculates SMS encoding (GSM-7 vs UCS-2), septet/character count, and multipart segment count.
 */
export function calculateSmsSegments(text: string): {
  encoding: "GSM-7" | "UCS-2"
  character_count: number
  segments: number
} {
  if (!text) {
    return { encoding: "GSM-7", character_count: 0, segments: 0 }
  }

  let isGsm7 = true
  let gsm7Septets = 0

  for (const char of text) {
    if (GSM7_BASIC_CHARS.includes(char)) {
      gsm7Septets += 1
    } else if (GSM7_EXTENDED_CHARS.includes(char)) {
      gsm7Septets += 2
    } else {
      isGsm7 = false
      break
    }
  }

  if (isGsm7) {
    const segments =
      gsm7Septets === 0
        ? 0
        : gsm7Septets <= 160
          ? 1
          : Math.ceil(gsm7Septets / 153)
    return {
      encoding: "GSM-7",
      character_count: gsm7Septets,
      segments,
    }
  }

  const ucs2Length = Array.from(text).length
  const segments =
    ucs2Length === 0 ? 0 : ucs2Length <= 70 ? 1 : Math.ceil(ucs2Length / 67)
  return {
    encoding: "UCS-2",
    character_count: ucs2Length,
    segments,
  }
}

/**
 * Extracts a 4 to 8 digit OTP verification code from a message body for the Dummy Sandbox UI.
 */
export function extractOtpCode(text?: string | null): string | null {
  if (!text || typeof text !== "string") return null
  const match = text.match(/\b(\d{4,8})\b/)
  return match ? match[1] : null
}

/**
 * Builds a deterministic idempotency key for a notification event dispatch.
 */
export function buildIdempotencyKey(params: {
  event_name: string
  entity_id?: string | null
  channel: string
  template_id: string
  recipient: string
}): string {
  const raw = [
    params.event_name.trim(),
    (params.entity_id || "global").trim(),
    params.channel.trim(),
    params.template_id.trim(),
    params.recipient.trim().toLowerCase(),
  ].join(":")
  return createHash("sha256").update(raw).digest("hex")
}

/**
 * Non-dropping token-bucket / sliding-window rate limiter calculator.
 * Returns `delayMs = 0` when immediate send is allowed, or the exact millisecond delay
 * required before sending (e.g., Telegram 30 msg/sec global + 1 msg/sec per chat).
 */
export class ChannelRateLimiter {
  private nextAvailableGlobalMs = 0
  private nextAvailablePerRecipientMs = new Map<string, number>()

  scheduleSend(params: {
    recipient: string
    globalRatePerSec: number
    perRecipientRatePerSec?: number
    nowMs?: number
  }): { allowedImmediately: boolean; delayMs: number; scheduledAtMs: number } {
    const now = params.nowMs ?? Date.now()
    const globalIntervalMs = Math.ceil(
      1000 / Math.max(1, params.globalRatePerSec)
    )
    const recipientIntervalMs = Math.ceil(
      1000 / Math.max(0.1, params.perRecipientRatePerSec ?? 1)
    )

    const globalReadyAt = Math.max(now, this.nextAvailableGlobalMs)
    const recipientReadyAt = Math.max(
      now,
      this.nextAvailablePerRecipientMs.get(params.recipient) ?? 0
    )

    const scheduledAtMs = Math.max(globalReadyAt, recipientReadyAt)
    this.nextAvailableGlobalMs = scheduledAtMs + globalIntervalMs
    this.nextAvailablePerRecipientMs.set(
      params.recipient,
      scheduledAtMs + recipientIntervalMs
    )

    const delayMs = Math.max(0, scheduledAtMs - now)
    return {
      allowedImmediately: delayMs === 0,
      delayMs,
      scheduledAtMs,
    }
  }
}

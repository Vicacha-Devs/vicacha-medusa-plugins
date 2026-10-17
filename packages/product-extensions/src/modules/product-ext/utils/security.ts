import { MedusaError } from "@medusajs/framework/utils"

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  і: "i",
  ї: "yi",
  є: "ye",
  ґ: "g",
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "169.254.169.254",
  "0.0.0.0",
])

function isPrivateOrLoopbackIpv4(hostname: string): boolean {
  const parts = hostname.split(".")
  if (parts.length !== 4) {
    return false
  }
  const octets = parts.map((p) => Number(p))
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false
  }
  const [a, b] = octets
  if (a === 0 || a === 10 || a === 127) {
    return true
  }
  if (a === 169 && b === 254) {
    return true
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true
  }
  if (a === 192 && b === 168) {
    return true
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true
  }
  return false
}

function isPrivateOrLoopbackIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:169.254.") ||
    normalized.startsWith("::ffff:7f")
  ) {
    return true
  }
  return false
}

export interface ValidateMediaUrlOptions {
  allowRelative?: boolean
  fieldName?: string
}

export function validateExternalMediaUrl(
  rawUrl: string,
  options: ValidateMediaUrlOptions = {}
): string {
  const fieldName = options.fieldName ?? "url"
  const trimmed = String(rawUrl ?? "").trim()
  if (!trimmed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be a non-empty URL`
    )
  }

  if (options.allowRelative !== false && trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.includes("..")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${fieldName} contains an invalid relative path`
      )
    }
    return trimmed
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} is not a valid URL: "${trimmed}"`
    )
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must use http or https protocol`
    )
  }

  const hostname = parsed.hostname.toLowerCase()
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    isPrivateOrLoopbackIpv4(hostname) ||
    isPrivateOrLoopbackIpv6(hostname)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} points to a restricted internal or loopback host`
    )
  }

  return parsed.toString()
}

export function escapeHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function escapeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return ""
  }
  let text = String(raw)
  const trimmed = text.trimStart()
  if (
    trimmed.length > 0 &&
    /^[=+\-@\t\r]/.test(trimmed) &&
    !/^-?\d+(\.\d+)?$/.test(trimmed)
  ) {
    text = `'${text}`
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function sanitizeFilename(raw: string): string {
  const cleaned = String(raw ?? "")
    .replace(/[\0\r\n]/g, "")
    .replace(/[/\\]+/g, "_")
    .replace(/\.\.+/g, ".")
    .trim()

  if (!cleaned || cleaned === ".") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Attachment filename must be a valid non-empty filename"
    )
  }
  return cleaned.slice(0, 255)
}

export function slugifyAttributeKey(raw: string): string {
  const source = String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")

  let transliterated = ""
  for (const ch of source) {
    if (ch in CYRILLIC_TO_LATIN_MAP) {
      transliterated += CYRILLIC_TO_LATIN_MAP[ch]
    } else {
      transliterated += ch
    }
  }

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")

  if (!slug) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unable to derive a valid attribute key from "${raw}"`
    )
  }
  return slug
}

export function validateHexColor(raw: string, fieldName = "hex_color"): string {
  const trimmed = String(raw ?? "").trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${fieldName} must be a valid hex color (e.g. #1A2B3C)`
    )
  }
  return trimmed.toUpperCase()
}

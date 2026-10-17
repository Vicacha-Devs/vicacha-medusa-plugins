import { MedusaError } from "@medusajs/framework/utils"
import type { StoryRingTheme } from "../types"

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

/**
 * Validates and normalizes an external or relative URL for media, thumbnails, avatars, or CTA links.
 * Blocks dangerous schemes (`javascript:`, `data:`, `vbscript:`, `file:`) to prevent XSS.
 */
export function sanitizeHttpUrl(
  rawUrl: string | undefined | null,
  fieldName = "url",
  allowRelative = true
): string | null {
  if (rawUrl === undefined || rawUrl === null) {
    return null
  }
  const trimmed = String(rawUrl).trim()
  if (!trimmed) {
    return null
  }

  if (allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid ${fieldName}: must be a valid http(s) URL or relative path.`
    )
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported protocol "${parsed.protocol}" in ${fieldName}. Only http: and https: are allowed.`
    )
  }

  return parsed.toString()
}

/**
 * Clamps X/Y hotspot or sticker percentage coordinates strictly into [0, 100].
 */
export function clampCoordinatePercent(value: number): number {
  if (!Number.isFinite(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Coordinate percentage must be a finite number."
    )
  }
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100))
}

/**
 * Normalizes a story group handle into a URL-safe slug.
 */
export function slugifyStoryHandle(input: string): string {
  const slug = String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "highlight"
}

/**
 * Validates an optional CSS hex color or gradient string so arbitrary CSS injection is prevented.
 */
export function sanitizeRingColor(color?: string | null): string | null {
  if (!color) return null
  const trimmed = color.trim()
  if (!trimmed) return null
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return trimmed
  }
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Invalid custom_ring_color "${trimmed}". Must be a hex color (e.g. #FF5500).`
  )
}

export const RING_THEME_GRADIENTS: Record<StoryRingTheme, string> = {
  instagram: "linear-gradient(135deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)",
  tiktok: "linear-gradient(135deg, #00f2fe 0%, #000000 50%, #ff0050 100%)",
  sunset: "linear-gradient(135deg, #ff512f 0%, #dd2476 100%)",
  emerald: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  violet: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  cyber: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
  neon: "linear-gradient(135deg, #a8ff78 0%, #78ffd6 50%, #00f2fe 100%)",
  gold: "linear-gradient(135deg, #f59e0b 0%, #fde68a 50%, #b45309 100%)",
  minimal: "linear-gradient(135deg, #111827 0%, #6b7280 100%)",
  custom: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
}

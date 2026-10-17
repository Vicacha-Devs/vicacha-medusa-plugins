import type { SocialPlatform } from "../../modules/social-commerce/types/index.js"

export type ActiveTab = "accounts" | "feed" | "stories" | "live" | "catalog"

/**
 * Prevents client-side `javascript:` or `data:` XSS in dynamic `href`/`src` attributes.
 */
export const sanitizeClientUrl = (
  rawUrl: string | null | undefined
): string => {
  if (!rawUrl) return "#"
  const trimmed = rawUrl.trim()
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed
  }
  return "#"
}

/**
 * Returns brand badge hex color for each supported social commerce platform.
 */
export const platformBadgeColor = (platform: SocialPlatform): string => {
  switch (platform) {
    case "tiktok":
      return "#000000"
    case "instagram":
      return "#E1306C"
    case "facebook":
      return "#1877F2"
    case "local":
      return "#10B981"
    default:
      return "#6B7280"
  }
}

export const platformBadgeUiColor = (
  platform: SocialPlatform
): "purple" | "blue" | "green" | "orange" | "red" | "grey" => {
  switch (platform) {
    case "tiktok":
      return "purple"
    case "instagram":
      return "red"
    case "facebook":
      return "blue"
    case "local":
      return "green"
    default:
      return "grey"
  }
}

export const statusBadgeUiColor = (
  status: string
): "green" | "red" | "orange" | "blue" | "purple" | "grey" => {
  const normalized = status.toLowerCase()
  if (
    normalized === "connected" ||
    normalized === "active" ||
    normalized === "synced" ||
    normalized === "live"
  ) {
    return "green"
  }
  if (normalized === "scheduled" || normalized === "pending") {
    return "orange"
  }
  if (
    normalized === "error" ||
    normalized === "failed" ||
    normalized === "expired" ||
    normalized === "revoked"
  ) {
    return "red"
  }
  return "grey"
}


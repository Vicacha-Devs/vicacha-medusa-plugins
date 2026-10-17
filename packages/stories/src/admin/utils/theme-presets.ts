import type { StoryRingTheme } from "../../modules/story/types"

export const ADMIN_RING_THEME_PRESETS: Array<{
  id: StoryRingTheme
  label: string
  gradient: string
}> = [
  {
    id: "instagram",
    label: "Instagram Classic",
    gradient:
      "linear-gradient(135deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)",
  },
  {
    id: "tiktok",
    label: "TikTok Pulse",
    gradient:
      "linear-gradient(135deg, #00f2fe 0%, #000000 50%, #ff0050 100%)",
  },
  {
    id: "sunset",
    label: "Sunset Coral",
    gradient: "linear-gradient(135deg, #ff512f 0%, #dd2476 100%)",
  },
  {
    id: "emerald",
    label: "Emerald Mint",
    gradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  },
  {
    id: "violet",
    label: "Electric Violet",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  },
  {
    id: "cyber",
    label: "Cyber Neon",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
  },
  {
    id: "neon",
    label: "Neon Lime",
    gradient: "linear-gradient(135deg, #a8ff78 0%, #78ffd6 50%, #00f2fe 100%)",
  },
  {
    id: "gold",
    label: "Luxury Gold",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fde68a 50%, #b45309 100%)",
  },
  {
    id: "minimal",
    label: "Minimal Monochrome",
    gradient: "linear-gradient(135deg, #111827 0%, #6b7280 100%)",
  },
  {
    id: "custom",
    label: "Custom Hex",
    gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  },
]

export const resolveRingGradient = (
  theme: StoryRingTheme,
  customColor?: string | null
): string => {
  if (theme === "custom" && customColor && /^#[0-9a-fA-F]{3,8}$/.test(customColor)) {
    return customColor
  }
  return (
    ADMIN_RING_THEME_PRESETS.find((p) => p.id === theme)?.gradient ??
    ADMIN_RING_THEME_PRESETS[0].gradient
  )
}

export const sanitizeAdminMediaUrl = (raw?: string | null): string | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}

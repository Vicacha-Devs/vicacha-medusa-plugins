import { SUPPORTED_LOCALES, type SupportedLocale } from "../types"
import { LOCALE_DICTIONARIES } from "./locales"
import type { DocumentTranslations } from "./types"

export * from "./types"
export { LOCALE_DICTIONARIES }

export function normalizeLocale(locale?: string | null): SupportedLocale {
  if (!locale || typeof locale !== "string") {
    return "en"
  }
  const short = locale.trim().toLowerCase().split(/[-_]/)[0] as SupportedLocale
  if ((SUPPORTED_LOCALES as readonly string[]).includes(short)) {
    return short
  }
  return "en"
}

/**
 * Resolves the translation dictionary for a requested locale,
 * merging any merchant-configured custom_translations overrides on top.
 */
export function getTranslations(
  locale?: string | null,
  customTranslations?: Record<string, Partial<DocumentTranslations>> | null
): DocumentTranslations {
  const normalized = normalizeLocale(locale)
  const base = LOCALE_DICTIONARIES[normalized] || LOCALE_DICTIONARIES.en

  if (!customTranslations || typeof customTranslations !== "object") {
    return { ...base }
  }

  const exactOverrides =
    (locale && customTranslations[locale]) ||
    customTranslations[normalized] ||
    {}

  const sanitizedOverrides: Partial<DocumentTranslations> = {}
  for (const [key, value] of Object.entries(exactOverrides)) {
    if (typeof value === "string" && value.trim().length > 0) {
      sanitizedOverrides[key as keyof DocumentTranslations] = value
    }
  }

  return {
    ...base,
    ...sanitizedOverrides,
  }
}

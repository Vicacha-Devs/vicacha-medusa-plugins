import { SUPPORTED_LOCALES, type SupportedLocale } from "../types"
import { ar } from "./locales/ar"
import { de } from "./locales/de"
import { en } from "./locales/en"
import { es } from "./locales/es"
import { fr } from "./locales/fr"
import { it } from "./locales/it"
import { nl } from "./locales/nl"
import { pl } from "./locales/pl"
import { pt } from "./locales/pt"
import { tr } from "./locales/tr"
import type { NotificationTranslationDictionary } from "./types"

export type { NotificationTranslationDictionary }

export const DEFAULT_LOCALE_DICTIONARIES: Record<
  SupportedLocale,
  NotificationTranslationDictionary
> = {
  en,
  es,
  pl,
  de,
  fr,
  pt,
  it,
  nl,
  tr,
  ar,
}

export const RTL_LOCALES: ReadonlyArray<SupportedLocale> = ["ar"]

export function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return "en"
  const clean = input.trim().toLowerCase().split(/[-_]/)[0]
  if ((SUPPORTED_LOCALES as readonly string[]).includes(clean)) {
    return clean as SupportedLocale
  }
  return "en"
}

export function isRtlLocale(locale?: string | null): boolean {
  return RTL_LOCALES.includes(normalizeLocale(locale))
}

function deepMergeDict(
  target: Record<string, any>,
  source?: Record<string, any>
): Record<string, any> {
  if (!source || typeof source !== "object") {
    return target
  }
  const output: Record<string, any> = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue
    }
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof output[key] === "object" &&
      output[key] !== null
    ) {
      output[key] = deepMergeDict(output[key], value)
    } else if (value !== undefined) {
      output[key] = value
    }
  }
  return output
}

export function getNotificationTranslations(
  locale?: string | null,
  customOverrides?: Partial<
    Record<SupportedLocale, Record<string, any>>
  > | null
): Record<string, any> {
  const normalized = normalizeLocale(locale)
  const base =
    DEFAULT_LOCALE_DICTIONARIES[normalized] || DEFAULT_LOCALE_DICTIONARIES.en
  const override = customOverrides?.[normalized]
  return deepMergeDict(base as unknown as Record<string, any>, override)
}

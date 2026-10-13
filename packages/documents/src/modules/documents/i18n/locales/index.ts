import type { SupportedLocale } from "../../types"
import type { DocumentTranslations } from "../types"
import { en } from "./en"
import { es } from "./es"
import { pl } from "./pl"
import { de } from "./de"
import { fr } from "./fr"
import { pt } from "./pt"
import { it } from "./it"
import { nl } from "./nl"
import { tr } from "./tr"
import { ar } from "./ar"

export { en, es, pl, de, fr, pt, it, nl, tr, ar }

export const LOCALE_DICTIONARIES: Record<SupportedLocale, DocumentTranslations> = {
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

import ar from "./json/ar.json"
import de from "./json/de.json"
import en from "./json/en.json"
import es from "./json/es.json"
import fr from "./json/fr.json"
import it from "./json/it.json"
import nl from "./json/nl.json"
import pl from "./json/pl.json"
import pt from "./json/pt.json"
import tr from "./json/tr.json"

export const SUPPORTED_UI_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
] as const

export type SupportedUiLocale = (typeof SUPPORTED_UI_LOCALES)[number]["code"]

export default {
  ar: { translation: ar, dian: ar },
  de: { translation: de, dian: de },
  en: { translation: en, dian: en },
  es: { translation: es, dian: es },
  fr: { translation: fr, dian: fr },
  it: { translation: it, dian: it },
  nl: { translation: nl, dian: nl },
  pl: { translation: pl, dian: pl },
  pt: { translation: pt, dian: pt },
  tr: { translation: tr, dian: tr },
}

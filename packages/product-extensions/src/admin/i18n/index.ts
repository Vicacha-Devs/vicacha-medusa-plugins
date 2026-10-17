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

export default {
  ar: { translation: ar, "product-ext": ar },
  de: { translation: de, "product-ext": de },
  en: { translation: en, "product-ext": en },
  es: { translation: es, "product-ext": es },
  fr: { translation: fr, "product-ext": fr },
  it: { translation: it, "product-ext": it },
  nl: { translation: nl, "product-ext": nl },
  pl: { translation: pl, "product-ext": pl },
  pt: { translation: pt, "product-ext": pt },
  tr: { translation: tr, "product-ext": tr },
}

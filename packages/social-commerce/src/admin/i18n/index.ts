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
  ar: { translation: ar, "social-commerce": ar },
  de: { translation: de, "social-commerce": de },
  en: { translation: en, "social-commerce": en },
  es: { translation: es, "social-commerce": es },
  fr: { translation: fr, "social-commerce": fr },
  it: { translation: it, "social-commerce": it },
  nl: { translation: nl, "social-commerce": nl },
  pl: { translation: pl, "social-commerce": pl },
  pt: { translation: pt, "social-commerce": pt },
  tr: { translation: tr, "social-commerce": tr },
}

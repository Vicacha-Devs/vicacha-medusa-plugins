import type { Locale } from "date-fns"

const resources = {
  translation: {},
} as const

export type Resources = typeof resources

export type Language = {
  code: string
  display_name: string
  ltr: boolean
  date_locale: Locale
}

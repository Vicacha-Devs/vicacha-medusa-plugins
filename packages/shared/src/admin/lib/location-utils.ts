import { COUNTRIES } from "@vicacha-devs/medusa-shared-admin/admin/data/countries"

export const COUNTRY_BY_ISO2: ReadonlyMap<string, string> = new Map(
  COUNTRIES.map((c) => [c.iso_2, c.display_name])
)

export const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) =>
  a.display_name.localeCompare(b.display_name)
)

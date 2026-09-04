import { Select } from "@medusajs/ui"
import { useMemo } from "react"

import { COUNTRIES } from "../../data/countries"
import { useCountries } from "../../hooks/use-countries"

export type CountrySelectProps = {
  value: string
  onChange: (iso2: string, displayName: string) => void
  placeholder?: string
}

export function CountrySelect({ value, onChange, placeholder }: CountrySelectProps) {
  const { countries } = useCountries({
    countries: COUNTRIES,
    limit: COUNTRIES.length,
    order: "name",
  })

  const normalizedValue = value?.toLowerCase() ?? ""

  const selectedLabel = useMemo(
    () => COUNTRIES.find((c) => c.iso_2 === normalizedValue)?.display_name,
    [normalizedValue]
  )

  return (
    <Select
      value={normalizedValue}
      onValueChange={(iso2) => {
        const country = COUNTRIES.find((c) => c.iso_2 === iso2)
        if (country) onChange(iso2, country.display_name)
      }}
    >
      <Select.Trigger>
        <Select.Value placeholder={placeholder}>
          {selectedLabel}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {countries.map((c) => (
          <Select.Item key={c.iso_2} value={c.iso_2}>
            {c.display_name}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}

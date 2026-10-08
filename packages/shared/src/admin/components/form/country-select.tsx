import { Select } from "@medusajs/ui"
import { memo, useState } from "react"

import { COUNTRIES } from "../../data/countries"
import { useCountries } from "../../hooks/use-countries"

export type CountrySelectProps = {
  value: string
  onChange: (iso2: string, displayName: string) => void
  placeholder?: string
}

const COUNTRY_MAP = new Map(COUNTRIES.map((c) => [c.iso_2, c.display_name]))

const CountryItems = memo(({ items }: { items: typeof COUNTRIES }) => {
  return (
    <>
      {items.map((c) => (
        <Select.Item key={c.iso_2} value={c.iso_2}>
          {c.display_name}
        </Select.Item>
      ))}
    </>
  )
})

CountryItems.displayName = "CountryItems"

export function CountrySelect({ value, onChange, placeholder }: CountrySelectProps) {
  const [open, setOpen] = useState(false)

  const { countries } = useCountries({
    countries: COUNTRIES,
    limit: COUNTRIES.length,
    order: "name",
  })

  const normalizedValue = value?.toLowerCase() ?? ""
  const selectedLabel = COUNTRY_MAP.get(normalizedValue)

  const handleValueChange = (iso2: string) => {
    const displayName = COUNTRY_MAP.get(iso2)
    if (displayName) {
      onChange(iso2, displayName)
    }
  }

  return (
    <Select
      value={normalizedValue}
      open={open}
      onOpenChange={setOpen}
      onValueChange={handleValueChange}
    >
      <Select.Trigger>
        <Select.Value placeholder={placeholder}>
          {selectedLabel}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {open ? <CountryItems items={countries} /> : null}
      </Select.Content>
    </Select>
  )
}

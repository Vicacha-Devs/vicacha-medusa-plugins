import { useDataTableDateFilters } from "@medusajs/dashboard/hooks"
import { useMemo } from "react"

export const useManageItemsTableFilters = () => {
  const dateFilters = useDataTableDateFilters()

  return useMemo(
    () => [
      ...dateFilters,
    ],
    [dateFilters]
  )
}

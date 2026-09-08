import { useDataTableDateFilters } from "@vicacha-devs/medusa-shared-admin/admin"
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

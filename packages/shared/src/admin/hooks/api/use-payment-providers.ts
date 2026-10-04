import { useRegions } from "@medusajs/dashboard/hooks"
import { useMemo } from "react"

interface UsePaymentProvidersResult {
  providers: any[]
  isLoading: boolean
  isError: boolean
}

export function usePaymentProviders(currencyCode?: string): UsePaymentProvidersResult {
  const { regions, isLoading, isError } = useRegions({
    fields: "+payment_providers.*",
  })

  const providers = useMemo(() => {
    if (!regions || regions.length === 0) return []

    const activeRegion =
      regions.find(
        (r) => r.currency_code?.toLowerCase() === currencyCode?.toLowerCase()
      ) ?? regions[0]

    return activeRegion?.payment_providers ?? []
  }, [regions, currencyCode])

  return {
    providers,
    isLoading,
    isError,
  }
}
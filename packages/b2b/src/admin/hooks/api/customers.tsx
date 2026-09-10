import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { sdk } from "@vicacha-devs/medusa-shared-admin/admin"

export type AdminCustomerEmployee = {
  id: string
  spending_limit: number | null
  is_admin: boolean
  is_active: boolean
  customer_id: string
  company_id: string
  company: {
    id: string
    name: string
    currency_code: string | null
    logo_url?: string | null
  }
}

type CustomerEmployeeResponse = {
  employee: AdminCustomerEmployee | null
}

export const useCustomerEmployee = (
  customerId: string,
  options?: UseQueryOptions<
    CustomerEmployeeResponse,
    FetchError,
    CustomerEmployeeResponse,
    QueryKey
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      sdk.client.fetch<CustomerEmployeeResponse>(
        `/admin/b2b/customers/${customerId}/employee`
      ),
    queryKey: ["customer_employee", customerId],
    enabled: !!customerId,
    ...options,
  })

  return { employee: data?.employee ?? null, ...rest }
}

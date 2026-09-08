import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { AdminProductVariantListResponse, AdminProductVariantParams } from "@medusajs/framework/types"

import { queryKeysFactory, sdk } from "../../lib"

const PRODUCT_VARIANT_QUERY_KEY = "product_variant" as const
export const productVariantQueryKeys = queryKeysFactory(
  PRODUCT_VARIANT_QUERY_KEY
)

export const useVariants = (
  query?: AdminProductVariantParams,
  options?: Omit<
    UseQueryOptions<
      AdminProductVariantListResponse,
      FetchError,
      AdminProductVariantListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.productVariant.list(query),
    queryKey: productVariantQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}

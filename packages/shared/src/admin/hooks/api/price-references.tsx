import { queryKeysFactory } from "../../lib/query-key-factory"

const PRICE_PREFERENCES_QUERY_KEY = "price-preferences" as const
export const pricePreferencesQueryKeys = queryKeysFactory(
  PRICE_PREFERENCES_QUERY_KEY
)

import { EBoldPaymentProvider } from "../types"

/**
 * Shape representing a Medusa payment provider object or string identifier.
 */
export interface ProviderLike {
  /** Unique provider identifier string (e.g. `pp_bold-online_01H...`) */
  id?: string
  /** Alternative provider identifier property used in certain Medusa API responses */
  provider_id?: string
}

/**
 * Array of all supported Bold payment provider enums.
 */
export const BOLD_PROVIDER_VALUES = Object.values(EBoldPaymentProvider)

/**
 * Parses and returns an array of currently active Bold payment providers from a list of 
 * Medusa registered payment provider instances.
 *
 * This function inspects each provider record against the known `EBoldPaymentProvider` enums 
 * (`bold-online`, `bold-link`, `bold-button`, `bold-terminal`) to identify matches.
 *
 * @param providers - An array of Medusa payment provider objects or raw ID strings.
 * @returns An array containing only the matching `EBoldPaymentProvider` enum values.
 *
 * @example
 * ```ts
 * const medusaProviders = [
 *   { id: "pp_bold-link_01J0A1" },
 *   { id: "pp_bold-terminal_01J0A2" },
 *   { id: "pp_stripe_stripe" }
 * ]
 * 
 * const activeBold = getActiveBoldProviders(medusaProviders)
 * // Result: [EBoldPaymentProvider.LINK, EBoldPaymentProvider.TERMINAL]
 * ```
 */
export const getActiveBoldProviders = (
  providers: (string | ProviderLike)[] = []
): EBoldPaymentProvider[] => {
  const providerIds = providers.map((provider) =>
    typeof provider === "string"
      ? provider
      : provider?.id || provider?.provider_id || ""
  )

  return BOLD_PROVIDER_VALUES.filter((boldProvider) =>
    providerIds.some((id) => id.includes(boldProvider))
  )
}
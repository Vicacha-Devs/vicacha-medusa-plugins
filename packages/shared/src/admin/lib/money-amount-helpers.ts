import { getDecimalDigits } from "@medusajs/dashboard/lib"

/**
 * Returns true if the amount is less than the rounding error for the currency
 * @param amount - The amount to check
 * @param currencyCode - The currency code to check the amount in
 * @returns - True if the amount is less than the rounding error, false otherwise
 *
 * For example returns true if amount is < 0.005 for a USD | EUR etc.
 */
export const isAmountLessThenRoundingError = (
  amount: number,
  currencyCode: string
) => {
  const decimalDigits = getDecimalDigits(currencyCode)
  return Math.abs(amount) < 1 / 10 ** decimalDigits / 2
}

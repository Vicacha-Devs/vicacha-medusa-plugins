import { MedusaError } from "@medusajs/framework/utils"

export { MedusaError }

/**
 * Type guard checking if an unknown error is a `MedusaError` instance.
 */
export function isMedusaError(err: unknown): err is MedusaError {
  return (
    err instanceof MedusaError ||
    Boolean(
      err &&
        typeof err === "object" &&
        "__isMedusaError" in err &&
        (err as { __isMedusaError?: boolean }).__isMedusaError === true
    )
  )
}

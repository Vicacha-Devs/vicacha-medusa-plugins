
/**
 * Utility to inspect standard JS errors, Axios/Fetch responses,
 * and Medusa error payloads for 401/403 API authorization denials.
 */
export const isUnauthorizedError = (error: unknown): boolean => {
  if (!error) return false

  const err = error as Record<string, any>
  const status = err?.status || err?.statusCode || err?.response?.status
  const message = (
    err?.message ||
    err?.response?.data?.message ||
    err?.response?.data?.Message ||
    ""
  ).toLowerCase()
  const type = (err?.type || err?.response?.data?.type || "").toLowerCase()

  return (
    status === 401 ||
    status === 403 ||
    type === "unauthorized" ||
    message.includes("unauthorized") ||
    message.includes("not authorized") ||
    message.includes("403") ||
    message.includes("401") ||
    message.includes("deny") ||
    message.includes("forbidden")
  )
}

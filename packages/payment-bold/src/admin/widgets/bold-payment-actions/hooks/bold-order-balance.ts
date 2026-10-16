import { AdminOrder } from "@medusajs/framework/types"

const PARTIAL_PAYMENT_STATUSES = [
  "partially_paid",
  "partially_captured",
  "partially_authorized",
]

export interface BoldOrderBalanceInfo {
  paymentCollection: NonNullable<AdminOrder["payment_collections"]>[number] | undefined
  paymentCollectionId: string | undefined
  isPartiallyPaid: boolean
  payableAmount: number
  belongsToBold: boolean
  isApproved: boolean
}

export const getBoldOrderBalanceInfo = (order: AdminOrder): BoldOrderBalanceInfo => {
  const collections = order.payment_collections || []
  const orderPaymentStatus = (order.payment_status || "").toLowerCase()
  const pendingDifference = Number(
    (order as any).summary?.pending_difference ?? 0
  )

  const paymentCollection = collections.length
    ? collections.find((pc) => {
        const status = (pc.status || "").toLowerCase()
        return !["captured", "completed"].includes(status)
      }) || collections[collections.length - 1]
    : undefined

  const paymentCollectionId = paymentCollection?.id

  const totalCaptured = collections.reduce((acc, pc) => {
    const pcCaptured = Number(
      (pc as any).captured_amount ??
        (pc.payments || []).reduce(
          (sum, p) => sum + (p.captured_at ? Number(p.amount || 0) : 0),
          0
        )
    )
    return acc + pcCaptured
  }, 0)

  const collectionStatus = (paymentCollection?.status || "").toLowerCase()
  const collectionAmount = Number(paymentCollection?.amount ?? order.total ?? 0)
  const collectionCaptured = Number(
    (paymentCollection as any)?.captured_amount ?? 0
  )
  const collectionRemaining = Math.max(0, collectionAmount - collectionCaptured)

  const isPartiallyPaid =
    PARTIAL_PAYMENT_STATUSES.includes(orderPaymentStatus) ||
    PARTIAL_PAYMENT_STATUSES.includes(collectionStatus) ||
    (totalCaptured > 0 && totalCaptured < Number(order.total || 0)) ||
    (totalCaptured > 0 && pendingDifference > 0)

  const remaining =
    pendingDifference > 0
      ? pendingDifference
      : collectionRemaining > 0
      ? collectionRemaining
      : Math.max(0, Number(order.total || 0) - totalCaptured)

  const payableAmount =
    isPartiallyPaid && remaining > 0 ? remaining : Number(order.total || 0)

  const hasBoldHistory = collections.some((collection) => {
    const sessions = collection.payment_sessions || []
    const payments = collection.payments || []
    const hasBoldSession = sessions.some((s) => s.provider_id?.includes("bold"))
    const hasBoldPayment = payments.some((p) => p.provider_id?.includes("bold"))
    return hasBoldSession || hasBoldPayment
  })

  const belongsToBold = collections.length > 0 && (hasBoldHistory || isPartiallyPaid)

  const deriveIsApproved = (): boolean => {
    if (!paymentCollection) return false
    if (isPartiallyPaid) return false

    if (["paid", "captured"].includes(orderPaymentStatus) && pendingDifference <= 0) {
      return true
    }

    if (["captured", "completed"].includes(collectionStatus)) return true

    const capturedPaymentsAmount = (paymentCollection.payments || []).reduce(
      (sum, p) => sum + (p.captured_at ? Number(p.amount || 0) : 0),
      0
    )
    if (collectionAmount > 0 && capturedPaymentsAmount >= collectionAmount) {
      return true
    }

    const sessions = paymentCollection.payment_sessions || []
    if (
      sessions.some(
        (s) =>
          ["captured", "authorized"].includes(s.status || "") &&
          Number(s.amount || 0) >= collectionAmount
      )
    ) {
      return true
    }

    return false
  }

  return {
    paymentCollection,
    paymentCollectionId,
    isPartiallyPaid,
    payableAmount,
    belongsToBold,
    isApproved: deriveIsApproved(),
  }
}

/**
 * Helper utilities for extracting payment session data consistently
 */

export function extractSessionId(paymentSession: any): string | undefined {
  return paymentSession?.id
}

export function extractPaymentCollectionId(paymentSession: any): string | undefined {
  return paymentSession?.payment_collection_id || paymentSession?.payment_collection?.id
}

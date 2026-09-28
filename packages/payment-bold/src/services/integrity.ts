import crypto from "crypto"

export class BoldIntegrityService {
  /**
   * Timing-safe verification of Bold Webhook HMAC-SHA256 signatures.
   * Concatenates the timestamp header with the raw UTF-8 body string
   * and computes the expected HMAC digest using constant-time comparison.
   *
   * @param rawBody - The raw HTTP request body (string or Buffer) before JSON parsing.
   * @param signatureHeader - The signature string from `x-bold-signature` or `x-signature` header.
   * @param timestampHeader - The timestamp string from `x-bold-timestamp` or `x-timestamp` header.
   * @param secretKey - The Webhook Signing Secret Key provided in the Bold Merchant Dashboard.
   * @returns `true` if the computed signature matches the header signature; otherwise `false`.
   */
  static verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string,
    timestampHeader: string,
    secretKey: string
  ): boolean {
    // 1. Fail immediately if secret key, signature, or timestamp headers are missing
    if (!secretKey || !signatureHeader || !timestampHeader) {
      return false
    }

    // 2. Ensure raw body is a clean UTF-8 string
    const bodyString = Buffer.isBuffer(rawBody)
      ? rawBody.toString("utf-8")
      : rawBody

    // 3. Bold webhook signature format: timestamp + raw UTF-8 JSON payload
    const payloadToSign = `${timestampHeader}${bodyString}`

    // 4. Compute expected HMAC-SHA256 signature hash
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(payloadToSign)
      .digest("hex")

    const signatureBuffer = Buffer.from(signatureHeader, "utf-8")
    const computedBuffer = Buffer.from(computedHash, "utf-8")

    // 5. Length check prior to constant-time comparison
    if (signatureBuffer.length !== computedBuffer.length) {
      return false
    }

    // 6. Timing-safe equality check to prevent timing side-channel attacks
    return crypto.timingSafeEqual(
      new Uint8Array(signatureBuffer),
      new Uint8Array(computedBuffer)
    )
  }

  /**
   * Calculates the SHA-256 integrity signature hash for the storefront Bold Payment Button.
   * Concatenates reference, amount, currency, and secret key.
   *
   * @param reference - The unique payment reference identifier.
   * @param amount - The total payment amount in base currency units (e.g., COP integer).
   * @param currency - The 3-letter currency code (e.g., "COP").
   * @param secretKey - The Integrity / API Secret Key provided in the Bold Merchant Dashboard.
   * @returns SHA-256 hex digest string used to validate the checkout button payload.
   */
  static generateButtonHash(
    reference: string,
    amount: number,
    currency: string,
    secretKey: string
  ): string {
    const rawString = `${reference}${amount}${currency}${secretKey}`
    return crypto.createHash("sha256").update(rawString).digest("hex")
  }
}
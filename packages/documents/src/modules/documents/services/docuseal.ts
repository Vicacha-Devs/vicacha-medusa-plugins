import crypto from "crypto"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  CreateDocusealSubmissionParams,
  DocusealSubmissionResult,
  DocusealSubmitterInput,
  DocumentsPluginOptions,
} from "../types"

export type {
  CreateDocusealSubmissionParams,
  DocusealSubmissionResult,
  DocusealSubmitterInput,
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
]

/**
 * Validates an external URL to prevent Server-Side Request Forgery (SSRF / CWE-918).
 * Blocks loopback, link-local, metadata (169.254.169.254), and RFC1918 private IPs
 * unless the origin explicitly matches the merchant's configured self-hosted `allowedBaseUrl`.
 */
export function validateSafeExternalUrl(
  targetUrl: string,
  allowedBaseUrl?: string | null
): URL {
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid URL format"
    )
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported URL protocol: ${parsed.protocol}`
    )
  }

  if (allowedBaseUrl) {
    try {
      const allowedOrigin = new URL(allowedBaseUrl).origin
      if (parsed.origin === allowedOrigin) {
        return parsed
      }
    } catch {
      // Ignore malformed allowedBaseUrl and enforce strict public host check
    }
  }

  if (parsed.protocol !== "https:") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "External document URLs must use HTTPS"
    )
  }

  const hostname = parsed.hostname.toLowerCase()
  for (const pattern of PRIVATE_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Blocked potentially unsafe private/internal host: ${hostname}`
      )
    }
  }

  return parsed
}

/**
 * Optional Docuseal E-Signature client supporting both Docuseal Cloud (`https://api.docuseal.com`)
 * and self-hosted Docuseal instances (`options.docuseal.base_url`).
 */
export class DocusealService {
  private readonly apiKey: string | null
  private readonly webhookSecret: string | null
  private readonly baseUrl: string

  constructor(options?: DocumentsPluginOptions["docuseal"]) {
    this.apiKey =
      options?.api_key?.trim() ||
      process.env.DOCUSEAL_API_KEY?.trim() ||
      null
    this.webhookSecret =
      options?.webhook_secret?.trim() ||
      process.env.DOCUSEAL_WEBHOOK_SECRET?.trim() ||
      null
    const configuredBase =
      options?.base_url?.trim() ||
      process.env.DOCUSEAL_BASE_URL?.trim() ||
      "https://api.docuseal.com"
    this.baseUrl = configuredBase.replace(/\/+$/, "")
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0)
  }

  hasWebhookSecret(): boolean {
    return Boolean(this.webhookSecret && this.webhookSecret.length > 0)
  }

  /**
   * Verifies the `X-Docuseal-Signature` HMAC-SHA256 header using constant-time comparison.
   */
  verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader?: string | null
  ): boolean {
    if (!this.webhookSecret || !signatureHeader) {
      return false
    }

    const cleanSignature = signatureHeader
      .trim()
      .replace(/^sha256=/i, "")

    const expectedHex = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(typeof rawBody === "string" ? rawBody : new Uint8Array(rawBody))
      .digest("hex")

    const sigBuf = Buffer.from(cleanSignature, "utf8")
    const expBuf = Buffer.from(expectedHex, "utf8")

    if (sigBuf.length !== expBuf.length) {
      return false
    }

    return crypto.timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expBuf))
  }

  /**
   * Creates a signature submission in Docuseal:
   * - Defaults to `POST /submissions/pdf` (zero-config direct PDF signing with embedded anchor tags or default coordinates)
   * - Supports optional `templateId` override via `POST /submissions`
   */
  async createSubmission(
    params: CreateDocusealSubmissionParams
  ): Promise<DocusealSubmissionResult> {
    if (!this.apiKey) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Docuseal integration is not configured. Provide docuseal.api_key in plugin options or DOCUSEAL_API_KEY."
      )
    }

    const role = params.submitter.role?.trim() || "Customer"
    const sendEmail = params.submitter.send_email !== false

    const endpoint = params.templateId
      ? `${this.baseUrl}/submissions`
      : `${this.baseUrl}/submissions/pdf`

    const bodyPayload: Record<string, unknown> = params.templateId
      ? {
          template_id: Number(params.templateId) || params.templateId,
          send_email: sendEmail,
          submitters: [
            {
              role,
              email: params.submitter.email,
              name: params.submitter.name || undefined,
              metadata: params.metadata,
            },
          ],
        }
      : {
          name: params.documentName,
          send_email: sendEmail,
          documents: [
            {
              name: params.documentName,
              file: params.pdfBuffer.toString("base64"),
              fields: [
                {
                  name: "Signature",
                  type: "signature",
                  role,
                  required: true,
                  areas: [
                    {
                      page: 1,
                      x: 0.55,
                      y: 0.82,
                      w: 0.35,
                      h: 0.06,
                    },
                  ],
                },
              ],
            },
          ],
          submitters: [
            {
              role,
              email: params.submitter.email,
              name: params.submitter.name || undefined,
              metadata: params.metadata,
            },
          ],
        }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": this.apiKey,
      },
      body: JSON.stringify(bodyPayload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Docuseal API error (${response.status}): ${errorText.slice(0, 300)}`
      )
    }

    const data = (await response.json()) as unknown

    // Docuseal returns either an array of submitters or a submission object containing submitters
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0] as Record<string, unknown>
      return {
        submission_id: Number(first.submission_id ?? first.id ?? 0),
        submitter_id: first.id ? Number(first.id) : null,
        embed_src: typeof first.embed_src === "string" ? first.embed_src : null,
        status: sendEmail ? "sent" : "pending",
      }
    }

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>
      const submitters = Array.isArray(obj.submitters)
        ? (obj.submitters as Array<Record<string, unknown>>)
        : []
      const firstSub = submitters[0] || obj
      return {
        submission_id: Number(obj.id ?? firstSub.submission_id ?? 0),
        submitter_id: firstSub.id ? Number(firstSub.id) : null,
        embed_src:
          typeof firstSub.embed_src === "string"
            ? firstSub.embed_src
            : typeof obj.embed_src === "string"
              ? obj.embed_src
              : null,
        status: sendEmail ? "sent" : "pending",
      }
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected response payload from Docuseal API"
    )
  }

  /**
   * Downloads a completed signed PDF from Docuseal after validating the URL against SSRF rules.
   */
  async downloadSignedPdf(signedDocumentUrl: string): Promise<Buffer> {
    const validatedUrl = validateSafeExternalUrl(
      signedDocumentUrl,
      this.baseUrl
    )

    const headers: Record<string, string> = {}
    if (
      this.apiKey &&
      validatedUrl.origin === new URL(this.baseUrl).origin
    ) {
      headers["X-Auth-Token"] = this.apiKey
    }

    const response = await fetch(validatedUrl.toString(), {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to download signed PDF (${response.status} ${response.statusText})`
      )
    }

    const arrayBuf = await response.arrayBuffer()
    return Buffer.from(arrayBuf)
  }
}

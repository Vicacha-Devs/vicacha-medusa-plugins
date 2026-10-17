import type { NotificationChannel, NotificationsPluginOptions } from "../types"
import { normalizeE164Phone } from "../utils/security"

const OPT_IN_KEYWORDS = ["JOIN", "START", "OPTIN", "UNSTOP", "YES"]
const OPT_OUT_KEYWORDS = ["STOP", "END", "QUIT", "CANCEL", "UNSUBSCRIBE", "OPTOUT"]

export function normalizeConsentIdentifier(
  channel: NotificationChannel,
  identifier: string
): string {
  return channel === "sms" || channel === "whatsapp"
    ? normalizeE164Phone(identifier) || identifier.trim()
    : identifier.trim()
}

/**
 * Maps an inbound SMS/WhatsApp keyword reply to a consent action (or `null` when not a keyword).
 */
export function parseConsentKeyword(body: string): "opt_in" | "opt_out" | null {
  const keyword = (body || "").trim().toUpperCase()
  if (OPT_IN_KEYWORDS.includes(keyword)) return "opt_in"
  if (OPT_OUT_KEYWORDS.includes(keyword)) return "opt_out"
  return null
}

export type ConsentDecision = {
  allowed: boolean
  reason?: string
  appendStopFooter: boolean
  consentRecordId?: string
}

/**
 * Decides whether sending is permitted given the recipient's existing consent records.
 */
export function evaluateConsent(
  records: Array<Record<string, any>>,
  params: {
    channel: NotificationChannel
    requireExplicitOptIn?: boolean
  },
  options: NotificationsPluginOptions
): ConsentDecision {
  if (records.length > 0) {
    const rec = records[0]
    if (rec.status === "opted_out") {
      return {
        allowed: false,
        reason: `Recipient opted out (${rec.source || "STOP"})`,
        appendStopFooter: false,
        consentRecordId: rec.id,
      }
    }
    if (rec.status === "opted_in") {
      return {
        allowed: true,
        appendStopFooter: !rec.first_message_sent && params.channel === "sms",
        consentRecordId: rec.id,
      }
    }
  }

  const strictConsent =
    params.requireExplicitOptIn ??
    (params.channel === "sms"
      ? Boolean(options.requireSmsConsent)
      : Boolean(options.requireWhatsAppConsent))

  if (strictConsent) {
    return {
      allowed: false,
      reason: "No active opt-in consent record found",
      appendStopFooter: false,
    }
  }

  return {
    allowed: true,
    appendStopFooter: params.channel === "sms",
  }
}

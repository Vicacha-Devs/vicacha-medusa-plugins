import {
  getNotificationTranslations,
  isRtlLocale,
  normalizeLocale,
} from "../i18n"
import type {
  RenderedNotificationPayload,
  RenderTemplateInput,
  SupportedLocale,
  TelegramInlineButton,
  WhatsAppInteractiveButton,
} from "../../../types"
import {
  applyVariableMap,
  getNestedValue,
  multiInterpolateObject,
  multiInterpolateString,
} from "../utils/interpolation"
import {
  calculateSmsSegments,
  escapeHtml,
  sanitizeNotificationHtml,
  sanitizeTelegramHtml,
} from "../utils/security"
import { renderEmailBlockNodes } from "./email"
import { renderSlackBlocks } from "./slack"
import { renderTelegramNodes } from "./telegram"
import { renderWhatsAppNodes } from "./whatsapp"

export type { RenderTemplateInput } from "../../../types"

/**
 * Unified Multi-Channel Notification Renderer.
 * Compiles either a Hierarchical Block Tree (`mode === "blocks"`) or a Raw Template (`mode === "raw"`)
 * into a channel-specific `RenderedNotificationPayload`.
 */
export function renderNotificationTemplate(
  input: RenderTemplateInput
): RenderedNotificationPayload {
  const locale: SupportedLocale = normalizeLocale(
    input.locale || input.pluginOptions?.defaultLocale || "en"
  )
  const translations =
    input.translations ||
    getNotificationTranslations(
      locale,
      input.pluginOptions?.customTranslations
    )

  const enrichedData = applyVariableMap(input.data || {}, input.variable_map)
  const primaryColor = String(input.styles?.primary_color || "#111827")
  const blocks = input.blocks || []

  const interpolatedSubject = input.subject
    ? multiInterpolateString(input.subject, {
        data: enrichedData,
        translations,
      })
    : undefined

  // 1. EMAIL CHANNEL
  if (input.channel === "email") {
    let htmlBody = ""
    let plainText = ""

    if (input.mode === "raw" && input.raw_content) {
      const interpolatedRaw = multiInterpolateString(
        input.raw_content,
        { data: enrichedData, translations },
        { escapeHtmlValues: true }
      )
      htmlBody = sanitizeNotificationHtml(interpolatedRaw)
      plainText = htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    } else {
      const { htmlParts, textParts } = renderEmailBlockNodes(
        blocks,
        enrichedData,
        translations,
        primaryColor
      )
      const storeName = escapeHtml(enrichedData.store_name || "Medusa Store")
      const footerText = escapeHtml(
        translations.general?.questionsContact || ""
      )
      htmlBody = `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${isRtlLocale(locale) ? "rtl" : "ltr"}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 24px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <tr>
      <td style="padding: 20px 24px; background-color: ${escapeHtml(primaryColor)}; color: #ffffff; font-weight: 700; font-size: 16px;">
        ${storeName}
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        ${htmlParts.join("\n        ")}
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        ${footerText}
      </td>
    </tr>
  </table>
</body>
</html>`
      plainText = textParts.join("\n\n")
    }

    return {
      channel: "email",
      template_id: input.template_id,
      template_name: input.template_name,
      locale,
      subject: interpolatedSubject || `${enrichedData.store_name || "Store"} Notification`,
      html: htmlBody,
      text: plainText,
      attachments: input.attachments || [],
    }
  }

  // 2. WHATSAPP / OPENWA CHANNEL
  if (input.channel === "whatsapp") {
    let text = ""
    let buttons: WhatsAppInteractiveButton[] = []

    if (input.mode === "raw" && input.raw_content) {
      text = multiInterpolateString(input.raw_content, {
        data: enrichedData,
        translations,
      })
    } else {
      const rendered = renderWhatsAppNodes(blocks, enrichedData, translations)
      text = rendered.lines.join("\n\n")
      buttons = rendered.buttons
    }

    // Build Meta Cloud API template parameters from variable_map
    const metaBodyParams: Array<{ type: "text"; text: string }> = []
    if (input.variable_map && typeof input.variable_map === "object") {
      for (const dataPath of Object.values(input.variable_map)) {
        const val = getNestedValue(enrichedData, dataPath)
        metaBodyParams.push({
          type: "text",
          text: val !== undefined && val !== null ? String(val) : "",
        })
      }
    }

    const hasAttachments = Boolean(input.attachments && input.attachments.length > 0)
    const messageType = hasAttachments
      ? "document"
      : input.meta_template_name
        ? "template"
        : buttons.length > 0
          ? "interactive"
          : "text"

    return {
      channel: "whatsapp",
      template_id: input.template_id,
      template_name: input.template_name,
      locale,
      text,
      whatsapp_options: {
        message_type: messageType,
        meta_template_name: input.meta_template_name ?? null,
        meta_language_code: input.meta_language_code || locale,
        meta_components:
          metaBodyParams.length > 0
            ? [{ type: "body", parameters: metaBodyParams }]
            : [],
        buttons,
      },
      attachments: input.attachments || [],
    }
  }

  // 3. TELEGRAM CHANNEL
  if (input.channel === "telegram") {
    let htmlText = ""
    let inlineKeyboard: TelegramInlineButton[][] = []

    if (input.mode === "raw" && input.raw_content) {
      const rawInterpolated = multiInterpolateString(input.raw_content, {
        data: enrichedData,
        translations,
      })
      htmlText = sanitizeTelegramHtml(rawInterpolated)
    } else {
      const rendered = renderTelegramNodes(blocks, enrichedData, translations)
      htmlText = rendered.lines.join("\n\n")
      inlineKeyboard = rendered.inlineKeyboard
    }

    return {
      channel: "telegram",
      template_id: input.template_id,
      template_name: input.template_name,
      locale,
      html: htmlText,
      text: htmlText,
      telegram_options: {
        parse_mode: "HTML",
        message_thread_id: input.telegram_thread_id ?? null,
        inline_keyboard: inlineKeyboard,
        disable_web_page_preview: true,
      },
      attachments: input.attachments || [],
    }
  }

  // 4. SLACK CHANNEL
  if (input.channel === "slack") {
    let blocksJson: Array<Record<string, any>> = []
    let fallbackText = ""

    if (input.mode === "raw" && input.raw_content) {
      try {
        const parsed = JSON.parse(input.raw_content)
        blocksJson = multiInterpolateObject(
          Array.isArray(parsed) ? parsed : parsed.blocks || [],
          { data: enrichedData, translations }
        )
        fallbackText = interpolatedSubject || "Medusa Store Notification"
      } catch {
        fallbackText = multiInterpolateString(input.raw_content, {
          data: enrichedData,
          translations,
        })
        blocksJson = [
          {
            type: "section",
            text: { type: "mrkdwn", text: fallbackText },
          },
        ]
      }
    } else {
      const rendered = renderSlackBlocks(blocks, enrichedData, translations)
      blocksJson = rendered.blocks
      fallbackText = rendered.fallbackText
    }

    return {
      channel: "slack",
      template_id: input.template_id,
      template_name: input.template_name,
      locale,
      text: fallbackText,
      blocks_json: blocksJson,
    }
  }

  // 5. SMS & DUMMY SANDBOX CHANNEL
  let smsText = ""
  if (input.mode === "raw" && input.raw_content) {
    smsText = multiInterpolateString(input.raw_content, {
      data: enrichedData,
      translations,
    })
  } else {
    const rendered = renderWhatsAppNodes(blocks, enrichedData, translations)
    smsText = rendered.lines
      .join(" ")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  let consentFooterAppended = false
  if (input.append_sms_consent_footer) {
    const unsubscribeFooter =
      translations.general?.unsubscribeSms || "Reply STOP to opt out."
    if (!smsText.toLowerCase().includes("stop")) {
      smsText = `${smsText.trim()} ${unsubscribeFooter}`
      consentFooterAppended = true
    }
  }

  const segStats = calculateSmsSegments(smsText)

  return {
    channel: input.channel,
    template_id: input.template_id,
    template_name: input.template_name,
    locale,
    subject: interpolatedSubject,
    text: smsText,
    sms_options: {
      encoding: segStats.encoding,
      segments: segStats.segments,
      character_count: segStats.character_count,
      consent_footer_appended: consentFooterAppended,
    },
  }
}

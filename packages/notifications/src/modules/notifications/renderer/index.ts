import {
  getNotificationTranslations,
  isRtlLocale,
  normalizeLocale,
} from "../i18n"
import type {
  NotificationAttachment,
  NotificationChannel,
  NotificationsPluginOptions,
  RenderedNotificationPayload,
  RenderTemplateInput,
  SupportedLocale,
  TelegramInlineButton,
  TemplateBlockNode,
  TemplateMode,
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

export type { RenderTemplateInput } from "../../../types"

function renderEmailBlockNodes(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>,
  primaryColor: string
): { htmlParts: string[]; textParts: string[] } {
  const htmlParts: string[] = []
  const textParts: string[] = []

  for (const node of nodes) {
    const meta = node.metadata || {}
    switch (node.type) {
      case "heading": {
        const level = Math.min(3, Math.max(1, Number(meta.level || 1)))
        const align =
          meta.align === "center" || meta.align === "right"
            ? meta.align
            : "left"
        const text = multiInterpolateString(
          String(meta.text || ""),
          { data, translations },
          { escapeHtmlValues: true }
        )
        const plain = multiInterpolateString(String(meta.text || ""), {
          data,
          translations,
        })
        const fontSize = level === 1 ? "24px" : level === 2 ? "18px" : "15px"
        htmlParts.push(
          `<h${level} style="margin: 12px 0 8px; font-size: ${fontSize}; font-weight: 700; color: #111827; text-align: ${align};">${text}</h${level}>`
        )
        textParts.push(plain.toUpperCase())
        break
      }

      case "text":
      case "section": {
        const align =
          meta.align === "center" || meta.align === "right"
            ? meta.align
            : "left"
        const text = multiInterpolateString(
          String(meta.text || ""),
          { data, translations },
          { escapeHtmlValues: true }
        ).replace(/\n/g, "<br/>")
        const plain = multiInterpolateString(String(meta.text || ""), {
          data,
          translations,
        })
        htmlParts.push(
          `<p style="margin: 8px 0; font-size: 14px; line-height: 1.6; color: #374151; text-align: ${align};">${text}</p>`
        )
        textParts.push(plain)
        if (node.children && node.children.length > 0) {
          const childRendered = renderEmailBlockNodes(
            node.children,
            data,
            translations,
            primaryColor
          )
          htmlParts.push(...childRendered.htmlParts)
          textParts.push(...childRendered.textParts)
        }
        break
      }

      case "separator":
      case "divider": {
        htmlParts.push(
          `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />`
        )
        textParts.push("----------------------------------------")
        break
      }

      case "row": {
        const label = multiInterpolateString(
          String(meta.label || ""),
          { data, translations },
          { escapeHtmlValues: true }
        )
        const value = multiInterpolateString(
          String(meta.value || ""),
          { data, translations },
          { escapeHtmlValues: true }
        )
        const weight = meta.bold ? "700" : "400"
        const fontSize = meta.bold ? "15px" : "14px"
        htmlParts.push(
          `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 4px 0;"><tr><td style="font-size: ${fontSize}; font-weight: ${weight}; color: #4b5563; padding: 4px 0;">${label}</td><td align="right" style="font-size: ${fontSize}; font-weight: ${weight}; color: #111827; padding: 4px 0;">${value}</td></tr></table>`
        )
        textParts.push(
          `${multiInterpolateString(String(meta.label || ""), { data, translations })}: ${multiInterpolateString(String(meta.value || ""), { data, translations })}`
        )
        break
      }

      case "group": {
        const contextKey = String(meta.contextKey || "").trim()
        const scopedData = contextKey
          ? (getNestedValue(data, contextKey) as Record<string, any>) || data
          : data
        if (node.children && node.children.length > 0) {
          const childRendered = renderEmailBlockNodes(
            node.children,
            scopedData,
            translations,
            primaryColor
          )
          htmlParts.push(
            `<div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px; margin: 8px 0;">${childRendered.htmlParts.join("\n")}</div>`
          )
          textParts.push(...childRendered.textParts)
        }
        break
      }

      case "repeater": {
        const arrayKey = String(meta.arrayKey || "items").trim()
        const list = getNestedValue(data, arrayKey)
        if (Array.isArray(list) && node.children && node.children.length > 0) {
          for (const item of list) {
            const itemContext =
              item && typeof item === "object"
                ? { ...data, ...item, item }
                : { ...data, item }
            const childRendered = renderEmailBlockNodes(
              node.children,
              itemContext,
              translations,
              primaryColor
            )
            htmlParts.push(...childRendered.htmlParts)
            textParts.push(...childRendered.textParts)
          }
        }
        break
      }

      case "product-item": {
        if (meta.variant === "inventory_item") {
          const sku = escapeHtml(data.sku || "N/A")
          const title = escapeHtml(data.title || "Item")
          const locationName = escapeHtml(data.location_name || "Warehouse")
          const stocked = escapeHtml(data.stocked_quantity ?? 0)
          const available = escapeHtml(data.available_quantity ?? 0)
          htmlParts.push(
            `<div style="padding: 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 6px; margin: 8px 0;">
              <div style="font-weight: 700; color: #991b1b; font-size: 14px;">${title} (SKU: ${sku})</div>
              <div style="font-size: 13px; color: #7f1d1d; margin-top: 4px;">Location: ${locationName} | Available: <strong>${available}</strong> (Stocked: ${stocked})</div>
            </div>`
          )
          textParts.push(
            `[Inventory] ${data.title || "Item"} (SKU: ${data.sku || "N/A"}) - Location: ${data.location_name || "Warehouse"} | Available: ${data.available_quantity ?? 0}`
          )
        } else {
          const title = escapeHtml(data.title || "Item")
          const variantTitle = data.variant_title
            ? ` - ${escapeHtml(data.variant_title)}`
            : ""
          const sku =
            meta.showSku && data.sku
              ? `<div style="font-size: 12px; color: #6b7280;">SKU: ${escapeHtml(data.sku)}</div>`
              : ""
          const qty = escapeHtml(data.quantity ?? 1)
          const totalFormatted = escapeHtml(
            data.total_formatted || data.unit_price_formatted || ""
          )
          htmlParts.push(
            `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-bottom: 1px solid #f3f4f6; padding: 8px 0;">
              <tr>
                <td style="font-size: 14px; color: #111827; font-weight: 600;">${title}${variantTitle}${sku}</td>
                <td align="right" style="font-size: 13px; color: #4b5563; white-space: nowrap;">x${qty} &middot; <strong style="color: #111827;">${totalFormatted}</strong></td>
              </tr>
            </table>`
          )
          textParts.push(
            `- ${data.title || "Item"}${data.variant_title ? ` (${data.variant_title})` : ""} x${data.quantity ?? 1}: ${data.total_formatted || ""}`
          )
        }
        break
      }

      case "button":
      case "actions": {
        const buttons: Array<{ text?: string; title?: string; url?: string }> =
          Array.isArray(meta.buttons)
            ? meta.buttons
            : [{ text: meta.text, url: meta.url }]
        const btnHtml: string[] = []
        for (const b of buttons) {
          const label = multiInterpolateString(
            String(b.text || b.title || "Open"),
            { data, translations },
            { escapeHtmlValues: true }
          )
          const rawUrl = multiInterpolateString(String(b.url || "#"), {
            data,
            translations,
          })
          const safeUrl = /^https?:\/\//i.test(rawUrl)
            ? escapeHtml(rawUrl)
            : "#"
          btnHtml.push(
            `<a href="${safeUrl}" style="display: inline-block; background: ${escapeHtml(primaryColor)}; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 6px 4px;">${label}</a>`
          )
          textParts.push(`${label}: ${rawUrl}`)
        }
        htmlParts.push(
          `<div style="text-align: ${meta.align === "left" ? "left" : "center"}; margin: 16px 0;">${btnHtml.join(" ")}</div>`
        )
        break
      }

      case "attachment": {
        const desc = multiInterpolateString(
          String(meta.description || "Attached PDF Document"),
          { data, translations },
          { escapeHtmlValues: true }
        )
        htmlParts.push(
          `<div style="padding: 10px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 13px; color: #1e40af; margin: 12px 0;">📎 ${desc}</div>`
        )
        textParts.push(`[Attachment: ${desc}]`)
        break
      }
    }
  }

  return { htmlParts, textParts }
}

function renderWhatsAppNodes(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>
): { lines: string[]; buttons: WhatsAppInteractiveButton[] } {
  const lines: string[] = []
  const buttons: WhatsAppInteractiveButton[] = []

  for (const node of nodes) {
    const meta = node.metadata || {}
    switch (node.type) {
      case "heading": {
        const text = multiInterpolateString(String(meta.text || ""), {
          data,
          translations,
        })
        lines.push(`*${text}*`)
        break
      }
      case "text":
      case "section": {
        lines.push(
          multiInterpolateString(String(meta.text || ""), {
            data,
            translations,
          })
        )
        if (node.children?.length) {
          const child = renderWhatsAppNodes(node.children, data, translations)
          lines.push(...child.lines)
          buttons.push(...child.buttons)
        }
        break
      }
      case "separator":
      case "divider": {
        lines.push("────────────────────")
        break
      }
      case "row": {
        const label = multiInterpolateString(String(meta.label || ""), {
          data,
          translations,
        })
        const value = multiInterpolateString(String(meta.value || ""), {
          data,
          translations,
        })
        lines.push(
          meta.bold ? `*${label}:* *${value}*` : `• ${label}: ${value}`
        )
        break
      }
      case "repeater": {
        const arrayKey = String(meta.arrayKey || "items").trim()
        const list = getNestedValue(data, arrayKey)
        if (Array.isArray(list) && node.children?.length) {
          for (const item of list) {
            const itemContext =
              item && typeof item === "object"
                ? { ...data, ...item, item }
                : { ...data, item }
            const child = renderWhatsAppNodes(
              node.children,
              itemContext,
              translations
            )
            lines.push(...child.lines)
          }
        }
        break
      }
      case "product-item": {
        if (meta.variant === "inventory_item") {
          lines.push(
            `• *${data.title || "Item"}* (\`${data.sku || "N/A"}\`) — Available: *${data.available_quantity ?? 0}* (${data.location_name || "Warehouse"})`
          )
        } else {
          lines.push(
            `• ${data.quantity ?? 1}x *${data.title || "Item"}* — ${data.total_formatted || ""}`
          )
        }
        break
      }
      case "button":
      case "actions": {
        const rawButtons: Array<Record<string, any>> = Array.isArray(
          meta.buttons
        )
          ? meta.buttons
          : [{ id: "btn_1", title: meta.text, url: meta.url }]
        for (const [idx, b] of rawButtons.entries()) {
          const title = multiInterpolateString(
            String(b.title || b.text || "Open"),
            { data, translations }
          )
          const url = b.url
            ? multiInterpolateString(String(b.url), { data, translations })
            : undefined
          buttons.push({
            id: String(b.id || `btn_${idx + 1}`),
            title,
            url,
          })
        }
        break
      }
    }
  }

  return { lines, buttons }
}

function renderTelegramNodes(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>
): { lines: string[]; inlineKeyboard: TelegramInlineButton[][] } {
  const lines: string[] = []
  const inlineKeyboard: TelegramInlineButton[][] = []

  for (const node of nodes) {
    const meta = node.metadata || {}
    switch (node.type) {
      case "heading": {
        const raw = multiInterpolateString(String(meta.text || ""), {
          data,
          translations,
        })
        lines.push(`<b>${escapeHtml(raw)}</b>`)
        break
      }
      case "text":
      case "section": {
        const raw = multiInterpolateString(String(meta.text || ""), {
          data,
          translations,
        })
        lines.push(sanitizeTelegramHtml(raw))
        if (node.children?.length) {
          const child = renderTelegramNodes(node.children, data, translations)
          lines.push(...child.lines)
          inlineKeyboard.push(...child.inlineKeyboard)
        }
        break
      }
      case "separator":
      case "divider": {
        lines.push("⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯")
        break
      }
      case "row": {
        const label = escapeHtml(
          multiInterpolateString(String(meta.label || ""), {
            data,
            translations,
          })
        )
        const value = escapeHtml(
          multiInterpolateString(String(meta.value || ""), {
            data,
            translations,
          })
        )
        lines.push(
          meta.bold
            ? `<b>${label}: ${value}</b>`
            : `• ${label}: <code>${value}</code>`
        )
        break
      }
      case "repeater": {
        const arrayKey = String(meta.arrayKey || "items").trim()
        const list = getNestedValue(data, arrayKey)
        if (Array.isArray(list) && node.children?.length) {
          for (const item of list) {
            const itemContext =
              item && typeof item === "object"
                ? { ...data, ...item, item }
                : { ...data, item }
            const child = renderTelegramNodes(
              node.children,
              itemContext,
              translations
            )
            lines.push(...child.lines)
          }
        }
        break
      }
      case "product-item": {
        if (meta.variant === "inventory_item") {
          lines.push(
            `• <b>${escapeHtml(data.title || "Item")}</b> (<code>${escapeHtml(data.sku || "N/A")}</code>) — Available: <b>${escapeHtml(data.available_quantity ?? 0)}</b> (${escapeHtml(data.location_name || "Warehouse")})`
          )
        } else {
          lines.push(
            `• ${escapeHtml(data.quantity ?? 1)}x <b>${escapeHtml(data.title || "Item")}</b> — <code>${escapeHtml(data.total_formatted || "")}</code>`
          )
        }
        break
      }
      case "button":
      case "actions": {
        const rawButtons: Array<Record<string, any>> = Array.isArray(
          meta.buttons
        )
          ? meta.buttons
          : [{ text: meta.text, url: meta.url }]
        const rowButtons: TelegramInlineButton[] = []
        for (const b of rawButtons) {
          const text = multiInterpolateString(
            String(b.text || b.title || "Open"),
            { data, translations }
          )
          const url = b.url
            ? multiInterpolateString(String(b.url), { data, translations })
            : undefined
          rowButtons.push({
            text,
            ...(url ? { url } : { callback_data: String(b.id || "action") }),
          })
        }
        if (rowButtons.length > 0) {
          inlineKeyboard.push(rowButtons)
        }
        break
      }
    }
  }

  return { lines, inlineKeyboard }
}

function renderSlackBlocks(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>
): { blocks: Array<Record<string, any>>; fallbackText: string } {
  const blocks: Array<Record<string, any>> = []
  const textLines: string[] = []

  for (const node of nodes) {
    const meta = node.metadata || {}
    switch (node.type) {
      case "heading": {
        const text = multiInterpolateString(String(meta.text || ""), {
          data,
          translations,
        })
        textLines.push(text)
        blocks.push({
          type: "header",
          text: {
            type: "plain_text",
            text: text.slice(0, 150),
            emoji: true,
          },
        })
        break
      }
      case "text":
      case "section": {
        const text = multiInterpolateString(String(meta.text || ""), {
          data,
          translations,
        })
        textLines.push(text)
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        })
        break
      }
      case "row": {
        const label = multiInterpolateString(String(meta.label || ""), {
          data,
          translations,
        })
        const value = multiInterpolateString(String(meta.value || ""), {
          data,
          translations,
        })
        textLines.push(`${label}: ${value}`)
        blocks.push({
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*${label}*` },
            { type: "mrkdwn", text: value },
          ],
        })
        break
      }
      case "divider":
      case "separator": {
        blocks.push({ type: "divider" })
        break
      }
      case "button":
      case "actions": {
        const rawButtons: Array<Record<string, any>> = Array.isArray(
          meta.buttons
        )
          ? meta.buttons
          : [{ text: meta.text, url: meta.url }]
        const elements = rawButtons.map((b, idx) => ({
          type: "button",
          action_id: String(b.id || `action_${idx + 1}`),
          text: {
            type: "plain_text",
            text: multiInterpolateString(
              String(b.text || b.title || "View"),
              { data, translations }
            ).slice(0, 75),
            emoji: true,
          },
          url: multiInterpolateString(String(b.url || data.store_url || ""), {
            data,
            translations,
          }),
        }))
        if (elements.length > 0) {
          blocks.push({ type: "actions", elements })
        }
        break
      }
    }
  }

  return {
    blocks,
    fallbackText: textLines.join("\n").trim() || "Medusa Store Notification",
  }
}

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

import type { TemplateBlockNode } from "../../../types"
import {
  getNestedValue,
  multiInterpolateString,
} from "../utils/interpolation"
import { escapeHtml } from "../utils/security"
import {
  buildRepeaterItemContext,
  getBlockChildren,
  getBlockMeta,
  isEmptyInterpolatedValue,
} from "./block-helpers"

export function renderEmailBlockNodes(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>,
  primaryColor: string,
  arrayPath?: string
): { htmlParts: string[]; textParts: string[] } {
  const htmlParts: string[] = []
  const textParts: string[] = []

  for (const node of nodes) {
    const meta = getBlockMeta(node)
    const children = getBlockChildren(node, meta)
    switch (node.type) {
      case "heading": {
        const rawText = String(meta.text ?? meta.value ?? "")
        const plain = multiInterpolateString(
          rawText,
          { data, translations },
          { arrayPath }
        )
        if (isEmptyInterpolatedValue(plain)) {
          break
        }
        const level = Math.min(3, Math.max(1, Number(meta.level || 1)))
        const align =
          meta.align === "center" || meta.align === "right"
            ? meta.align
            : "left"
        const text = multiInterpolateString(
          rawText,
          { data, translations },
          { escapeHtmlValues: true, arrayPath }
        )
        const fontSize = level === 1 ? "24px" : level === 2 ? "18px" : "15px"
        htmlParts.push(
          `<h${level} style="margin: 12px 0 8px; font-size: ${fontSize}; font-weight: 700; color: #111827; text-align: ${align};">${text}</h${level}>`
        )
        textParts.push(plain.toUpperCase())
        break
      }

      case "text":
      case "section": {
        const rawText = String(meta.text ?? meta.value ?? "")
        const plain = multiInterpolateString(
          rawText,
          { data, translations },
          { arrayPath }
        )
        if (!isEmptyInterpolatedValue(plain)) {
          const align =
            meta.align === "center" || meta.align === "right"
              ? meta.align
              : "left"
          const text = multiInterpolateString(
            rawText,
            { data, translations },
            { escapeHtmlValues: true, arrayPath }
          ).replace(/\n/g, "<br/>")
          htmlParts.push(
            `<p style="margin: 8px 0; font-size: 14px; line-height: 1.6; color: #374151; text-align: ${align};">${text}</p>`
          )
          textParts.push(plain)
        }
        if (children.length > 0) {
          const childRendered = renderEmailBlockNodes(
            children,
            data,
            translations,
            primaryColor,
            arrayPath
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
        const rawLabel = String(meta.label ?? "")
        const rawValue = String(meta.value ?? "")
        const plainValue = multiInterpolateString(
          rawValue,
          { data, translations },
          { arrayPath }
        )
        if (isEmptyInterpolatedValue(plainValue)) {
          break
        }
        const label = multiInterpolateString(
          rawLabel,
          { data, translations },
          { escapeHtmlValues: true, arrayPath }
        )
        const value = multiInterpolateString(
          rawValue,
          { data, translations },
          { escapeHtmlValues: true, arrayPath }
        )
        const weight = meta.bold ? "700" : "400"
        const fontSize = meta.bold ? "15px" : "14px"
        htmlParts.push(
          `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 4px 0;"><tr><td style="font-size: ${fontSize}; font-weight: ${weight}; color: #4b5563; padding: 4px 0;">${label}</td><td align="right" style="font-size: ${fontSize}; font-weight: ${weight}; color: #111827; padding: 4px 0;">${value}</td></tr></table>`
        )
        textParts.push(
          `${multiInterpolateString(rawLabel, { data, translations }, { arrayPath })}: ${plainValue}`
        )
        break
      }

      case "group": {
        const contextKey = String(meta.contextKey || "").trim()
        const scopedData = contextKey
          ? (getNestedValue(data, contextKey) as Record<string, any>) || data
          : data
        if (children.length > 0) {
          const childRendered = renderEmailBlockNodes(
            children,
            scopedData,
            translations,
            primaryColor,
            arrayPath
          )
          if (childRendered.htmlParts.length > 0) {
            htmlParts.push(
              `<div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px; margin: 8px 0;">${childRendered.htmlParts.join("\n")}</div>`
            )
            textParts.push(...childRendered.textParts)
          }
        }
        break
      }

      case "repeater": {
        const arrayKey = String(meta.arrayKey || meta.arrayPath || "items").trim()
        const list = getNestedValue(data, arrayKey)
        if (Array.isArray(list) && list.length > 0 && children.length > 0) {
          for (const item of list) {
            const itemContext = buildRepeaterItemContext(data, item, arrayKey)
            const childRendered = renderEmailBlockNodes(
              children,
              itemContext,
              translations,
              primaryColor,
              arrayKey
            )
            htmlParts.push(...childRendered.htmlParts)
            textParts.push(...childRendered.textParts)
          }
        } else if (Array.isArray(meta.emptyBlocks) && meta.emptyBlocks.length > 0) {
          const emptyRendered = renderEmailBlockNodes(
            meta.emptyBlocks,
            data,
            translations,
            primaryColor,
            arrayPath
          )
          htmlParts.push(...emptyRendered.htmlParts)
          textParts.push(...emptyRendered.textParts)
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
            { escapeHtmlValues: true, arrayPath }
          )
          const rawUrl = multiInterpolateString(
            String(b.url || "#"),
            { data, translations },
            { arrayPath }
          )
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
          { escapeHtmlValues: true, arrayPath }
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


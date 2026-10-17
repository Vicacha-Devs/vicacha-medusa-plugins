import type {
  TelegramInlineButton,
  TemplateBlockNode,
} from "../../../types"
import {
  getNestedValue,
  multiInterpolateString,
} from "../utils/interpolation"
import { escapeHtml, sanitizeTelegramHtml } from "../utils/security"
import {
  buildRepeaterItemContext,
  getBlockChildren,
  getBlockMeta,
  isEmptyInterpolatedValue,
} from "./block-helpers"

export function renderTelegramNodes(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>,
  arrayPath?: string
): { lines: string[]; inlineKeyboard: TelegramInlineButton[][] } {
  const lines: string[] = []
  const inlineKeyboard: TelegramInlineButton[][] = []

  for (const node of nodes) {
    const meta = getBlockMeta(node)
    const children = getBlockChildren(node, meta)
    switch (node.type) {
      case "heading": {
        const raw = multiInterpolateString(
          String(meta.text ?? meta.value ?? ""),
          { data, translations },
          { arrayPath }
        )
        if (!isEmptyInterpolatedValue(raw)) {
          lines.push(`<b>${escapeHtml(raw)}</b>`)
        }
        break
      }
      case "text":
      case "section": {
        const raw = multiInterpolateString(
          String(meta.text ?? meta.value ?? ""),
          { data, translations },
          { arrayPath }
        )
        if (!isEmptyInterpolatedValue(raw)) {
          lines.push(sanitizeTelegramHtml(raw))
        }
        if (children.length > 0) {
          const child = renderTelegramNodes(
            children,
            data,
            translations,
            arrayPath
          )
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
        const rawLabel = multiInterpolateString(
          String(meta.label ?? ""),
          { data, translations },
          { arrayPath }
        )
        const rawValue = multiInterpolateString(
          String(meta.value ?? ""),
          { data, translations },
          { arrayPath }
        )
        if (!isEmptyInterpolatedValue(rawValue)) {
          const label = escapeHtml(rawLabel)
          const value = escapeHtml(rawValue)
          lines.push(
            meta.bold
              ? `<b>${label}: ${value}</b>`
              : `• ${label}: <code>${value}</code>`
          )
        }
        break
      }
      case "repeater": {
        const arrayKey = String(meta.arrayKey || meta.arrayPath || "items").trim()
        const list = getNestedValue(data, arrayKey)
        if (Array.isArray(list) && list.length > 0 && children.length > 0) {
          for (const item of list) {
            const itemContext = buildRepeaterItemContext(data, item, arrayKey)
            const child = renderTelegramNodes(
              children,
              itemContext,
              translations,
              arrayKey
            )
            lines.push(...child.lines)
          }
        } else if (Array.isArray(meta.emptyBlocks) && meta.emptyBlocks.length > 0) {
          const empty = renderTelegramNodes(
            meta.emptyBlocks,
            data,
            translations,
            arrayPath
          )
          lines.push(...empty.lines)
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
            { data, translations },
            { arrayPath }
          )
          const url = b.url
            ? multiInterpolateString(
                String(b.url),
                { data, translations },
                { arrayPath }
              )
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


import type {
  TemplateBlockNode,
  WhatsAppInteractiveButton,
} from "../../../types"
import {
  getNestedValue,
  multiInterpolateString,
} from "../utils/interpolation"
import {
  buildRepeaterItemContext,
  getBlockChildren,
  getBlockMeta,
  isEmptyInterpolatedValue,
} from "./block-helpers"

export function renderWhatsAppNodes(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>,
  arrayPath?: string
): { lines: string[]; buttons: WhatsAppInteractiveButton[] } {
  const lines: string[] = []
  const buttons: WhatsAppInteractiveButton[] = []

  for (const node of nodes) {
    const meta = getBlockMeta(node)
    const children = getBlockChildren(node, meta)
    switch (node.type) {
      case "heading": {
        const text = multiInterpolateString(
          String(meta.text ?? meta.value ?? ""),
          { data, translations },
          { arrayPath }
        )
        if (!isEmptyInterpolatedValue(text)) {
          lines.push(`*${text}*`)
        }
        break
      }
      case "text":
      case "section": {
        const text = multiInterpolateString(
          String(meta.text ?? meta.value ?? ""),
          { data, translations },
          { arrayPath }
        )
        if (!isEmptyInterpolatedValue(text)) {
          lines.push(text)
        }
        if (children.length > 0) {
          const child = renderWhatsAppNodes(
            children,
            data,
            translations,
            arrayPath
          )
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
        const label = multiInterpolateString(
          String(meta.label ?? ""),
          { data, translations },
          { arrayPath }
        )
        const value = multiInterpolateString(
          String(meta.value ?? ""),
          { data, translations },
          { arrayPath }
        )
        if (!isEmptyInterpolatedValue(value)) {
          lines.push(
            meta.bold ? `*${label}:* *${value}*` : `• ${label}: ${value}`
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
            const child = renderWhatsAppNodes(
              children,
              itemContext,
              translations,
              arrayKey
            )
            lines.push(...child.lines)
          }
        } else if (Array.isArray(meta.emptyBlocks) && meta.emptyBlocks.length > 0) {
          const empty = renderWhatsAppNodes(
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


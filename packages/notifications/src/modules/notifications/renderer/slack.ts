import type { TemplateBlockNode } from "../../../types"
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

export function renderSlackBlocks(
  nodes: TemplateBlockNode[],
  data: Record<string, any>,
  translations: Record<string, any>,
  arrayPath?: string
): { blocks: Array<Record<string, any>>; fallbackText: string } {
  const blocks: Array<Record<string, any>> = []
  const textLines: string[] = []

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
          textLines.push(text)
          blocks.push({
            type: "header",
            text: {
              type: "plain_text",
              text: text.slice(0, 150),
              emoji: true,
            },
          })
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
          textLines.push(text)
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text,
            },
          })
        }
        if (children.length > 0) {
          const child = renderSlackBlocks(
            children,
            data,
            translations,
            arrayPath
          )
          blocks.push(...child.blocks)
          if (child.fallbackText) textLines.push(child.fallbackText)
        }
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
          textLines.push(`${label}: ${value}`)
          blocks.push({
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*${label}*` },
              { type: "mrkdwn", text: value },
            ],
          })
        }
        break
      }
      case "repeater": {
        const arrayKey = String(meta.arrayKey || meta.arrayPath || "items").trim()
        const list = getNestedValue(data, arrayKey)
        if (Array.isArray(list) && list.length > 0 && children.length > 0) {
          for (const item of list) {
            const itemContext = buildRepeaterItemContext(data, item, arrayKey)
            const child = renderSlackBlocks(
              children,
              itemContext,
              translations,
              arrayKey
            )
            blocks.push(...child.blocks)
            if (child.fallbackText) textLines.push(child.fallbackText)
          }
        } else if (Array.isArray(meta.emptyBlocks) && meta.emptyBlocks.length > 0) {
          const empty = renderSlackBlocks(
            meta.emptyBlocks,
            data,
            translations,
            arrayPath
          )
          blocks.push(...empty.blocks)
          if (empty.fallbackText) textLines.push(empty.fallbackText)
        }
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
              { data, translations },
              { arrayPath }
            ).slice(0, 75),
            emoji: true,
          },
          url: multiInterpolateString(
            String(b.url || data.store_url || ""),
            { data, translations },
            { arrayPath }
          ),
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

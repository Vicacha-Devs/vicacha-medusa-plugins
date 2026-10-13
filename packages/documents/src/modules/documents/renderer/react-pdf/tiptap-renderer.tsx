import React from "react"
import { Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#3f3f46",
    marginBottom: 4,
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 6,
  },
  bullet: {
    width: 10,
    fontSize: 9,
    color: "#52525b",
  },
  listItemText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
    color: "#3f3f46",
  },
})

interface TipTapNode {
  type?: string
  text?: string
  marks?: Array<{ type: string }>
  content?: TipTapNode[]
}

function renderInlineNodes(nodes: TipTapNode[] = [], keyPrefix = "n"): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`
    if (node.type === "text" && typeof node.text === "string") {
      const isBold = node.marks?.some((m) => m.type === "bold" || m.type === "strong")
      const isItalic = node.marks?.some((m) => m.type === "italic" || m.type === "em")
      return (
        <Text
          key={key}
          style={[
            isBold ? styles.bold : {},
            isItalic ? styles.italic : {},
          ]}
        >
          {node.text}
        </Text>
      )
    }
    if (node.type === "hardBreak") {
      return <Text key={key}>{"\n"}</Text>
    }
    if (Array.isArray(node.content)) {
      return <Text key={key}>{renderInlineNodes(node.content, key)}</Text>
    }
    return null
  })
}

function renderTipTapAst(doc: TipTapNode): React.ReactNode {
  if (!Array.isArray(doc.content)) {
    return null
  }
  return doc.content.map((block, idx) => {
    const key = `block-${idx}`
    if (block.type === "paragraph" || block.type === "heading") {
      return (
        <Text key={key} style={styles.paragraph}>
          {renderInlineNodes(block.content, key)}
        </Text>
      )
    }
    if (block.type === "bulletList" || block.type === "orderedList") {
      const isOrdered = block.type === "orderedList"
      return (
        <View key={key} style={{ marginBottom: 4 }}>
          {(block.content || []).map((li, liIdx) => (
            <View key={`${key}-li-${liIdx}`} style={styles.listItem}>
              <Text style={styles.bullet}>
                {isOrdered ? `${liIdx + 1}.` : "•"}
              </Text>
              <Text style={styles.listItemText}>
                {li.content
                  ?.map((child, cIdx) =>
                    renderInlineNodes(child.content || [child], `${key}-${liIdx}-${cIdx}`)
                  )}
              </Text>
            </View>
          ))}
        </View>
      )
    }
    return null
  })
}

/**
 * Safely renders rich text notes stored either as TipTap JSON AST, basic HTML, or plain text
 * into @react-pdf/renderer primitives (inspired by @agilo/medusa-invoices-plugin).
 */
export const TipTapNotesRenderer: React.FC<{ content?: string | null }> = ({
  content,
}) => {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return null
  }

  const trimmed = content.trim()

  // 1. Try parsing as TipTap JSON document
  if (trimmed.startsWith("{") && trimmed.includes('"type"')) {
    try {
      const parsed = JSON.parse(trimmed) as TipTapNode
      if (parsed && parsed.type === "doc") {
        return <View>{renderTipTapAst(parsed)}</View>
      }
    } catch {
      // Fall through to HTML/plain-text handling
    }
  }

  // 2. Strip HTML tags into clean lines while preserving paragraph and list breaks
  const normalizedText = trimmed
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()

  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <View>
      {lines.map((line, i) => (
        <Text key={`line-${i}`} style={styles.paragraph}>
          {line}
        </Text>
      ))}
    </View>
  )
}

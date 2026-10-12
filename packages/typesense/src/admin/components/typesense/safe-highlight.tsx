import React from "react"

/**
 * Safely renders `<mark>...</mark>` highlight snippets from Typesense as React elements
 * without ever using dangerouslySetInnerHTML or innerHTML.
 */
export function renderSafeHighlight(snippet: string): React.ReactNode {
  if (!snippet) return null
  const parts = snippet.split(/(<mark>.*?<\/mark>)/g)
  return parts.map((part, idx) => {
    if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
      const inner = part.slice(6, -7)
      return (
        <mark
          key={idx}
          className="rounded bg-amber-200 px-1 font-medium text-amber-950"
        >
          {inner}
        </mark>
      )
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

import { escapeHtml } from "./security"

/**
 * Safely resolves a dot-separated path (including array indices like `items.0.title`
 * or `labels.0.tracking_number`) against an object without prototype traversal.
 */
export function getNestedValue(
  source: Record<string, any> | null | undefined,
  path: string
): unknown {
  if (!source || typeof source !== "object" || !path) {
    return undefined
  }

  const segments = path
    .trim()
    .replace(/^\.+/, "")
    .split(".")
    .filter(Boolean)

  let current: any = source
  for (const segment of segments) {
    if (
      segment === "__proto__" ||
      segment === "constructor" ||
      segment === "prototype"
    ) {
      return undefined
    }
    if (current === null || current === undefined) {
      return undefined
    }
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      current = current[Number(segment)]
    } else if (typeof current === "object" && segment in current) {
      current = current[segment]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Resolves an explicit variable_map (`@sam-ael/medusa-plugin-mailer` style)
 * where keys are template variable names and values are entity data paths
 * (e.g. `{ first_name: "customer.first_name", tracking_number: "labels.0.tracking_number" }`),
 * merging the mapped top-level variables into `data`.
 */
export function applyVariableMap(
  data: Record<string, any>,
  variableMap?: Record<string, string> | null
): Record<string, any> {
  if (!variableMap || typeof variableMap !== "object") {
    return data
  }
  const enriched: Record<string, any> = { ...data }
  for (const [varName, dataPath] of Object.entries(variableMap)) {
    if (
      !varName ||
      varName === "__proto__" ||
      typeof dataPath !== "string"
    ) {
      continue
    }
    const resolved = getNestedValue(data, dataPath)
    if (resolved !== undefined && resolved !== null) {
      enriched[varName] = resolved
    }
  }
  return enriched
}

export type { MultiInterpolateOptions } from "../../../types"
import type { MultiInterpolateOptions } from "../../../types"

/**
 * Unified multi-pass interpolation engine combining:
 * 1. `codee-sh` two-prefix placeholders: `{{data.items.0.title}}` and `{{translations.order.placedTitle}}`
 * 2. `@sam-ael` Go-style placeholders: `{{ .first_name }}` or `{{ .StoreName }}`
 * 3. Direct shorthand placeholders: `{{order_number}}` (falls back to `data`)
 *
 * Performs up to `maxPasses` (default 3) so translations containing `{{data.*}}`
 * placeholders (e.g. `"Order #{{data.display_id}} Confirmed"`) are recursively resolved!
 */
export function multiInterpolateString(
  template: string,
  sources: {
    data?: Record<string, any>
    translations?: Record<string, any>
  },
  options?: MultiInterpolateOptions
): string {
  if (!template || typeof template !== "string") {
    return ""
  }

  const escapeValues = Boolean(options?.escapeHtmlValues)
  const removeUnmatched = options?.removeUnmatched ?? true
  const maxPasses = options?.maxPasses ?? 3

  const dataObj = sources.data ?? {}
  const translationsObj = sources.translations ?? {}

  let current = template
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false
    current = current.replace(
      /\{\{\s*([a-zA-Z0-9_.\-[\]]+)\s*\}\}/g,
      (fullMatch, rawExpr: string) => {
        const expr = rawExpr.replace(/\[(\d+)\]/g, ".$1").trim()
        let resolved: unknown

        if (expr.startsWith("data.")) {
          resolved = getNestedValue(dataObj, expr.slice("data.".length))
        } else if (expr.startsWith("translations.")) {
          resolved = getNestedValue(
            translationsObj,
            expr.slice("translations.".length)
          )
        } else if (expr.startsWith(".")) {
          // Go-style {{ .first_name }} or {{ .StoreName }}
          resolved = getNestedValue(dataObj, expr.slice(1))
        } else {
          resolved = getNestedValue(dataObj, expr)
          if (resolved === undefined) {
            resolved = getNestedValue(translationsObj, expr)
          }
        }

        if (resolved === undefined || resolved === null) {
          if (pass === maxPasses - 1 && removeUnmatched) {
            changed = true
            return ""
          }
          return fullMatch
        }

        if (typeof resolved === "object") {
          return fullMatch
        }

        changed = true
        const strVal = String(resolved)
        // If this pass resolved a translation string that itself contains `{{data.*}}`,
        // only escape on the final value or if it doesn't contain further tokens.
        if (escapeValues && !/\{\{.*?\}\}/.test(strVal)) {
          return escapeHtml(strVal)
        }
        return strVal
      }
    )
    if (!changed) break
  }

  return current
}

/**
 * Recursively interpolates all strings inside an arbitrary JSON object/array structure
 * (used for Slack Block Kit JSON, block metadata, and WhatsApp template components).
 */
export function multiInterpolateObject<T>(
  input: T,
  sources: {
    data?: Record<string, any>
    translations?: Record<string, any>
  },
  options?: MultiInterpolateOptions
): T {
  if (input === null || input === undefined) {
    return input
  }
  if (typeof input === "string") {
    return multiInterpolateString(input, sources, options) as unknown as T
  }
  if (Array.isArray(input)) {
    return input.map((item) =>
      multiInterpolateObject(item, sources, options)
    ) as unknown as T
  }
  if (typeof input === "object") {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(input as Record<string, any>)) {
      out[k] = multiInterpolateObject(v, sources, options)
    }
    return out as T
  }
  return input
}

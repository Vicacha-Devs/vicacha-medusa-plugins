import { MedusaError } from "@medusajs/framework/utils"
import type { TypesenseRangeFacetSpec } from "../types"

const SAFE_FIELD_NAME_REGEX = /^[a-zA-Z0-9_.*]+$/

/**
 * Validates that a field name in a filter or sort expression only contains safe characters,
 * preventing injection of Typesense operators via field keys.
 */
export function assertSafeTypesenseField(field: string): string {
  const trimmed = String(field || "").trim()
  if (!trimmed || !SAFE_FIELD_NAME_REGEX.test(trimmed)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Typesense field name: "${trimmed}"`
    )
  }
  return trimmed
}

/**
 * Safely escapes a literal value for use inside a Typesense `filter_by` expression.
 * Wraps strings in backticks (`...`) and strips backticks/control chars to prevent filter injection.
 */
export function escapeTypesenseFilterValue(
  value: string | number | boolean
): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Non-finite number in Typesense filter value"
      )
    }
    return String(value)
  }
  const cleaned = String(value)
    .replace(/`/g, "")
    .replace(/[\r\n\0]/g, " ")
    .trim()
  return `\`${cleaned}\``
}

/**
 * Compiles a structured Medusa/JSON filter object into a safe Typesense `filter_by` string.
 * Supports:
 * - Direct equality: `{ status: "published", in_stock: true }`
 * - Arrays ($in): `{ category_ids: ["cat_1", "cat_2"] }`
 * - Operators: `$eq`, `$ne`, `$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte`, `$range`
 * - Logical combinators: `$and`, `$or`
 */
export function compileFilterObjectToTypesense(
  filters?: Record<string, any> | null
): string {
  if (!filters || typeof filters !== "object") {
    return ""
  }

  const clauses: string[] = []

  for (const [rawKey, rawVal] of Object.entries(filters)) {
    if (rawVal === undefined || rawVal === null || rawVal === "") {
      continue
    }

    if (rawKey === "$and" && Array.isArray(rawVal)) {
      const sub = rawVal
        .map((item) => compileFilterObjectToTypesense(item))
        .filter(Boolean)
      if (sub.length > 0) {
        clauses.push(`(${sub.join(" && ")})`)
      }
      continue
    }

    if (rawKey === "$or" && Array.isArray(rawVal)) {
      const sub = rawVal
        .map((item) => compileFilterObjectToTypesense(item))
        .filter(Boolean)
      if (sub.length > 0) {
        clauses.push(`(${sub.join(" || ")})`)
      }
      continue
    }

    const field = assertSafeTypesenseField(rawKey)

    if (Array.isArray(rawVal)) {
      if (rawVal.length === 0) continue
      const escapedList = rawVal
        .filter((v) => v !== undefined && v !== null && v !== "")
        .map((v) => escapeTypesenseFilterValue(v))
      if (escapedList.length > 0) {
        clauses.push(`${field}:=[${escapedList.join(",")}]`)
      }
      continue
    }

    if (typeof rawVal === "object") {
      for (const [op, opVal] of Object.entries(rawVal)) {
        if (opVal === undefined || opVal === null) continue
        switch (op) {
          case "$eq":
            clauses.push(`${field}:=${escapeTypesenseFilterValue(opVal as any)}`)
            break
          case "$ne":
            clauses.push(`${field}:!=${escapeTypesenseFilterValue(opVal as any)}`)
            break
          case "$in":
            if (Array.isArray(opVal) && opVal.length > 0) {
              const list = opVal.map((v) => escapeTypesenseFilterValue(v))
              clauses.push(`${field}:=[${list.join(",")}]`)
            }
            break
          case "$nin":
            if (Array.isArray(opVal) && opVal.length > 0) {
              const list = opVal.map((v) => escapeTypesenseFilterValue(v))
              clauses.push(`${field}:!=[${list.join(",")}]`)
            }
            break
          case "$gt":
            clauses.push(`${field}:>${escapeTypesenseFilterValue(Number(opVal))}`)
            break
          case "$gte":
            clauses.push(`${field}:>=${escapeTypesenseFilterValue(Number(opVal))}`)
            break
          case "$lt":
            clauses.push(`${field}:<${escapeTypesenseFilterValue(Number(opVal))}`)
            break
          case "$lte":
            clauses.push(`${field}:<=${escapeTypesenseFilterValue(Number(opVal))}`)
            break
          case "$range":
            if (Array.isArray(opVal) && opVal.length === 2) {
              const min = escapeTypesenseFilterValue(Number(opVal[0]))
              const max = escapeTypesenseFilterValue(Number(opVal[1]))
              clauses.push(`${field}:[${min}..${max}]`)
            }
            break
          default:
            break
        }
      }
      continue
    }

    clauses.push(`${field}:=${escapeTypesenseFilterValue(rawVal)}`)
  }

  return clauses.join(" && ")
}

/**
 * Safely combines multiple `filter_by` strings with `&&`, wrapping each segment in parentheses
 * so an `||` inside a user filter can never bypass a mandatory storefront security filter.
 */
export function combineTypesenseFilters(
  ...filterParts: Array<string | undefined | null>
): string {
  const nonEmpty = filterParts
    .map((f) => (typeof f === "string" ? f.trim() : ""))
    .filter((f) => f.length > 0)

  if (nonEmpty.length === 0) {
    return ""
  }
  if (nonEmpty.length === 1) {
    return nonEmpty[0]
  }
  return nonEmpty.map((part) => `(${part})`).join(" && ")
}

/**
 * Builds the mandatory storefront visibility & sales-channel filter for an entity.
 */
export function buildStorefrontSecurityFilter(params: {
  entity: string
  storefrontFilterConstraint?: string
  salesChannelIds?: string[]
}): string {
  const parts: string[] = []

  if (params.storefrontFilterConstraint) {
    parts.push(params.storefrontFilterConstraint)
  } else if (params.entity === "products") {
    parts.push("status:=published")
  } else if (params.entity === "categories") {
    parts.push("is_active:=true && is_internal:=false")
  }

  if (
    params.entity === "products" &&
    Array.isArray(params.salesChannelIds) &&
    params.salesChannelIds.length > 0
  ) {
    const escapedIds = params.salesChannelIds
      .filter(Boolean)
      .map((id) => escapeTypesenseFilterValue(id))
    if (escapedIds.length > 0) {
      parts.push(`sales_channel_ids:=[${escapedIds.join(",")}]`)
    }
  }

  return combineTypesenseFilters(...parts)
}

/**
 * Compiles range facet specifications into Typesense facet_by syntax:
 * e.g. `min_price(under_50:[0, 50], 50_to_100:[50, 100], over_100:[100, 999999])`
 */
export function compileRangeFacetStrings(
  rangeFacets?: TypesenseRangeFacetSpec[]
): string[] {
  if (!Array.isArray(rangeFacets) || rangeFacets.length === 0) {
    return []
  }

  const results: string[] = []
  for (const spec of rangeFacets) {
    if (!spec || !spec.field || !Array.isArray(spec.ranges) || spec.ranges.length === 0) {
      continue
    }
    const field = assertSafeTypesenseField(spec.field)
    const rangeEntries: string[] = []
    for (const r of spec.ranges) {
      const safeLabel = String(r.label || "range").replace(/[^a-zA-Z0-9_-]/g, "_")
      const fromVal = typeof r.from === "number" && Number.isFinite(r.from) ? r.from : 0
      const toVal =
        typeof r.to === "number" && Number.isFinite(r.to) ? r.to : ""
      rangeEntries.push(`${safeLabel}:[${fromVal}, ${toVal}]`)
    }
    if (rangeEntries.length > 0) {
      results.push(`${field}(${rangeEntries.join(", ")})`)
    }
  }
  return results
}

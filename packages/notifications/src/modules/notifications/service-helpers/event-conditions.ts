import type { EventMappingCondition } from "../types"

/**
 * Evaluates whether an Event Mapping's conditional filters match the current entity context.
 */
export function evaluateEventConditions(
  conditions: EventMappingCondition | null | undefined,
  data: Record<string, any>
): boolean {
  if (!conditions || typeof conditions !== "object") {
    return true
  }

  if (
    Array.isArray(conditions.region_ids) &&
    conditions.region_ids.length > 0
  ) {
    const regionId = data.region_id || data.region?.id
    if (!regionId || !conditions.region_ids.includes(regionId)) {
      return false
    }
  }

  if (
    Array.isArray(conditions.sales_channel_ids) &&
    conditions.sales_channel_ids.length > 0
  ) {
    const scId = data.sales_channel_id
    if (!scId || !conditions.sales_channel_ids.includes(scId)) {
      return false
    }
  }

  if (
    Array.isArray(conditions.currency_codes) &&
    conditions.currency_codes.length > 0
  ) {
    const code = String(data.currency_code || "").toUpperCase()
    const allowed = conditions.currency_codes.map((c) => c.toUpperCase())
    if (!code || !allowed.includes(code)) {
      return false
    }
  }

  if (
    typeof conditions.min_order_total === "number" &&
    conditions.min_order_total > 0
  ) {
    const total = Number(data.total ?? 0)
    if (total < conditions.min_order_total) {
      return false
    }
  }

  if (
    Array.isArray(conditions.document_types) &&
    conditions.document_types.length > 0
  ) {
    const docType = data.document_type
    if (!docType || !conditions.document_types.includes(docType)) {
      return false
    }
  }

  return true
}

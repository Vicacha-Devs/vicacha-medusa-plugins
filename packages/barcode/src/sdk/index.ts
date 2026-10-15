import { MedusaError } from "@medusajs/framework/utils"
import type {
  ApplyCountSessionBody,
  BatchBarcodeImportBody,
  BulkGenerateBarcodesBody,
  CreateBarcodeTagBody,
  CreateCountSessionBody,
  CreateFromBarcodeBody,
  CreateLabelTemplateBody,
  LookupBarcodeBody,
  PrintLabelsBody,
  QuickScanAdjustBody,
  RecordCountScanBody,
  UpdateBarcodeTagBody,
} from "../api/validators"
import type {
  BarcodeLookupChainResult,
  BarcodeSymbology,
  LabelPrintOutput,
  LabelTemplateSpec,
} from "../modules/barcode/types"

export const barcodeQueryKeys = {
  all: ["barcodes"] as const,
  list: (filters?: { product_id?: string }) =>
    filters
      ? (["barcodes", "list", filters] as const)
      : (["barcodes", "list"] as const),
  tags: (filters?: { product_id?: string; target_id?: string }) =>
    filters
      ? (["barcodes", "tags", filters] as const)
      : (["barcodes", "tags"] as const),
  templates: () => ["barcodes", "templates"] as const,
  countSessions: () => ["barcodes", "count-sessions"] as const,
  cache: () => ["barcodes", "cache"] as const,
  storeScan: (code: string) => ["barcodes", "store", code] as const,
}

export interface BarcodeSdkOptions {
  baseUrl?: string
  publishableApiKey?: string
  fetchImpl?: typeof fetch
}

export function createBarcodeSdk(options?: BarcodeSdkOptions) {
  const baseUrl = (options?.baseUrl ?? "").replace(/\/+$/, "")
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.publishableApiKey
        ? { "x-publishable-api-key": options.publishableApiKey }
        : {}),
      ...((init?.headers as Record<string, string>) ?? {}),
    }

    const res = await fetchImpl(`${baseUrl}${path}`, {
      credentials: "include",
      ...init,
      headers,
    })

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        String(json.message || json.error || `HTTP ${res.status}`)
      )
    }
    return json as T
  }

  return {
    admin: {
      listBarcodes(filters?: { product_id?: string }) {
        const qs = filters?.product_id
          ? `?product_id=${encodeURIComponent(filters.product_id)}`
          : ""
        return request<{
          barcodes: Array<Record<string, unknown>>
          count: number
          overview: Record<string, unknown>
        }>(`/admin/barcodes${qs}`)
      },
      lookup(payload: LookupBarcodeBody) {
        return request<BarcodeLookupChainResult>("/admin/barcodes/lookup", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      createFromBarcode(payload: CreateFromBarcodeBody) {
        return request<Record<string, unknown>>(
          "/admin/barcodes/create-from-barcode",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      batchImport(payload: BatchBarcodeImportBody) {
        return request<Record<string, unknown>>("/admin/barcodes/batch", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      bulkGenerate(payload: BulkGenerateBarcodesBody) {
        return request<Record<string, unknown>>(
          "/admin/barcodes/bulk-generate",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      quickScan(payload: QuickScanAdjustBody) {
        return request<Record<string, unknown>>("/admin/barcodes/scan", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      listTags(filters?: { product_id?: string; target_id?: string }) {
        const params = new URLSearchParams()
        if (filters?.product_id) params.set("product_id", filters.product_id)
        if (filters?.target_id) params.set("target_id", filters.target_id)
        const qs = params.toString() ? `?${params.toString()}` : ""
        return request<{
          tags: Array<Record<string, unknown>>
          count: number
        }>(`/admin/barcodes/tags${qs}`)
      },
      createTag(payload: CreateBarcodeTagBody) {
        return request<{ tag: Record<string, unknown> }>(
          "/admin/barcodes/tags",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      updateTag(id: string, payload: UpdateBarcodeTagBody) {
        return request<{ tag: Record<string, unknown> }>(
          `/admin/barcodes/tags/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        )
      },
      deleteTag(id: string) {
        return request<{ id: string; deleted: boolean }>(
          `/admin/barcodes/tags/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        )
      },
      listTemplates() {
        return request<{ templates: LabelTemplateSpec[]; count: number }>(
          "/admin/barcodes/templates"
        )
      },
      createTemplate(payload: CreateLabelTemplateBody) {
        return request<{ template: Record<string, unknown> }>(
          "/admin/barcodes/templates",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      printLabels(payload: PrintLabelsBody) {
        return request<LabelPrintOutput>("/admin/barcodes/print", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      listCountSessions() {
        return request<{
          sessions: Array<Record<string, unknown>>
          count: number
        }>("/admin/barcodes/count-sessions")
      },
      createCountSession(payload: CreateCountSessionBody) {
        return request<Record<string, unknown>>(
          "/admin/barcodes/count-sessions",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      recordCountScan(sessionId: string, payload: RecordCountScanBody) {
        return request<Record<string, unknown>>(
          `/admin/barcodes/count-sessions/${encodeURIComponent(
            sessionId
          )}/scan`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      applyCountSession(sessionId: string, payload?: ApplyCountSessionBody) {
        return request<Record<string, unknown>>(
          `/admin/barcodes/count-sessions/${encodeURIComponent(
            sessionId
          )}/apply`,
          {
            method: "POST",
            body: JSON.stringify(payload || {}),
          }
        )
      },
      listCache() {
        return request<{
          cache_entries: Array<Record<string, unknown>>
          count: number
        }>("/admin/barcodes/cache")
      },
      purgeCache(clearAll = false) {
        const qs = clearAll ? "?all=true" : ""
        return request<{ purged_count: number }>(`/admin/barcodes/cache${qs}`, {
          method: "DELETE",
        })
      },
    },
    store: {
      resolveScan(code: string) {
        return request<Record<string, unknown>>(
          `/store/barcodes/${encodeURIComponent(code)}`
        )
      },
      getSvgUrl(code: string, symbology?: BarcodeSymbology) {
        const sym = symbology ? `&symbology=${encodeURIComponent(symbology)}` : ""
        return `${baseUrl}/store/barcodes/${encodeURIComponent(
          code
        )}?format=svg${sym}`
      },
      verifyAuthenticity(code: string, signature: string) {
        return request<{
          valid: boolean
          code: string
          reason: string
          tag: Record<string, unknown> | null
        }>(`/store/barcodes/${encodeURIComponent(code)}/verify`, {
          method: "POST",
          body: JSON.stringify({ signature }),
        })
      },
    },
  }
}

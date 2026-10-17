import type {
  OdooBarcodeContext,
  OdooBarcodeResolutionResult,
  OdooConnectionConfig,
  OdooConnectionVerificationResult,
  OdooEntityType,
  OdooOrderSyncResult,
  OdooReconciliationResult,
  OdooReconciliationStrategy,
  OdooRedactedConnectionConfig,
  OdooSectionName,
  OdooStatusOverview,
  OdooSyncDirection,
  OdooSyncResult,
  OfflinePosItemInput,
  OfflinePosReplayResult,
} from "../modules/odoo/types"

export class OdooSdkError extends Error {
  public readonly status: number
  public readonly details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "OdooSdkError"
    this.status = status
    this.details = details
  }
}

export interface OdooSdkClientConfig {
  baseUrl?: string
  headers?: Record<string, string>
  fetchImpl?: typeof fetch
  credentials?: RequestCredentials
}

export function createOdooSdk(config: OdooSdkClientConfig = {}) {
  const baseUrl = (config.baseUrl ?? "").replace(/\/+$/, "")
  const fetchFn = config.fetchImpl ?? globalThis.fetch
  const credentials = config.credentials ?? "include"

  async function request<T>(
    path: string,
    init?: RequestInit & { query?: Record<string, unknown> }
  ): Promise<T> {
    const urlObj = new URL(
      `${baseUrl}${path}`,
      baseUrl ? undefined : "http://localhost"
    )
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== null && v !== "") {
          urlObj.searchParams.set(k, String(v))
        }
      }
    }

    const finalUrl = baseUrl
      ? urlObj.toString()
      : `${urlObj.pathname}${urlObj.search}`

    const res = await fetchFn(finalUrl, {
      ...init,
      credentials,
      headers: {
        "Content-Type": "application/json",
        ...(config.headers ?? {}),
        ...(init?.headers ?? {}),
      },
    })

    const text = await res.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }
    }

    if (!res.ok) {
      const errObj =
        parsed && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : {}
      const msg =
        (typeof errObj.error === "string" && errObj.error) ||
        (typeof errObj.message === "string" && errObj.message) ||
        `Odoo API request failed (${res.status})`
      throw new OdooSdkError(msg, res.status, parsed)
    }

    return parsed as T
  }

  return {
    admin: {
      getStatus(): Promise<OdooStatusOverview> {
        return request<OdooStatusOverview>("/admin/odoo/status")
      },
      getConfig(): Promise<{ config: OdooRedactedConnectionConfig }> {
        return request<{ config: OdooRedactedConnectionConfig }>(
          "/admin/odoo/config"
        )
      },
      saveConfig(
        payload: Partial<OdooConnectionConfig>
      ): Promise<{ ok: boolean; config: OdooRedactedConnectionConfig }> {
        return request("/admin/odoo/config", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      verifyConnection(
        payload: Partial<OdooConnectionConfig> = {}
      ): Promise<OdooConnectionVerificationResult> {
        return request("/admin/odoo/verify-connection", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      getSectionSettings<T = Record<string, unknown>>(
        section: OdooSectionName
      ): Promise<{ section: OdooSectionName; settings: T }> {
        return request(`/admin/odoo/sections/${encodeURIComponent(section)}`)
      },
      saveSectionSettings<T = Record<string, unknown>>(
        section: OdooSectionName,
        settings: Partial<T>
      ): Promise<{ ok: boolean; section: OdooSectionName; settings: T }> {
        return request(`/admin/odoo/sections/${encodeURIComponent(section)}`, {
          method: "POST",
          body: JSON.stringify(settings),
        })
      },
      getOptions(): Promise<{
        connected: boolean
        medusa: {
          stockLocations: Array<{ id: string; name: string }>
          collections: Array<{ id: string; title: string }>
          salesChannels: Array<{ id: string; name: string }>
        }
        odoo: {
          companies: Array<{ id: number; name: string }>
          warehouses: Array<{ id: number; name: string; code: string }>
          journals: Array<{ id: number; name: string; type: string }>
          categories: Array<{ id: number; name: string; complete_name?: string }>
        }
      }> {
        return request("/admin/odoo/options")
      },
      triggerSync(
        entity:
          | "products"
          | "inventory"
          | "customers"
          | "reconciliation"
          | "all",
        options?: {
          direction?: OdooSyncDirection
          strategy?: OdooReconciliationStrategy
          driftThreshold?: number
        }
      ): Promise<OdooSyncResult | OdooReconciliationResult> {
        return request(`/admin/odoo/sync/${encodeURIComponent(entity)}`, {
          method: "POST",
          body: JSON.stringify(options ?? {}),
        })
      },
      syncOrder(orderId: string): Promise<OdooOrderSyncResult> {
        return request(`/admin/odoo/sync-order/${encodeURIComponent(orderId)}`, {
          method: "POST",
          body: JSON.stringify({}),
        })
      },
      listMappings(filters?: {
        entity_type?: OdooEntityType
        medusa_id?: string
      }): Promise<{ mappings: Array<Record<string, unknown>> }> {
        return request("/admin/odoo/mappings", { query: filters })
      },
      upsertMapping(payload: {
        entityType: OdooEntityType
        medusaId: string
        odooId: number
        direction?: OdooSyncDirection
        odooModel?: string
      }): Promise<{ ok: boolean; mapping: Record<string, unknown> }> {
        return request("/admin/odoo/mappings", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      listLogs(filters?: { entity_type?: string }): Promise<{
        logs: Array<Record<string, unknown>>
        reconciliationLogs: Array<Record<string, unknown>>
        snapshots: Array<Record<string, unknown>>
      }> {
        return request("/admin/odoo/logs", { query: filters })
      },
      listFailures(filters?: { resolved?: boolean }): Promise<{
        failures: Array<Record<string, unknown>>
      }> {
        return request("/admin/odoo/failures", { query: filters })
      },
      resolveFailure(payload: {
        id: string
        resolvedBy?: string
      }): Promise<{ ok: boolean; failure: Record<string, unknown> }> {
        return request("/admin/odoo/failures", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      listConflicts(filters?: { status?: string }): Promise<{
        conflicts: Array<Record<string, unknown>>
      }> {
        return request("/admin/odoo/conflicts", { query: filters })
      },
      resolveConflict(payload: {
        id: string
        resolution: "odoo_wins" | "medusa_wins" | "custom"
        customValue?: unknown
        resolvedBy?: string
      }): Promise<{ ok: boolean; conflict: Record<string, unknown> }> {
        return request("/admin/odoo/conflicts", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      listPosTransactions(filters?: { status?: string }): Promise<{
        transactions: Array<Record<string, unknown>>
      }> {
        return request("/admin/odoo/pos-transactions", { query: filters })
      },
      enqueuePosTransaction(payload: {
        externalTransactionId: string
        customerId?: string
        customerEmail?: string
        currency?: string
        totalCents: number
        discountCents?: number
        items: OfflinePosItemInput[]
      }): Promise<{ ok: boolean; transaction: Record<string, unknown> }> {
        return request("/admin/odoo/pos-transactions", {
          method: "POST",
          body: JSON.stringify({ action: "enqueue", ...payload }),
        })
      },
      replayPosTransaction(payload: {
        id: string
        syncToOdoo?: boolean
      }): Promise<OfflinePosReplayResult> {
        return request("/admin/odoo/pos-transactions", {
          method: "POST",
          body: JSON.stringify({ action: "replay", ...payload }),
        })
      },
      getMetrics(): Promise<{
        metrics: Record<string, unknown>
        prometheus: string
      }> {
        return request("/admin/odoo/metrics")
      },
    },
    store: {
      lookupBarcode(payload: {
        barcode: string
        context?: OdooBarcodeContext
      }): Promise<OdooBarcodeResolutionResult> {
        return request("/store/odoo/barcode", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
    },
  }
}

export const defaultOdooSdk = createOdooSdk()

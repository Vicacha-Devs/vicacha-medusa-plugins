import type { EmitDianDocumentInput } from "../types"

export class DianSdkClient {
  async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      ...init,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(
        (data as any)?.message || `DIAN API error (${res.status})`
      )
    }
    return data as T
  }

  async getConfig() {
    return this.fetchJson<{
      config: Record<string, any>
      dane_departments: Array<{ code: string; name: string }>
      dane_municipalities: Array<{
        code: string
        name: string
        department_code: string
        department_name: string
      }>
    }>("/admin/dian/config")
  }

  async updateConfig(payload: Record<string, unknown>) {
    return this.fetchJson<{ config: Record<string, any> }>(
      "/admin/dian/config",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async listResolutions() {
    return this.fetchJson<{ resolutions: Array<Record<string, any>> }>(
      "/admin/dian/resolutions"
    )
  }

  async upsertResolution(payload: Record<string, unknown>) {
    return this.fetchJson<{ resolution: Record<string, any> }>(
      "/admin/dian/resolutions",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async syncResolutionsFromDian() {
    return this.fetchJson<{
      synced: Array<Record<string, any>>
      resolutions: Array<Record<string, any>>
    }>("/admin/dian/resolutions", {
      method: "POST",
      body: JSON.stringify({ action: "sync_from_dian" }),
    })
  }

  async listFiscalProfiles(customerId?: string) {
    const q = customerId
      ? `?customer_id=${encodeURIComponent(customerId)}`
      : ""
    return this.fetchJson<{ fiscal_profiles: Array<Record<string, any>> }>(
      `/admin/dian/fiscal-profiles${q}`
    )
  }

  async upsertFiscalProfile(payload: Record<string, unknown>) {
    return this.fetchJson<{ fiscal_profile: Record<string, any> }>(
      "/admin/dian/fiscal-profiles",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async listDocuments(params?: {
    order_id?: string
    document_type?: string
    status?: string
  }) {
    const sp = new URLSearchParams()
    if (params?.order_id) sp.set("order_id", params.order_id)
    if (params?.document_type) sp.set("document_type", params.document_type)
    if (params?.status) sp.set("status", params.status)
    const qs = sp.toString()
    return this.fetchJson<{
      documents: Array<Record<string, any>>
      count: number
    }>(`/admin/dian/documents${qs ? `?${qs}` : ""}`)
  }

  async emitDocument(payload: EmitDianDocumentInput) {
    return this.fetchJson<{ document: Record<string, any> }>(
      "/admin/dian/documents",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }
}

export const dianClient = new DianSdkClient()

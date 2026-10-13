import { MedusaError } from "@medusajs/framework/utils"
import type {
  ClearMpnSandboxResponse,
  CreateMpnBroadcastPayload,
  CreateMpnBroadcastResponse,
  CreateMpnMappingPayload,
  CreateOrCloneMpnTemplatePayload,
  DeleteMpnMappingResponse,
  DeleteMpnTemplateResponse,
  GetMpnTemplateResponse,
  ListMpnBroadcastsResponse,
  ListMpnChannelsResponse,
  ListMpnLogsParams,
  ListMpnLogsResponse,
  ListMpnMappingsResponse,
  ListMpnSandboxParams,
  ListMpnSandboxResponse,
  ListMpnTemplatesParams,
  ListMpnTemplatesResponse,
  NotificationsApiClientOptions,
  RenderMpnTemplatePayload,
  RenderMpnTemplateResponse,
  SaveMpnMappingResponse,
  SaveMpnTemplateResponse,
  SaveOrVerifyMpnChannelPayload,
  SaveOrVerifyMpnChannelResponse,
  SendMpnNotificationPayload,
  SendMpnNotificationResponse,
  StoreUpdateConsentPayload,
  StoreUpdateConsentResponse,
  UpdateMpnTemplatePayload,
} from "../types"

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ""
}

/**
 * Typed SDK client for `medusa-plugin-notifications` (MPN).
 * Supports both `/admin` and `/store` routes with automatic JSON parsing
 * and standard Medusa error extraction.
 */
export class NotificationsApiClient {
  private readonly baseUrl: string
  private readonly prefix: string
  private readonly options: NotificationsApiClientOptions

  constructor(
    prefix: "/admin" | "/store" = "/store",
    baseUrl: string = "",
    options: NotificationsApiClientOptions = {}
  ) {
    this.prefix = prefix
    this.baseUrl = baseUrl.replace(/\/$/, "")
    this.options = options
  }

  public resolveUrl(
    endpoint: string,
    params?: Record<string, unknown>
  ): string {
    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`
    return `${this.baseUrl}${this.prefix}${normalizedEndpoint}${buildQueryString(params)}`
  }

  private buildHeaders(
    customHeaders?: HeadersInit,
    hasJsonBody = true
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(this.options.headers || {}),
    }

    if (this.options.publishableApiKey) {
      headers["x-publishable-api-key"] = this.options.publishableApiKey
    }

    if (customHeaders) {
      if (customHeaders instanceof Headers) {
        customHeaders.forEach((v, k) => {
          headers[k] = v
        })
      } else if (Array.isArray(customHeaders)) {
        for (const [k, v] of customHeaders) {
          headers[k] = v
        }
      } else {
        Object.assign(headers, customHeaders)
      }
    }

    return headers
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit,
    queryParams?: Record<string, unknown>
  ): Promise<T> {
    const url = this.resolveUrl(endpoint, queryParams)
    const fetchFn = this.options.fetchImpl ?? globalThis.fetch
    const hasJsonBody =
      options?.body !== undefined && !(options.body instanceof FormData)

    const response = await fetchFn(url, {
      credentials: this.options.credentials ?? "include",
      ...options,
      headers: this.buildHeaders(options?.headers, hasJsonBody),
    })

    if (response.status === 204) {
      return {} as T
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        (data as { message?: string; detail?: string }).message ||
          (data as { detail?: string }).detail ||
          `Request failed with status ${response.status}`
      )
    }

    return data as T
  }

  // ---------------------------------------------------------------------------
  // Admin Templates & Preview Endpoints (/admin/mpn/templates & /render-template)
  // ---------------------------------------------------------------------------

  async listTemplates(
    params?: ListMpnTemplatesParams
  ): Promise<ListMpnTemplatesResponse> {
    return this.fetch<ListMpnTemplatesResponse>(
      "/mpn/templates",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async getTemplate(id: string): Promise<GetMpnTemplateResponse> {
    return this.fetch<GetMpnTemplateResponse>(
      `/mpn/templates/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  }

  async createOrCloneTemplate(
    payload: CreateOrCloneMpnTemplatePayload
  ): Promise<SaveMpnTemplateResponse> {
    return this.fetch<SaveMpnTemplateResponse>("/mpn/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async updateTemplate(
    id: string,
    payload: UpdateMpnTemplatePayload
  ): Promise<SaveMpnTemplateResponse> {
    return this.fetch<SaveMpnTemplateResponse>(
      `/mpn/templates/${encodeURIComponent(id)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async deleteTemplate(id: string): Promise<DeleteMpnTemplateResponse> {
    return this.fetch<DeleteMpnTemplateResponse>(
      `/mpn/templates/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  async renderTemplatePreview(
    payload: RenderMpnTemplatePayload
  ): Promise<RenderMpnTemplateResponse> {
    return this.fetch<RenderMpnTemplateResponse>("/mpn/render-template", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  // ---------------------------------------------------------------------------
  // Admin Event Mappings Endpoints (/admin/mpn/mappings)
  // ---------------------------------------------------------------------------

  async listMappings(): Promise<ListMpnMappingsResponse> {
    return this.fetch<ListMpnMappingsResponse>("/mpn/mappings", {
      method: "GET",
    })
  }

  async createMapping(
    payload: CreateMpnMappingPayload
  ): Promise<SaveMpnMappingResponse> {
    return this.fetch<SaveMpnMappingResponse>("/mpn/mappings", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async updateMapping(
    id: string,
    payload: Partial<CreateMpnMappingPayload>
  ): Promise<SaveMpnMappingResponse> {
    return this.fetch<SaveMpnMappingResponse>(
      `/mpn/mappings/${encodeURIComponent(id)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async deleteMapping(id: string): Promise<DeleteMpnMappingResponse> {
    return this.fetch<DeleteMpnMappingResponse>(
      `/mpn/mappings/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  // ---------------------------------------------------------------------------
  // Admin Channels, Logs, Broadcasts, Sandbox, & Send Endpoints (/admin/mpn/*)
  // ---------------------------------------------------------------------------

  async listChannels(): Promise<ListMpnChannelsResponse> {
    return this.fetch<ListMpnChannelsResponse>("/mpn/channels", {
      method: "GET",
    })
  }

  async saveOrVerifyChannel(
    payload: SaveOrVerifyMpnChannelPayload
  ): Promise<SaveOrVerifyMpnChannelResponse> {
    return this.fetch<SaveOrVerifyMpnChannelResponse>("/mpn/channels", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async listLogs(params?: ListMpnLogsParams): Promise<ListMpnLogsResponse> {
    return this.fetch<ListMpnLogsResponse>(
      "/mpn/logs",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async listBroadcasts(): Promise<ListMpnBroadcastsResponse> {
    return this.fetch<ListMpnBroadcastsResponse>("/mpn/broadcasts", {
      method: "GET",
    })
  }

  async createBroadcast(
    payload: CreateMpnBroadcastPayload
  ): Promise<CreateMpnBroadcastResponse> {
    return this.fetch<CreateMpnBroadcastResponse>("/mpn/broadcasts", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async listSandboxMessages(
    params?: ListMpnSandboxParams
  ): Promise<ListMpnSandboxResponse> {
    return this.fetch<ListMpnSandboxResponse>(
      "/mpn/sandbox",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async clearSandboxMessages(): Promise<ClearMpnSandboxResponse> {
    return this.fetch<ClearMpnSandboxResponse>("/mpn/sandbox", {
      method: "DELETE",
    })
  }

  async sendNotification(
    payload: SendMpnNotificationPayload
  ): Promise<SendMpnNotificationResponse> {
    return this.fetch<SendMpnNotificationResponse>("/mpn/send", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  // ---------------------------------------------------------------------------
  // Storefront Consent Endpoint (/store/mpn/consent)
  // ---------------------------------------------------------------------------

  async updateConsent(
    payload: StoreUpdateConsentPayload
  ): Promise<StoreUpdateConsentResponse> {
    return this.fetch<StoreUpdateConsentResponse>("/mpn/consent", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }
}

export const notificationsAdminSdk = new NotificationsApiClient("/admin")
export const notificationsStoreSdk = new NotificationsApiClient("/store")

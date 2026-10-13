import { MedusaError } from "@medusajs/framework/utils"
import type {
  BulkDownloadPayload,
  BulkGenerateDocumentsPayload,
  BulkGenerateDocumentsResponse,
  DeleteDocumentResponse,
  DeleteDocumentTemplateResponse,
  DocumentRecord,
  DocumentsApiClientOptions,
  DocumentSettingsRecord,
  DocumentStatus,
  DocumentTemplateRecord,
  DocumentType,
  ExportCsvParams,
  GenerateDocumentPayload,
  GenerateDocumentResponse,
  GetDocumentResponse,
  GetDocumentSettingsParams,
  GetDocumentSettingsResponse,
  GetDocumentTemplateResponse,
  ListDocumentsParams,
  ListDocumentsResponse,
  ListDocumentTemplatesParams,
  ListDocumentTemplatesResponse,
  MedusaRegionSummary,
  PackingSlipPreset,
  PreviewDocumentParams,
  RegenerateDocumentPayload,
  ResetRegionalSettingsResponse,
  SendDocumentEmailPayload,
  SendDocumentEmailResponse,
  SendDocumentForSignaturePayload,
  SendDocumentForSignatureResponse,
  SignatureRequestRecord,
  SignatureStatus,
  StoreDocumentPdfType,
  StoreOrderDocumentsResponse,
  StoreOrderDocumentSummary,
  StoreOrderSignatureSummary,
  StoreOrderSigningUrlResponse,
  SupportedLocale,
  TemplatePreset,
  UpdateDocumentSettingsPayload,
  UpdateDocumentSettingsResponse,
  UpsertDocumentTemplatePayload,
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
 * Typed SDK client for `medusa-plugin-documents`.
 * Supports both `/admin` and `/store` routes with automatic JSON parsing, binary downloads,
 * and standard Medusa error extraction.
 */
export class DocumentsApiClient {
  private readonly baseUrl: string
  private readonly prefix: string
  private readonly options: DocumentsApiClientOptions

  constructor(
    prefix: "/admin" | "/store" = "/store",
    baseUrl: string = "",
    options: DocumentsApiClientOptions = {}
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

  private buildHeaders(customHeaders?: HeadersInit, hasJsonBody = true): Record<string, string> {
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
    const hasJsonBody = options?.body !== undefined && !(options.body instanceof FormData)

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

  private async fetchBlob(
    endpoint: string,
    options?: RequestInit,
    queryParams?: Record<string, unknown>
  ): Promise<Blob> {
    const url = this.resolveUrl(endpoint, queryParams)
    const fetchFn = this.options.fetchImpl ?? globalThis.fetch
    const hasJsonBody = options?.body !== undefined && !(options.body instanceof FormData)

    const response = await fetchFn(url, {
      credentials: this.options.credentials ?? "include",
      ...options,
      headers: this.buildHeaders(options?.headers, hasJsonBody),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        (errData as { message?: string }).message ||
          `Download failed with status ${response.status}`
      )
    }

    return response.blob()
  }

  // ---------------------------------------------------------------------------
  // Admin Document Endpoints (/admin/documents)
  // ---------------------------------------------------------------------------

  async listDocuments(params?: ListDocumentsParams): Promise<ListDocumentsResponse> {
    return this.fetch<ListDocumentsResponse>(
      "/documents",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async getDocument(id: string): Promise<GetDocumentResponse> {
    return this.fetch<GetDocumentResponse>(
      `/documents/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  }

  async deleteDocument(id: string): Promise<DeleteDocumentResponse> {
    return this.fetch<DeleteDocumentResponse>(
      `/documents/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  async generateDocument(
    payload: GenerateDocumentPayload
  ): Promise<GenerateDocumentResponse> {
    return this.fetch<GenerateDocumentResponse>("/documents", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async regenerateDocument(
    id: string,
    payload: RegenerateDocumentPayload = {}
  ): Promise<GenerateDocumentResponse> {
    return this.fetch<GenerateDocumentResponse>(
      `/documents/${encodeURIComponent(id)}/regenerate`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async sendDocumentEmail(
    id: string,
    payload: SendDocumentEmailPayload = {}
  ): Promise<SendDocumentEmailResponse> {
    return this.fetch<SendDocumentEmailResponse>(
      `/documents/${encodeURIComponent(id)}/send-email`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async sendDocumentForSignature(
    id: string,
    payload: SendDocumentForSignaturePayload = {}
  ): Promise<SendDocumentForSignatureResponse> {
    return this.fetch<SendDocumentForSignatureResponse>(
      `/documents/${encodeURIComponent(id)}/send-for-signature`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  getDocumentPdfUrl(id: string, options?: { signed?: boolean }): string {
    return this.resolveUrl(
      `/documents/${encodeURIComponent(id)}/pdf`,
      options?.signed ? { signed: "true" } : undefined
    )
  }

  async downloadDocumentPdf(id: string, options?: { signed?: boolean }): Promise<Blob> {
    return this.fetchBlob(
      `/documents/${encodeURIComponent(id)}/pdf`,
      { method: "GET" },
      options?.signed ? { signed: "true" } : undefined
    )
  }

  async bulkGenerateDocuments(
    payload: BulkGenerateDocumentsPayload
  ): Promise<BulkGenerateDocumentsResponse> {
    return this.fetch<BulkGenerateDocumentsResponse>("/documents/bulk-generate", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async bulkDownloadZip(payload: BulkDownloadPayload): Promise<Blob> {
    return this.fetchBlob("/documents/bulk-download", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  getExportCsvUrl(params?: ExportCsvParams): string {
    return this.resolveUrl(
      "/documents/export.csv",
      params as Record<string, unknown>
    )
  }

  async exportCsv(params?: ExportCsvParams): Promise<Blob> {
    return this.fetchBlob(
      "/documents/export.csv",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  getPreviewPdfUrl(params: PreviewDocumentParams): string {
    return this.resolveUrl("/documents/preview", {
      document_type: params.document_type || params.type,
      type: params.type,
      preset: params.preset,
      locale: params.locale,
      region_id:
        params.region_id && params.region_id !== "global"
          ? params.region_id
          : undefined,
      order_id: params.order_id || undefined,
      items: params.items,
      template_id: params.template_id || undefined,
      t: params.t,
    })
  }

  // ---------------------------------------------------------------------------
  // Admin Settings & Templates Endpoints (/admin/documents/settings & /templates)
  // ---------------------------------------------------------------------------

  async getSettings(
    params?: GetDocumentSettingsParams
  ): Promise<GetDocumentSettingsResponse> {
    const regionParam =
      params?.region_id && params.region_id !== "global"
        ? { region_id: params.region_id }
        : undefined
    return this.fetch<GetDocumentSettingsResponse>(
      "/documents/settings",
      { method: "GET" },
      regionParam
    )
  }

  async updateSettings(
    payload: UpdateDocumentSettingsPayload
  ): Promise<UpdateDocumentSettingsResponse> {
    return this.fetch<UpdateDocumentSettingsResponse>("/documents/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  }

  async resetRegionalSettings(
    regionId: string
  ): Promise<ResetRegionalSettingsResponse> {
    return this.fetch<ResetRegionalSettingsResponse>(
      "/documents/settings",
      { method: "DELETE" },
      { region_id: regionId }
    )
  }

  async listTemplates(
    params?: ListDocumentTemplatesParams
  ): Promise<ListDocumentTemplatesResponse> {
    return this.fetch<ListDocumentTemplatesResponse>(
      "/documents/templates",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async getTemplate(id: string): Promise<GetDocumentTemplateResponse> {
    return this.fetch<GetDocumentTemplateResponse>(
      `/documents/templates/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  }

  async createTemplate(
    payload: UpsertDocumentTemplatePayload
  ): Promise<GetDocumentTemplateResponse> {
    return this.fetch<GetDocumentTemplateResponse>("/documents/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async updateTemplate(
    id: string,
    payload: Partial<UpsertDocumentTemplatePayload>
  ): Promise<GetDocumentTemplateResponse> {
    return this.fetch<GetDocumentTemplateResponse>(
      `/documents/templates/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    )
  }

  async deleteTemplate(id: string): Promise<DeleteDocumentTemplateResponse> {
    return this.fetch<DeleteDocumentTemplateResponse>(
      `/documents/templates/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  async listRegions(limit = 50): Promise<{ regions: MedusaRegionSummary[] }> {
    return this.fetch<{ regions: MedusaRegionSummary[] }>(
      "/regions",
      { method: "GET" },
      { limit }
    )
  }

  // ---------------------------------------------------------------------------
  // Storefront Endpoints (/store/documents)
  // ---------------------------------------------------------------------------

  async listOrderDocuments(orderId: string): Promise<StoreOrderDocumentsResponse> {
    return this.fetch<StoreOrderDocumentsResponse>(
      `/documents/${encodeURIComponent(orderId)}`,
      { method: "GET" }
    )
  }

  getOrderDocumentPdfUrl(orderId: string, type: StoreDocumentPdfType): string {
    const cleanType = type.replace(/\.pdf$/i, "").replace(/_/g, "-")
    return this.resolveUrl(
      `/documents/${encodeURIComponent(orderId)}/${encodeURIComponent(cleanType)}.pdf`
    )
  }

  async downloadOrderDocumentPdf(
    orderId: string,
    type: StoreDocumentPdfType
  ): Promise<Blob> {
    const cleanType = type.replace(/\.pdf$/i, "").replace(/_/g, "-")
    return this.fetchBlob(
      `/documents/${encodeURIComponent(orderId)}/${encodeURIComponent(cleanType)}.pdf`,
      { method: "GET" }
    )
  }

  async getOrderSigningUrl(orderId: string): Promise<StoreOrderSigningUrlResponse> {
    return this.fetch<StoreOrderSigningUrlResponse>(
      `/documents/${encodeURIComponent(orderId)}/signing-url`,
      { method: "GET" }
    )
  }
}

export const documentsAdminSdk = new DocumentsApiClient("/admin")
export const documentsStoreSdk = new DocumentsApiClient("/store")

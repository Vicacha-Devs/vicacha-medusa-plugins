import { MedusaError } from "@medusajs/framework/utils"
import type {
  AttributeDefinitionDTO,
  AttributeFilterCriterion,
  AttributeTemplateDTO,
  BulkAssignVariantMediaByOptionInput,
  CreateAttributeDefinitionInput,
  CreateAttributeTemplateInput,
  CreateProductFeatureInput,
  ProductExtensionDTO,
  ProductFeatureDTO,
  ResolvedProductAttributeEntry,
  StorefrontProductExtensionResponse,
  UpdateAttributeDefinitionInput,
  UpdateAttributeTemplateInput,
  UpdateProductFeatureInput,
  UpsertProductAttributeValueInput,
  UpsertProductExtensionInput,
  UpsertVariantExtensionInput,
  VariantExtensionDTO,
} from "../modules/product-ext/types"

export interface ProductExtSdkConfig {
  baseUrl?: string
  publishableApiKey?: string
  headers?: Record<string, string>
  fetcher?: typeof fetch
}

export const productExtQueryKeys = {
  all: ["product-ext"] as const,
  productExtension: (
    productId: string,
    opts?: {
      variantIds?: string[]
      salesChannelId?: string | null
      locale?: string | null
    }
  ) =>
    [
      "product-ext",
      "product",
      productId,
      opts?.variantIds?.join(",") ?? "",
      opts?.salesChannelId ?? "",
      opts?.locale ?? "",
    ] as const,
  variantExtension: (productId: string, variantId: string) =>
    ["product-ext", "variant", productId, variantId] as const,
  productAttributes: (productId: string, locale?: string | null) =>
    ["product-ext", "product-attributes", productId, locale ?? ""] as const,
  attributes: (categoryId?: string) =>
    ["product-ext", "attributes", categoryId ?? "all"] as const,
  templates: (categoryId?: string) =>
    ["product-ext", "templates", categoryId ?? "all"] as const,
  features: () => ["product-ext", "features"] as const,
}

export function createProductExtSdk(config: ProductExtSdkConfig = {}) {
  const baseUrl = (config.baseUrl ?? "").replace(/\/+$/, "")
  const fetcher = config.fetcher ?? globalThis.fetch

  async function request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(config.publishableApiKey
        ? { "x-publishable-api-key": config.publishableApiKey }
        : {}),
      ...(config.headers ?? {}),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    }

    const res = await fetcher(`${baseUrl}${path}`, {
      credentials: "include",
      ...init,
      headers,
    })

    if (!res.ok) {
      let message = `Request failed with status ${res.status}`
      try {
        const errBody = (await res.json()) as { message?: string }
        if (errBody?.message) {
          message = errBody.message
        }
      } catch {
        // Fallback to status message
      }
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
    }

    return (await res.json()) as T
  }

  return {
    store: {
      async getProductExtension(params: {
        product_id: string
        variant_ids?: string[]
        sales_channel_id?: string | null
        locale?: string | null
      }): Promise<StorefrontProductExtensionResponse> {
        const search = new URLSearchParams()
        if (params.variant_ids && params.variant_ids.length > 0) {
          search.set("variant_ids", params.variant_ids.join(","))
        }
        if (params.sales_channel_id) {
          search.set("sales_channel_id", params.sales_channel_id)
        }
        if (params.locale) {
          search.set("locale", params.locale)
        }
        const qs = search.toString()
        return request<StorefrontProductExtensionResponse>(
          `/store/products/${encodeURIComponent(params.product_id)}/extension${
            qs ? `?${qs}` : ""
          }`
        )
      },

      async filterProductsByAttributes(
        criteria: AttributeFilterCriterion[]
      ): Promise<{ product_ids: string[] }> {
        return request<{ product_ids: string[] }>(`/store/product-ext/filter`, {
          method: "POST",
          body: JSON.stringify({ criteria }),
        })
      },
    },

    admin: {
      async getProductExtension(
        productId: string
      ): Promise<ProductExtensionDTO & { extension?: ProductExtensionDTO | null }> {
        const res = await request<
          ProductExtensionDTO & { extension?: ProductExtensionDTO | null }
        >(`/admin/products/${encodeURIComponent(productId)}/extension`)
        if (res && typeof res === "object" && "extension" in res && res.extension) {
          return { ...res.extension, ...res, extension: res.extension }
        }
        return res
      },

      async upsertProductExtension(
        productId: string,
        body: Omit<UpsertProductExtensionInput, "product_id">
      ): Promise<ProductExtensionDTO & { extension?: ProductExtensionDTO | null }> {
        const res = await request<
          ProductExtensionDTO & { extension?: ProductExtensionDTO | null }
        >(`/admin/products/${encodeURIComponent(productId)}/extension`, {
          method: "POST",
          body: JSON.stringify(body),
        })
        if (res && typeof res === "object" && "extension" in res && res.extension) {
          return { ...res.extension, ...res, extension: res.extension }
        }
        return res
      },

      async getVariantExtension(
        productId: string,
        variantId: string
      ): Promise<VariantExtensionDTO & { extension?: VariantExtensionDTO | null }> {
        const res = await request<
          VariantExtensionDTO & { extension?: VariantExtensionDTO | null }
        >(
          `/admin/products/${encodeURIComponent(
            productId
          )}/variants/${encodeURIComponent(variantId)}/extension`
        )
        if (res && typeof res === "object" && "extension" in res && res.extension) {
          return { ...res.extension, ...res, extension: res.extension }
        }
        return res
      },

      async upsertVariantExtension(
        productId: string,
        variantId: string,
        body: Omit<UpsertVariantExtensionInput, "variant_id">
      ): Promise<VariantExtensionDTO & { extension?: VariantExtensionDTO | null }> {
        const res = await request<
          VariantExtensionDTO & { extension?: VariantExtensionDTO | null }
        >(
          `/admin/products/${encodeURIComponent(
            productId
          )}/variants/${encodeURIComponent(variantId)}/extension`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        )
        if (res && typeof res === "object" && "extension" in res && res.extension) {
          return { ...res.extension, ...res, extension: res.extension }
        }
        return res
      },


      async bulkAssignVariantMediaByOption(
        productId: string,
        body: Omit<BulkAssignVariantMediaByOptionInput, "product_id">
      ): Promise<{
        product_id: string
        updated_variants: VariantExtensionDTO[]
      }> {
        return request<{
          product_id: string
          updated_variants: VariantExtensionDTO[]
        }>(
          `/admin/products/${encodeURIComponent(
            productId
          )}/variants/bulk-media`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        )
      },

      async getProductAttributes(
        productId: string,
        locale?: string
      ): Promise<{
        product_id: string
        attributes: ResolvedProductAttributeEntry[]
      }> {
        const qs = locale ? `?locale=${encodeURIComponent(locale)}` : ""
        return request<{
          product_id: string
          attributes: ResolvedProductAttributeEntry[]
        }>(`/admin/products/${encodeURIComponent(productId)}/attributes${qs}`)
      },

      async setProductAttributes(
        productId: string,
        body: {
          template_id_or_code?: string
          attributes?: UpsertProductAttributeValueInput[]
        }
      ): Promise<{
        product_id: string
        extension: ProductExtensionDTO | null
        attributes: ResolvedProductAttributeEntry[]
      }> {
        return request(
          `/admin/products/${encodeURIComponent(productId)}/attributes`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        )
      },

      async listAttributes(params?: {
        category_id?: string
        ancestor_category_ids?: string[]
        is_filterable?: boolean
      }): Promise<{ attributes: AttributeDefinitionDTO[] }> {
        const search = new URLSearchParams()
        if (params?.category_id) {
          search.set("category_id", params.category_id)
        }
        if (params?.ancestor_category_ids?.length) {
          search.set(
            "ancestor_category_ids",
            params.ancestor_category_ids.join(",")
          )
        }
        if (params?.is_filterable !== undefined) {
          search.set("is_filterable", String(params.is_filterable))
        }
        const qs = search.toString()
        return request<{ attributes: AttributeDefinitionDTO[] }>(
          `/admin/product-ext/attributes${qs ? `?${qs}` : ""}`
        )
      },

      async createAttribute(
        body: CreateAttributeDefinitionInput
      ): Promise<{ attribute: AttributeDefinitionDTO }> {
        return request<{ attribute: AttributeDefinitionDTO }>(
          `/admin/product-ext/attributes`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        )
      },

      async updateAttribute(
        id: string,
        body: Omit<UpdateAttributeDefinitionInput, "id">
      ): Promise<{ attribute: AttributeDefinitionDTO }> {
        return request<{ attribute: AttributeDefinitionDTO }>(
          `/admin/product-ext/attributes/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          }
        )
      },

      async deleteAttribute(
        id: string
      ): Promise<{ id: string; deleted: boolean }> {
        return request<{ id: string; deleted: boolean }>(
          `/admin/product-ext/attributes/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        )
      },

      async listTemplates(params?: {
        category_id?: string
        is_active?: boolean
      }): Promise<{ templates: AttributeTemplateDTO[] }> {
        const search = new URLSearchParams()
        if (params?.category_id) {
          search.set("category_id", params.category_id)
        }
        if (params?.is_active !== undefined) {
          search.set("is_active", String(params.is_active))
        }
        const qs = search.toString()
        return request<{ templates: AttributeTemplateDTO[] }>(
          `/admin/product-ext/templates${qs ? `?${qs}` : ""}`
        )
      },

      async createTemplate(
        body: CreateAttributeTemplateInput
      ): Promise<{ template: AttributeTemplateDTO }> {
        return request<{ template: AttributeTemplateDTO }>(
          `/admin/product-ext/templates`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        )
      },

      async updateTemplate(
        id: string,
        body: Omit<UpdateAttributeTemplateInput, "id">
      ): Promise<{ template: AttributeTemplateDTO }> {
        return request<{ template: AttributeTemplateDTO }>(
          `/admin/product-ext/templates/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          }
        )
      },

      async deleteTemplate(
        id: string
      ): Promise<{ id: string; deleted: boolean }> {
        return request<{ id: string; deleted: boolean }>(
          `/admin/product-ext/templates/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        )
      },

      async listFeatures(params?: {
        is_active?: boolean
      }): Promise<{ features: ProductFeatureDTO[] }> {
        const qs =
          params?.is_active !== undefined
            ? `?is_active=${String(params.is_active)}`
            : ""
        return request<{ features: ProductFeatureDTO[] }>(
          `/admin/product-ext/features${qs}`
        )
      },

      async createFeature(
        body: CreateProductFeatureInput
      ): Promise<{ feature: ProductFeatureDTO }> {
        return request<{ feature: ProductFeatureDTO }>(
          `/admin/product-ext/features`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        )
      },

      async updateFeature(
        id: string,
        body: Omit<UpdateProductFeatureInput, "id">
      ): Promise<{ feature: ProductFeatureDTO }> {
        return request<{ feature: ProductFeatureDTO }>(
          `/admin/product-ext/features/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          }
        )
      },

      async deleteFeature(
        id: string
      ): Promise<{ id: string; deleted: boolean }> {
        return request<{ id: string; deleted: boolean }>(
          `/admin/product-ext/features/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        )
      },

      async exportImageAltsCsv(
        productIds?: string[]
      ): Promise<{ csv_content: string }> {
        const qs =
          productIds && productIds.length > 0
            ? `?product_ids=${encodeURIComponent(productIds.join(","))}`
            : ""
        return request<{ csv_content: string }>(
          `/admin/product-ext/image-alts${qs}`
        )
      },

      async importImageAltsCsv(
        csvContent: string
      ): Promise<{ updated_product_ids: string[] }> {
        return request<{ updated_product_ids: string[] }>(
          `/admin/product-ext/image-alts`,
          {
            method: "POST",
            body: JSON.stringify({ csv_content: csvContent }),
          }
        )
      },
    },
  }
}

export type ProductExtSdk = ReturnType<typeof createProductExtSdk>

import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  BulkAssignVariantMediaBodySchema,
  CreateAttributeDefinitionBodySchema,
  CreateAttributeTemplateBodySchema,
  CreateProductFeatureBodySchema,
  ImportImageAltsBodySchema,
  SetProductAttributesBodySchema,
  StoreFilterByAttributesBodySchema,
  UpdateAttributeDefinitionBodySchema,
  UpdateAttributeTemplateBodySchema,
  UpdateProductFeatureBodySchema,
  UpsertProductExtBodySchema,
  UpsertVariantExtBodySchema,
} from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:product_id/extension",
      method: "POST",
      middlewares: [validateAndTransformBody(UpsertProductExtBodySchema)],
    },
    {
      matcher: "/admin/products/:product_id/variants/:variant_id/extension",
      method: "POST",
      middlewares: [validateAndTransformBody(UpsertVariantExtBodySchema)],
    },
    {
      matcher: "/admin/products/:product_id/variants/bulk-media",
      method: "POST",
      middlewares: [validateAndTransformBody(BulkAssignVariantMediaBodySchema)],
    },
    {
      matcher: "/admin/products/:product_id/attributes",
      method: "POST",
      middlewares: [validateAndTransformBody(SetProductAttributesBodySchema)],
    },
    {
      matcher: "/admin/product-ext/attributes",
      method: "POST",
      middlewares: [
        validateAndTransformBody(CreateAttributeDefinitionBodySchema),
      ],
    },
    {
      matcher: "/admin/product-ext/attributes/:id",
      method: "PATCH",
      middlewares: [
        validateAndTransformBody(UpdateAttributeDefinitionBodySchema),
      ],
    },
    {
      matcher: "/admin/product-ext/templates",
      method: "POST",
      middlewares: [
        validateAndTransformBody(CreateAttributeTemplateBodySchema),
      ],
    },
    {
      matcher: "/admin/product-ext/templates/:id",
      method: "PATCH",
      middlewares: [
        validateAndTransformBody(UpdateAttributeTemplateBodySchema),
      ],
    },
    {
      matcher: "/admin/product-ext/features",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateProductFeatureBodySchema)],
    },
    {
      matcher: "/admin/product-ext/features/:id",
      method: "PATCH",
      middlewares: [validateAndTransformBody(UpdateProductFeatureBodySchema)],
    },
    {
      matcher: "/admin/product-ext/image-alts",
      method: "POST",
      middlewares: [validateAndTransformBody(ImportImageAltsBodySchema)],
    },
    {
      matcher: "/store/product-ext/filter",
      method: "POST",
      middlewares: [validateAndTransformBody(StoreFilterByAttributesBodySchema)],
    },
  ],
})

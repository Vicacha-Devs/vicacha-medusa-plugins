import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import {
  EmitDianDocumentBodySchema,
  ListDianDocumentsQuerySchema,
  UpsertDianConfigSchema,
  UpsertDianCustomerFiscalProfileSchema,
  UpsertDianResolutionSchema,
} from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/dian/config",
      method: "POST",
      middlewares: [validateAndTransformBody(UpsertDianConfigSchema)],
    },
    {
      matcher: "/admin/dian/resolutions",
      method: "POST",
      middlewares: [validateAndTransformBody(UpsertDianResolutionSchema)],
    },
    {
      matcher: "/admin/dian/fiscal-profiles",
      method: "POST",
      middlewares: [
        validateAndTransformBody(UpsertDianCustomerFiscalProfileSchema),
      ],
    },
    {
      matcher: "/admin/dian/documents",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListDianDocumentsQuerySchema, {})],
    },
    {
      matcher: "/admin/dian/documents",
      method: "POST",
      middlewares: [validateAndTransformBody(EmitDianDocumentBodySchema)],
    },
    {
      matcher: "/store/dian/fiscal-profile",
      method: "POST",
      middlewares: [
        validateAndTransformBody(UpsertDianCustomerFiscalProfileSchema),
      ],
    },
  ],
})

import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  OdooBarcodeLookupSchema,
  OdooConfigSchema,
  OdooPosTransactionActionSchema,
  OdooResolveConflictSchema,
  OdooResolveFailureSchema,
  OdooTriggerSyncSchema,
  OdooUpsertMappingSchema,
  OdooVerifyConnectionSchema,
  OdooWebhookBodySchema,
} from "./validators"

export * from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/odoo/config",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooConfigSchema)],
    },
    {
      matcher: "/admin/odoo/verify-connection",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooVerifyConnectionSchema)],
    },
    {
      matcher: "/admin/odoo/sync/:entity",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooTriggerSyncSchema)],
    },
    {
      matcher: "/admin/odoo/mappings",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooUpsertMappingSchema)],
    },
    {
      matcher: "/admin/odoo/failures",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooResolveFailureSchema)],
    },
    {
      matcher: "/admin/odoo/conflicts",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooResolveConflictSchema)],
    },
    {
      matcher: "/admin/odoo/pos-transactions",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooPosTransactionActionSchema)],
    },
    {
      matcher: "/store/odoo/barcode",
      method: "POST",
      middlewares: [validateAndTransformBody(OdooBarcodeLookupSchema)],
    },
    {
      matcher: "/hooks/odoo",
      method: "POST",
      bodyParser: { preserveRawBody: true },
      middlewares: [validateAndTransformBody(OdooWebhookBodySchema)],
    },
  ],
})

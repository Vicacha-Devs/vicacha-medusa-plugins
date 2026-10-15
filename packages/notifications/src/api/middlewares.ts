import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"

export * from "./validators"

/**
 * Storefront Anti-IDOR verification: ensures an authenticated customer can only manage
 * their own consent/notification preferences when `customer_id` is present.
 */
export function verifyStoreCustomerSession(req: MedusaRequest): {
  authenticated: boolean
  customerId: string | null
} {
  const actorId = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type
  if (actorId && (!actorType || actorType === "customer")) {
    return { authenticated: true, customerId: String(actorId) }
  }
  return { authenticated: false, customerId: null }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/mpn/webhooks/*",
      bodyParser: { preserveRawBody: true },
      middlewares: [
        (
          _req: MedusaRequest,
          _res: MedusaResponse,
          next: MedusaNextFunction
        ) => {
          next()
        },
      ],
    },
  ],
})

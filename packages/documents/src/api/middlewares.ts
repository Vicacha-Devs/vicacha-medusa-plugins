import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export * from "./validators"

/**
 * Verifies that an authenticated storefront customer owns the requested `order_id`
 * to prevent Insecure Direct Object Reference (IDOR / CWE-639).
 */
export async function assertCustomerOwnsOrder(
  req: MedusaRequest,
  orderId: string
): Promise<{ allowed: boolean; status: number; message?: string }> {
  const actorId = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type

  if (!actorId || (actorType && actorType !== "customer")) {
    return {
      allowed: false,
      status: 401,
      message: "Authentication required to access order documents",
    }
  }

  try {
    let orderCustomerId: string | null = null

    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
      if (query && typeof query.graph === "function") {
        const { data } = await query.graph({
          entity: "order",
          fields: ["id", "customer_id"],
          filters: { id: orderId },
        })
        if (Array.isArray(data) && data.length > 0) {
          orderCustomerId = data[0].customer_id ?? null
        }
      }
    } catch {
      const orderModule = req.scope.resolve(Modules.ORDER) as any
      const order = await orderModule.retrieveOrder(orderId)
      orderCustomerId = order?.customer_id ?? null
    }

    if (!orderCustomerId || orderCustomerId !== actorId) {
      return {
        allowed: false,
        status: 403,
        message: "You do not have permission to access documents for this order",
      }
    }

    return { allowed: true, status: 200 }
  } catch {
    return {
      allowed: false,
      status: 404,
      message: "Order not found",
    }
  }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/documents/webhooks/docuseal",
      bodyParser: { preserveRawBody: true },
      middlewares: [
        (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) => {
          next()
        },
      ],
    },
  ],
})

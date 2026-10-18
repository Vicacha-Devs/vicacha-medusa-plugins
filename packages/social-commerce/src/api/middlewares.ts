import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  MedusaError,
  isMedusaError,
  resolveSocialCommerceService,
  type SocialCommerceService,
} from "../modules/social-commerce/index.js"
import {
  AttachLiveProductsSchema,
  CheckoutHandoffSchema,
  ConnectSocialAccountSchema,
  CreateLiveSessionSchema,
  CreateLocalStorySchema,
  LiveSessionActionSchema,
  OAuthCallbackSchema,
  ReserveLiveStockSchema,
  SyncCatalogBatchSchema,
  SyncMediaRequestSchema,
  TagProductsOnPostSchema,
  UpdateMediaPostSchema,
} from "./validators.js"

export * from "./validators.js"

import type { MedusaContainer } from "@medusajs/framework/types"

export interface HttpRequest {
  body?: unknown
  validatedBody?: unknown
  query?: Record<string, unknown>
  validatedQuery?: Record<string, unknown>
  params?: Record<string, string>
  headers?: Record<string, string | string[] | undefined>
  rawBody?: string | Buffer
  scope: MedusaContainer
}

export interface HttpResponse {
  status: (code: number) => HttpResponse
  json: (payload: unknown) => void
  send?: (body: string) => void
  setHeader?: (name: string, value: string) => void
  redirect?: (statusOrUrl: number | string, url?: string) => void
}

export function getRequestPayload(req: HttpRequest): Record<string, unknown> {
  return (req.validatedBody ?? req.body ?? {}) as Record<string, unknown>
}

export function resolveSocialService(req: HttpRequest): SocialCommerceService {
  return resolveSocialCommerceService(req.scope)
}

export function sendErrorResponse(res: HttpResponse, err: unknown): void {
  if (isMedusaError(err)) {
    const statusMap: Record<string, number> = {
      [MedusaError.Types.INVALID_DATA]: 400,
      [MedusaError.Types.INVALID_ARGUMENT]: 400,
      [MedusaError.Types.UNAUTHORIZED]: 401,
      [MedusaError.Types.NOT_ALLOWED]: 403,
      [MedusaError.Types.NOT_FOUND]: 404,
      [MedusaError.Types.CONFLICT]: 409,
      [MedusaError.Types.DUPLICATE_ERROR]: 409,
    }
    const statusCode = statusMap[err.type] ?? 500
    res.status(statusCode).json({
      type: err.type,
      message: err.message,
    })
    return
  }

  res.status(500).json({
    type: MedusaError.Types.UNEXPECTED_STATE,
    message: err instanceof Error ? err.message : "Unexpected internal server error",
  })
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/social/connect",
      method: "POST",
      middlewares: [validateAndTransformBody(ConnectSocialAccountSchema)],
    },
    {
      matcher: "/admin/social/sync",
      method: "POST",
      middlewares: [validateAndTransformBody(SyncMediaRequestSchema)],
    },
    {
      matcher: "/admin/social/posts",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateLocalStorySchema)],
    },
    {
      matcher: "/admin/social/posts/:id",
      method: "PATCH",
      middlewares: [validateAndTransformBody(UpdateMediaPostSchema)],
    },
    {
      matcher: "/admin/social/posts/:id/products",
      method: "POST",
      middlewares: [validateAndTransformBody(TagProductsOnPostSchema)],
    },
    {
      matcher: "/admin/social/live",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateLiveSessionSchema)],
    },
    {
      matcher: "/admin/social/live/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(LiveSessionActionSchema)],
    },
    {
      matcher: "/admin/social/live/:id/products",
      method: "POST",
      middlewares: [validateAndTransformBody(AttachLiveProductsSchema)],
    },
    {
      matcher: "/admin/social/catalog",
      method: "POST",
      middlewares: [validateAndTransformBody(SyncCatalogBatchSchema)],
    },
    {
      matcher: "/social/oauth/callback",
      method: "POST",
      middlewares: [validateAndTransformBody(OAuthCallbackSchema)],
    },
    {
      matcher: "/store/social/live",
      method: "POST",
      middlewares: [validateAndTransformBody(ReserveLiveStockSchema)],
    },
    {
      matcher: "/store/social/checkout-handoff",
      method: "POST",
      middlewares: [validateAndTransformBody(CheckoutHandoffSchema)],
    },
    {
      matcher: "/webhooks/social/:platform",
      method: "POST",
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/webhooks/tiktok",
      method: "POST",
      bodyParser: { preserveRawBody: true },
    },
  ],
})



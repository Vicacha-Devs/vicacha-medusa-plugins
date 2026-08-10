import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import {
  listQuotesTransformQueryConfig,
  retrieveQuoteTransformQueryConfig,
} from "./query-config.ts";
import {
  AdminCreateQuoteMessage,
  AdminGetQuoteParams,
  AdminRejectQuote,
  AdminSendQuote,
} from "./validators.ts";

export const adminQuotesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/b2b/quotes",
    middlewares: [
      validateAndTransformQuery(
        AdminGetQuoteParams,
        listQuotesTransformQueryConfig
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/b2b/quotes/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/b2b/quotes/:id/send",
    middlewares: [
      validateAndTransformBody(AdminSendQuote),
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/b2b/quotes/:id/reject",
    middlewares: [
      validateAndTransformBody(AdminRejectQuote),
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/b2b/quotes/:id/messages",
    middlewares: [
      validateAndTransformBody(AdminCreateQuoteMessage),
      validateAndTransformQuery(
        AdminGetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
];

import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import {
  listQuotesTransformQueryConfig,
  retrieveQuoteTransformQueryConfig,
} from "./query-config.ts";
import {
  AcceptQuote,
  CreateQuote,
  GetQuoteParams,
  RejectQuote,
  StoreCreateQuoteMessage,
} from "./validators.ts";

export const storeQuotesMiddlewares: MiddlewareRoute[] = [
  {
    method: "ALL",
    matcher: "/store/b2b/quotes*",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/store/b2b/quotes",
    middlewares: [
      validateAndTransformQuery(GetQuoteParams, listQuotesTransformQueryConfig),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/quotes",
    middlewares: [
      validateAndTransformBody(CreateQuote),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/b2b/quotes/:id",
    middlewares: [
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/quotes/:id/accept",
    middlewares: [
      validateAndTransformBody(AcceptQuote),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/quotes/:id/reject",
    middlewares: [
      validateAndTransformBody(RejectQuote),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/b2b/quotes/:id/preview",
    middlewares: [
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/quotes/:id/messages",
    middlewares: [
      validateAndTransformBody(StoreCreateQuoteMessage),
      validateAndTransformQuery(
        GetQuoteParams,
        retrieveQuoteTransformQueryConfig
      ),
    ],
  },
];

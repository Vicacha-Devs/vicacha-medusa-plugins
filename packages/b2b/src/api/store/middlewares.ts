import { MiddlewareRoute } from "@medusajs/medusa";
import { storeApprovalsMiddlewares } from "./b2b/approvals/middlewares";
import { storeCartsMiddlewares } from "./b2b/carts/middlewares";
import { storeCompaniesMiddlewares } from "./b2b/companies/middlewares";
import { storeFreeShippingMiddlewares } from "./b2b/free-shipping/middlewares";
import { storeQuotesMiddlewares } from "./b2b/quotes/middlewares";

export const storeMiddlewares: MiddlewareRoute[] = [
  ...storeCartsMiddlewares,
  ...storeCompaniesMiddlewares,
  ...storeQuotesMiddlewares,
  ...storeFreeShippingMiddlewares,
  ...storeApprovalsMiddlewares,
];

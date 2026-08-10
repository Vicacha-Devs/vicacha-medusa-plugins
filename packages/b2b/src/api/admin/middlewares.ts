import { MiddlewareRoute } from "@medusajs/medusa";
import { adminCompaniesMiddlewares } from "./b2b/companies/middlewares";
import { adminQuotesMiddlewares } from "./b2b/quotes/middlewares";
import { adminApprovalsMiddlewares } from "./b2b/approvals/middlewares";

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminCompaniesMiddlewares,
  ...adminQuotesMiddlewares,
  ...adminApprovalsMiddlewares,
];

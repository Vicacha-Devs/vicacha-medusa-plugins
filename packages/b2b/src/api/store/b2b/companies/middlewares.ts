import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { authenticate } from "@medusajs/medusa";
import { ensureRole } from "../../../middlewares/ensure-role.ts";
import {
  storeCompanyQueryConfig,
  storeEmployeeQueryConfig,
} from "./query-config.ts";
import {
  StoreCreateCompany,
  StoreCreateEmployee,
  StoreGetCompanyParams,
  StoreGetEmployeeParams,
  StoreUpdateApprovalSettings,
  StoreUpdateEmployee,
} from "./validators.ts";

export const storeCompaniesMiddlewares: MiddlewareRoute[] = [
  /* Company middlewares */
  {
    method: "ALL",
    matcher: "/store/b2b/companies*",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/store/b2b/companies",
    middlewares: [
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/companies",
    middlewares: [
      validateAndTransformBody(StoreCreateCompany),
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/b2b/companies/:id",
    middlewares: [
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/companies/:id",
    middlewares: [
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve
      ),
    ],
  },

  /* Employee middlewares */
  {
    method: ["GET"],
    matcher: "/store/b2b/companies/:id/employees",
    middlewares: [
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.list
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/companies/:id/employees",
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreCreateEmployee),
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.list
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/b2b/companies/:id/employees/:employee_id",
    middlewares: [
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/companies/:id/employees/:employee_id",
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreUpdateEmployee),
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.retrieve
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/b2b/companies/:id/approval-settings",
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreUpdateApprovalSettings),
    ],
  },
];

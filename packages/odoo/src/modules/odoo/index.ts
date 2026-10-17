import { Module } from "@medusajs/framework/utils"
import OdooModuleService from "./service"
import { ODOO_MODULE, ODOO_SYNC_MODULE } from "./types"

export { ODOO_MODULE, ODOO_SYNC_MODULE, OdooModuleService }
export * from "./types"
export * from "./client/odoo-client"
export * from "./utils/security"
export * from "./utils/metrics"

export default Module(ODOO_MODULE, {
  service: OdooModuleService,
})

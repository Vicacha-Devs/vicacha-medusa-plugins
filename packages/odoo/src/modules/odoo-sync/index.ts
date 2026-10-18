import { Module } from "@medusajs/framework/utils"
import OdooModuleService from "../odoo/service"
import { ODOO_MODULE, ODOO_SYNC_MODULE } from "../odoo/types"

export {
  ODOO_MODULE,
  ODOO_SYNC_MODULE,
  OdooModuleService,
  OdooModuleService as OdooSyncService,
}
export * from "../odoo/types"
export * from "../odoo/client/odoo-client"
export * from "../odoo/utils/security"
export * from "../odoo/utils/metrics"

export default Module(ODOO_MODULE, {
  service: OdooModuleService,
})

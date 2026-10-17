import type { MedusaContainer } from "@medusajs/framework/types"
import type OdooModuleService from "../modules/odoo/service"
import { ODOO_MODULE } from "../modules/odoo/types"

export default async function odooScheduledSyncJob(
  container: MedusaContainer
): Promise<void> {
  try {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const config = await odooService.getConnectionConfig()
    if (!config.url || !config.db || !config.username) return

    await odooService.syncProducts(container, undefined, "scheduled")
    await odooService.syncInventory(container, undefined, "scheduled")
    await odooService.syncCustomers({ trigger: "scheduled" })
  } catch {
    // Logged inside OdooModuleService
  }
}

export const config = {
  name: "odoo-scheduled-sync-job",
  schedule: "*/15 * * * *",
}

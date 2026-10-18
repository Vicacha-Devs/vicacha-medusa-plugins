import type { MedusaContainer } from "@medusajs/framework/types"
import type OdooModuleService from "../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooReconciliationSettings,
} from "../modules/odoo/types"

export default async function odooReconciliationJob(
  container: MedusaContainer
): Promise<void> {
  try {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const config = await odooService.getConnectionConfig()
    if (!config.url || !config.db || !config.username) return

    const settings =
      await odooService.getSectionSettings<OdooReconciliationSettings>(
        "reconciliation"
      )
    if (settings.enableScheduledReconciliation === false) return

    await odooService.reconcileInventory({
      scope: container,
      triggeredBy: "scheduled",
    })
  } catch {
    // Logged inside OdooModuleService
  }
}

export const config = {
  name: "odoo-inventory-reconciliation-job",
  schedule: "0 */6 * * *",
}

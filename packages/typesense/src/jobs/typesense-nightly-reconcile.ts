import type { MedusaContainer } from "@medusajs/framework/types"
import { TYPESENSE_MODULE } from "../modules/typesense/types"
import type TypesenseModuleService from "../modules/typesense/service"
import { syncEntitiesToTypesenseWorkflow } from "../workflows/sync-entities"

export default async function typesenseNightlyReconcileJob(
  container: MedusaContainer
) {
  let typesenseService: TypesenseModuleService | null = null
  try {
    typesenseService = container.resolve(
      TYPESENSE_MODULE
    ) as TypesenseModuleService
  } catch {
    return
  }

  if (!typesenseService || !typesenseService.isAutoIndexEnabled()) {
    return
  }

  try {
    const overview = await typesenseService.getClusterOverview()
    if (!overview.healthy) {
      return
    }
    await syncEntitiesToTypesenseWorkflow(container).run({
      input: {
        triggeredBy: "scheduled_job",
      },
    })
  } catch {
    // Fail gracefully if Typesense cluster is temporarily unreachable
  }
}

export const config = {
  name: "typesense-nightly-reconcile",
  schedule: "0 3 * * *",
}

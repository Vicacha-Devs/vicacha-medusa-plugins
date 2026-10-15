import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { TYPESENSE_MODULE } from "../modules/typesense/types"
import type TypesenseModuleService from "../modules/typesense/service"
import { upsertTypesenseDocumentsWorkflow } from "../workflows/upsert-documents"
import { deleteTypesenseDocumentsWorkflow } from "../workflows/delete-documents"

export default async function categoryTypesenseSyncSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; ids?: string[] }>) {
  let typesenseService: TypesenseModuleService | null = null
  try {
    typesenseService = container.resolve(
      TYPESENSE_MODULE
    ) as TypesenseModuleService
  } catch {
    return
  }

  if (!typesenseService || !(await typesenseService.isAutoIndexEnabled())) {
    return
  }

  const eventName = String(event?.name || "")
  const data = event?.data || {}
  const ids = Array.isArray(data.ids) ? data.ids : data.id ? [data.id] : []
  if (ids.length === 0) return

  if (eventName === "product-category.deleted") {
    await deleteTypesenseDocumentsWorkflow(container).run({
      input: {
        entity: "categories",
        ids,
        triggeredBy: eventName,
      },
    })
    return
  }

  await upsertTypesenseDocumentsWorkflow(container).run({
    input: {
      entity: "categories",
      ids,
      triggeredBy: eventName,
    },
  })
}

export const config: SubscriberConfig = {
  event: [
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
  ],
}

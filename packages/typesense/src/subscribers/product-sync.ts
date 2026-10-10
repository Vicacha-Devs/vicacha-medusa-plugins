import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TYPESENSE_MODULE } from "../modules/typesense/types"
import type TypesenseModuleService from "../modules/typesense/service"
import { upsertTypesenseDocumentsWorkflow } from "../workflows/upsert-documents"
import { deleteTypesenseDocumentsWorkflow } from "../workflows/delete-documents"

export default async function productTypesenseSyncSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; ids?: string[]; product_id?: string }>) {
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

  const eventName = String(event?.name || "")
  const data = event?.data || {}
  const rawIds = Array.isArray(data.ids)
    ? data.ids
    : data.id
      ? [data.id]
      : []

  if (eventName === "product.deleted") {
    if (rawIds.length > 0) {
      await deleteTypesenseDocumentsWorkflow(container).run({
        input: {
          entity: "products",
          ids: rawIds,
          triggeredBy: eventName,
        },
      })
    }
    return
  }

  let productIds: string[] = []
  if (eventName.startsWith("product-variant.")) {
    if (data.product_id) {
      productIds = [data.product_id]
    } else if (rawIds.length > 0) {
      try {
        const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
        if (query && typeof query.graph === "function") {
          const { data: variants } = await query.graph({
            entity: "product_variant",
            fields: ["id", "product_id"],
            filters: { id: rawIds },
          })
          if (Array.isArray(variants)) {
            productIds = Array.from(
              new Set(
                variants
                  .map((v: any) => v?.product_id)
                  .filter((id: any): id is string => Boolean(id))
              )
            )
          }
        }
      } catch {
        productIds = []
      }
    }
  } else {
    productIds = rawIds
  }

  if (productIds.length > 0) {
    await upsertTypesenseDocumentsWorkflow(container).run({
      input: {
        entity: "products",
        ids: productIds,
        triggeredBy: eventName,
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
  ],
}

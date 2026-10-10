import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TYPESENSE_MODULE } from "../modules/typesense/types"
import type TypesenseModuleService from "../modules/typesense/service"

export interface UpsertTypesenseDocumentsInput {
  entity: string
  ids?: string[]
  records?: Record<string, any>[]
  locale?: string
  triggeredBy?: string
}

export const upsertTypesenseDocumentsStep = createStep(
  "typesense-upsert-documents-step",
  async (input: UpsertTypesenseDocumentsInput, { container }) => {
    const typesenseService = container.resolve(
      TYPESENSE_MODULE
    ) as TypesenseModuleService

    const def = await typesenseService.getEntityDefinition(input.entity)
    if (def.enabled === false) {
      return new StepResponse({
        documentsProcessed: 0,
        documentsFailed: 0,
      })
    }

    let records = Array.isArray(input.records) ? input.records : []
    if (
      records.length === 0 &&
      Array.isArray(input.ids) &&
      input.ids.length > 0
    ) {
      try {
        const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
        if (query && typeof query.graph === "function") {
          const { data } = await query.graph({
            entity: def.graphEntity || input.entity.replace(/s$/, ""),
            fields:
              def.graphFields && def.graphFields.length > 0
                ? def.graphFields
                : ["*"],
            filters: { id: input.ids },
          })
          records = Array.isArray(data) ? data : []
        }
      } catch {
        records = []
      }
    }

    const pluginOpts = typesenseService.getPluginOptions()
    const locales = input.locale
      ? [input.locale]
      : def.locales && def.locales.length > 0
        ? def.locales
        : pluginOpts.locales || [pluginOpts.defaultLocale || "en"]

    let totalProcessed = 0
    let totalFailed = 0

    for (const locale of locales) {
      const res = await typesenseService.upsertEntityRecords({
        entity: input.entity,
        records,
        locale,
        triggeredBy: input.triggeredBy || "event",
      })
      totalProcessed += res.documentsProcessed
      totalFailed += res.documentsFailed
    }

    return new StepResponse({
      documentsProcessed: totalProcessed,
      documentsFailed: totalFailed,
    })
  }
)

export const upsertTypesenseDocumentsWorkflow = createWorkflow(
  "upsert-typesense-documents",
  (input: UpsertTypesenseDocumentsInput) => {
    const res = upsertTypesenseDocumentsStep(input)
    return new WorkflowResponse(res)
  }
)

export default upsertTypesenseDocumentsWorkflow

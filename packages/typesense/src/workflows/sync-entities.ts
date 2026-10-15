import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type TypesenseModuleService from "../modules/typesense/service"
import {
  TYPESENSE_MODULE,
  type SyncEntitiesWorkflowInput,
  type SyncEntitySummary,
} from "../types"

export const syncEntitiesStep = createStep(
  "sync-entities",
  async (input: SyncEntitiesWorkflowInput, { container }) => {
    const typesenseService = container.resolve(
      TYPESENSE_MODULE
    ) as TypesenseModuleService

    let query: any = null
    try {
      query = container.resolve(ContainerRegistrationKeys.QUERY)
    } catch {
      query = null
    }

    const allDefinitions = await typesenseService.getAllEntityDefinitions()
    const targetEntities =
      Array.isArray(input.entities) && input.entities.length > 0
        ? input.entities
        : allDefinitions
            .filter((d) => d.enabled !== false)
            .map((d) => d.entity)

    const pluginOpts = await typesenseService.getPluginOptions()
    const summaries: SyncEntitySummary[] = []

    for (const entity of targetEntities) {
      const def = await typesenseService.getEntityDefinition(entity)
      if (def.enabled === false) {
        continue
      }

      const locales = input.locale
        ? [input.locale]
        : def.locales && def.locales.length > 0
          ? def.locales
          : pluginOpts.locales || [pluginOpts.defaultLocale || "en"]

      let records: Record<string, any>[] = []
      if (query && typeof query.graph === "function") {
        const graphEntity = def.graphEntity || entity.replace(/s$/, "")
        const graphFields =
          def.graphFields && def.graphFields.length > 0
            ? def.graphFields
            : ["*"]
        const filters =
          Array.isArray(input.ids) && input.ids.length > 0
            ? { id: input.ids }
            : {}

        try {
          const { data } = await query.graph({
            entity: graphEntity,
            fields: graphFields,
            filters,
          })
          records = Array.isArray(data) ? data : []
        } catch {
          records = []
        }
      }

      const isIncremental =
        Array.isArray(input.ids) &&
        input.ids.length > 0 &&
        input.fullReindex !== true

      for (const locale of locales) {
        if (isIncremental) {
          const startTime = Date.now()
          const { aliasName, physicalName } =
            await typesenseService.ensureCollectionReady(entity, locale)
          const res = await typesenseService.upsertEntityRecords({
            entity,
            records,
            locale,
            triggeredBy: input.triggeredBy || "workflow",
          })
          summaries.push({
            entity,
            locale,
            aliasName,
            collectionName: physicalName,
            documentsProcessed: res.documentsProcessed,
            documentsFailed: res.documentsFailed,
            durationMs: Date.now() - startTime,
          })
        } else {
          const res = await typesenseService.reindexEntityZeroDowntime({
            entity,
            records,
            locale,
            triggeredBy: input.triggeredBy || "workflow",
          })
          summaries.push({
            entity,
            locale,
            aliasName: res.aliasName,
            collectionName: res.collectionName,
            documentsProcessed: res.documentsProcessed,
            documentsFailed: res.documentsFailed,
            durationMs: res.durationMs,
          })
        }
      }
    }

    return new StepResponse({ summaries })
  }
)

export const syncEntitiesToTypesenseWorkflow = createWorkflow(
  "sync-entities-to-typesense",
  (input: SyncEntitiesWorkflowInput) => {
    const result = syncEntitiesStep(input)
    return new WorkflowResponse(result)
  }
)

export default syncEntitiesToTypesenseWorkflow

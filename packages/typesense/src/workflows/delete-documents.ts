import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { TYPESENSE_MODULE } from "../modules/typesense/types"
import type TypesenseModuleService from "../modules/typesense/service"

export interface DeleteTypesenseDocumentsInput {
  entity: string
  ids: string[]
  locale?: string
  triggeredBy?: string
}

export const deleteTypesenseDocumentsStep = createStep(
  "typesense-delete-documents-step",
  async (input: DeleteTypesenseDocumentsInput, { container }) => {
    const typesenseService = container.resolve(
      TYPESENSE_MODULE
    ) as TypesenseModuleService

    const def = await typesenseService.getEntityDefinition(input.entity)
    const pluginOpts = typesenseService.getPluginOptions()
    const locales = input.locale
      ? [input.locale]
      : def.locales && def.locales.length > 0
        ? def.locales
        : pluginOpts.locales || [pluginOpts.defaultLocale || "en"]

    let deletedCount = 0
    for (const locale of locales) {
      const res = await typesenseService.deleteEntityDocumentIds({
        entity: input.entity,
        ids: input.ids,
        locale,
        triggeredBy: input.triggeredBy || "event",
      })
      deletedCount += res.deletedCount
    }

    return new StepResponse({ deletedCount })
  }
)

export const deleteTypesenseDocumentsWorkflow = createWorkflow(
  "delete-typesense-documents",
  (input: DeleteTypesenseDocumentsInput) => {
    const res = deleteTypesenseDocumentsStep(input)
    return new WorkflowResponse(res)
  }
)

export default deleteTypesenseDocumentsWorkflow

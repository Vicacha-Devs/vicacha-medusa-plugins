import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import DocumentsModuleService from "../modules/documents/service"
import { DOCUMENTS_MODULE } from "../types"

export type DeleteRegionSettingsInput = { region_id: string }

const deleteRegionSettingsStep = createStep(
  "delete-region-settings",
  async (input: DeleteRegionSettingsInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const previous = await documentsService.listDocumentSettings({
      region_id: input.region_id.trim(),
    })
    const deleted = await documentsService.deleteRegionSettings(input.region_id)
    return new StepResponse(deleted, previous)
  },
  async (previous, { container }) => {
    if (!previous?.length) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    await documentsService.createDocumentSettings(
      previous.map((row: any) => {
        const { created_at, updated_at, deleted_at, ...rest } = row
        return rest
      })
    )
  }
)

export const deleteRegionSettingsWorkflow = createWorkflow(
  "delete-region-settings",
  (input: DeleteRegionSettingsInput) => {
    const deleted = deleteRegionSettingsStep(input)
    return new WorkflowResponse(deleted)
  }
)

export default deleteRegionSettingsWorkflow

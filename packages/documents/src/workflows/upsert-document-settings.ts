import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { DOCUMENTS_MODULE } from "../types"
import DocumentsModuleService from "../modules/documents/service"

export type UpsertDocumentSettingsInput = {
  data: Record<string, unknown>
  region_id?: string | null
}

const upsertDocumentSettingsStep = createStep(
  "upsert-document-settings",
  async (input: UpsertDocumentSettingsInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const normalizedRegionId =
      input.region_id &&
      input.region_id.trim().length > 0 &&
      input.region_id !== "global"
        ? input.region_id.trim()
        : null
    const [previous] = await documentsService.listDocumentSettings({
      region_id: normalizedRegionId,
    })
    const settings = await documentsService.upsertSettings(
      input.data,
      input.region_id
    )
    return new StepResponse(settings, {
      previous,
      createdId: previous ? undefined : (settings.id as string | undefined),
    })
  },
  async (compensation, { container }) => {
    if (!compensation) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    if (compensation.previous) {
      await documentsService.updateDocumentSettings(
        compensation.previous as any
      )
    } else if (compensation.createdId) {
      await documentsService.deleteDocumentSettings([compensation.createdId])
    }
  }
)

export const upsertDocumentSettingsWorkflow = createWorkflow(
  "upsert-document-settings",
  (input: UpsertDocumentSettingsInput) => {
    const settings = upsertDocumentSettingsStep(input)
    return new WorkflowResponse(settings)
  }
)

export default upsertDocumentSettingsWorkflow

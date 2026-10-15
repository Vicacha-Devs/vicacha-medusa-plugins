import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { DOCUMENTS_MODULE } from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import { upsertDocumentSettingsWorkflow } from "../../../../workflows/upsert-document-settings"
import { deleteRegionSettingsWorkflow } from "../../../../workflows/delete-region-settings"
import { UpdateSettingsSchema } from "../../../validators"

/**
 * GET /admin/documents/settings?region_id=...
 * Returns the resolved settings for a region (or global default if region_id is omitted),
 * plus whether a regional override is active and optional integration capabilities.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const regionId =
    typeof req.query.region_id === "string" &&
    req.query.region_id.trim().length > 0 &&
    req.query.region_id !== "global"
      ? req.query.region_id.trim()
      : null

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const settings = await documentsService.resolveSettings(regionId)
  const allSettings = await documentsService.listDocumentSettings({})
  const configuredRegions = allSettings
    .map((s: any) => s.region_id)
    .filter((r: any): r is string => Boolean(r))

  const pluginOptions = await documentsService.getPluginOptions()

  return res.status(200).json({
    settings,
    is_regional_override:
      regionId !== null && settings.region_id === regionId,
    configured_region_ids: configuredRegions,
    integrations: {
      docuseal_configured: documentsService.docuseal.isConfigured(),
      b2b_enabled: pluginOptions.b2b?.enabled !== false,
    },
  })
}

/**
 * PUT /admin/documents/settings
 * Creates or updates global (`region_id = null`) or regional (`region_id = "reg_..."`) settings.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const parsed = UpdateSettingsSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid settings payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const queryRegionId =
    typeof req.query.region_id === "string" ? req.query.region_id : undefined
  const targetRegionId =
    parsed.data.region_id !== undefined ? parsed.data.region_id : queryRegionId

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const { result: updated } = await upsertDocumentSettingsWorkflow(
    req.scope
  ).run({ input: { data: parsed.data, region_id: targetRegionId } })

  return res.status(200).json({
    settings: updated,
    is_regional_override: Boolean(updated.region_id),
  })
}

/**
 * DELETE /admin/documents/settings?region_id=reg_...
 * Deletes a regional settings override so that the region falls back to global settings.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const regionId =
    typeof req.query.region_id === "string" ? req.query.region_id.trim() : ""

  if (!regionId || regionId === "global") {
    return res.status(400).json({
      message: "A non-global region_id query parameter is required to reset an override",
    })
  }

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const { result: deleted } = await deleteRegionSettingsWorkflow(
    req.scope
  ).run({ input: { region_id: regionId } })
  const fallbackSettings = await documentsService.getGlobalSettings()

  return res.status(200).json({
    deleted,
    region_id: regionId,
    settings: fallbackSettings,
  })
}

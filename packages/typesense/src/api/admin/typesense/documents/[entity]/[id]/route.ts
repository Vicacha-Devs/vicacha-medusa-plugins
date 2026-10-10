import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../../../modules/typesense/service"
import { upsertTypesenseDocumentsWorkflow } from "../../../../../../workflows/upsert-documents"
import { deleteTypesenseDocumentsWorkflow } from "../../../../../../workflows/delete-documents"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const id = String(req.params.id || "").trim()
  const locale =
    typeof req.query?.locale === "string" ? req.query.locale : undefined

  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const document = await typesenseService.retrieveIndexedDocument(
      entity,
      id,
      locale
    )
    return res.status(200).json({
      entity,
      id,
      indexed: Boolean(document),
      document,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to inspect document in Typesense",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const id = String(req.params.id || "").trim()
  const locale =
    typeof req.query?.locale === "string" ? req.query.locale : undefined

  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const { result } = await upsertTypesenseDocumentsWorkflow(req.scope).run({
      input: {
        entity,
        ids: [id],
        locale,
        triggeredBy: "admin_widget",
      },
    })

    const document = await typesenseService.retrieveIndexedDocument(
      entity,
      id,
      locale
    )

    return res.status(200).json({
      entity,
      id,
      indexed: Boolean(document),
      documents_processed: result.documentsProcessed,
      document,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to sync document to Typesense",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const id = String(req.params.id || "").trim()
  const locale =
    typeof req.query?.locale === "string" ? req.query.locale : undefined

  try {
    await deleteTypesenseDocumentsWorkflow(req.scope).run({
      input: {
        entity,
        ids: [id],
        locale,
        triggeredBy: "admin_widget",
      },
    })

    return res.status(200).json({
      id,
      entity,
      deleted: true,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to delete document from Typesense",
      detail: error?.message || "Unknown error",
    })
  }
}

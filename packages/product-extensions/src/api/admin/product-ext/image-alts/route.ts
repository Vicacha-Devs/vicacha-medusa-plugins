import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../../../../modules/product-ext"
import { importImageAltsWorkflow } from "../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const productIds =
    typeof req.query.product_ids === "string"
      ? req.query.product_ids
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined

  const csvContent = await service.exportAllImageAltsCsv(productIds)
  return res.status(200).json({ csv_content: csvContent })
}

export async function POST(
  req: MedusaRequest<{ csv_content: string }>,
  res: MedusaResponse
) {
  const { result } = await importImageAltsWorkflow(req.scope).run({
    input: {
      csv_content: req.validatedBody.csv_content,
    },
  })

  return res.status(200).json(result)
}

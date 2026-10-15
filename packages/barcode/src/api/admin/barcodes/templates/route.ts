import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"
import type { CreateLabelTemplateBody } from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const templates = await barcodeService.listAllLabelTemplates()
  res.json({
    templates,
    count: templates.length,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const body = req.validatedBody as CreateLabelTemplateBody

  const created = await barcodeService.createBarcodeLabelTemplates({
    name: body.name,
    preset_id: body.preset_id || "custom",
    layout_type: body.layout_type || "thermal_roll",
    width_mm: body.width_mm,
    height_mm: body.height_mm,
    columns: body.columns ?? 1,
    rows: body.rows ?? 1,
    margin_top_mm: body.margin_top_mm ?? 2,
    margin_left_mm: body.margin_left_mm ?? 2,
    gap_x_mm: body.gap_x_mm ?? 0,
    gap_y_mm: body.gap_y_mm ?? 2,
    symbology: body.symbology || "ean13",
    show_title: body.show_title ?? true,
    show_variant_title: body.show_variant_title ?? true,
    show_sku: body.show_sku ?? true,
    show_price: body.show_price ?? true,
    show_compare_at_price: body.show_compare_at_price ?? true,
    show_brand: body.show_brand ?? false,
    show_qr: body.show_qr ?? false,
    custom_header: body.custom_header ?? null,
    custom_footer: body.custom_footer ?? null,
    dpi: Number(body.dpi || 203),
    is_default: body.is_default ?? false,
  })

  res.status(201).json({ template: created })
}

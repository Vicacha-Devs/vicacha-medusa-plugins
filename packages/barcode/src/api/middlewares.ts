import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  ApplyCountSessionBodySchema,
  BatchBarcodeImportBodySchema,
  BulkGenerateBarcodesBodySchema,
  CreateBarcodeTagBodySchema,
  CreateCountSessionBodySchema,
  CreateFromBarcodeBodySchema,
  CreateLabelTemplateBodySchema,
  LookupBarcodeBodySchema,
  PrintLabelsBodySchema,
  QuickScanAdjustBodySchema,
  RecordCountScanBodySchema,
  UpdateBarcodeTagBodySchema,
  VerifyStoreBarcodeBodySchema,
} from "./validators"

export * from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/barcodes/lookup",
      method: ["POST"],
      middlewares: [validateAndTransformBody(LookupBarcodeBodySchema)],
    },
    {
      matcher: "/admin/barcodes/create-from-barcode",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateFromBarcodeBodySchema)],
    },
    {
      matcher: "/admin/barcodes/batch",
      method: ["POST"],
      middlewares: [validateAndTransformBody(BatchBarcodeImportBodySchema)],
    },
    {
      matcher: "/admin/barcodes/bulk-generate",
      method: ["POST"],
      middlewares: [validateAndTransformBody(BulkGenerateBarcodesBodySchema)],
    },
    {
      matcher: "/admin/barcodes/scan",
      method: ["POST"],
      middlewares: [validateAndTransformBody(QuickScanAdjustBodySchema)],
    },
    {
      matcher: "/admin/barcodes/tags",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateBarcodeTagBodySchema)],
    },
    {
      matcher: "/admin/barcodes/tags/:id",
      method: ["PATCH"],
      middlewares: [validateAndTransformBody(UpdateBarcodeTagBodySchema)],
    },
    {
      matcher: "/admin/barcodes/templates",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateLabelTemplateBodySchema)],
    },
    {
      matcher: "/admin/barcodes/print",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PrintLabelsBodySchema)],
    },
    {
      matcher: "/admin/barcodes/count-sessions",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateCountSessionBodySchema)],
    },
    {
      matcher: "/admin/barcodes/count-sessions/:id/scan",
      method: ["POST"],
      middlewares: [validateAndTransformBody(RecordCountScanBodySchema)],
    },
    {
      matcher: "/admin/barcodes/count-sessions/:id/apply",
      method: ["POST"],
      middlewares: [validateAndTransformBody(ApplyCountSessionBodySchema)],
    },
    {
      matcher: "/store/barcodes/:code/verify",
      method: ["POST"],
      middlewares: [validateAndTransformBody(VerifyStoreBarcodeBodySchema)],
    },
  ],
})

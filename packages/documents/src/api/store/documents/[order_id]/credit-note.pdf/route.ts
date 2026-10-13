import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { serveStoreOrderDocumentPdf } from "../_shared"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  return serveStoreOrderDocumentPdf(req, res, "credit_note")
}

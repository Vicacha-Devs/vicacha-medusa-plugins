import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveStoriesService } from "../../../../../modules/story"
import type {
  CreateStoryStickerInput,
  DeleteStoryStickerInput,
} from "../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const body = req.validatedBody as CreateStoryStickerInput
  const sticker = await svc.addSticker(req.params.id, body)
  res.status(201).json({ sticker })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const body = req.validatedBody as DeleteStoryStickerInput
  const result = await svc.removeSticker(body.sticker_id, req.params.id)
  res.json(result)
}

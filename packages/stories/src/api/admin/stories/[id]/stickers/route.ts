import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type StoriesModuleService from "../../../../../modules/story/service"
import { STORIES_MODULE } from "../../../../../modules/story/types"
import type {
  CreateStoryStickerInput,
  DeleteStoryStickerInput,
} from "../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const body = req.validatedBody as CreateStoryStickerInput
  const sticker = await svc.addSticker(req.params.id, body)
  res.status(201).json({ sticker })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const body = req.validatedBody as DeleteStoryStickerInput
  const result = await svc.removeSticker(body.sticker_id, req.params.id)
  res.json(result)
}

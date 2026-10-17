import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type StoriesModuleService from "../../../../../modules/story/service"
import { STORIES_MODULE } from "../../../../../modules/story/types"
import type { InteractWithStoryStickerInput } from "../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const body = req.validatedBody as InteractWithStoryStickerInput

  const sticker = await svc.interactWithSticker({
    storyId: req.params.id,
    stickerId: body.sticker_id,
    optionId: body.option_id,
    responseText: body.response_text,
    sessionId: body.session_id,
  })

  res.json({ sticker })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  resolveStoriesService,
  type StoryPlacementZone,
} from "../../../modules/story"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const placement =
    typeof req.query?.placement === "string"
      ? (req.query.placement as StoryPlacementZone)
      : undefined
  const targetEntityId =
    typeof req.query?.target_entity_id === "string"
      ? req.query.target_entity_id
      : undefined
  const collectionId =
    typeof req.query?.collection_id === "string"
      ? req.query.collection_id
      : undefined
  const groupId =
    typeof req.query?.group_id === "string" ? req.query.group_id : undefined
  const productId =
    typeof req.query?.product_id === "string" ? req.query.product_id : undefined

  const [stories, groups] = await Promise.all([
    svc.listActive({
      group_id: groupId,
      product_id: productId,
    }),
    svc.listStorefrontGroups({
      placement,
      target_entity_id: targetEntityId,
      collection_id: collectionId,
      group_id: groupId,
      product_id: productId,
    }),
  ])

  res.json({
    stories,
    groups,
  })
}

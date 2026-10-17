import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import {
  CreateStoryGroupSchema,
  CreateStoryHotspotSchema,
  CreateStorySlideSchema,
  CreateStoryStickerSchema,
  DeleteStoryHotspotSchema,
  DeleteStoryStickerSchema,
  InteractWithStoryStickerSchema,
  RecordStoryEngagementSchema,
  UpdateStoryGroupSchema,
  UpdateStorySlideSchema,
} from "./validators"

export * from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/stories",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateStorySlideSchema)],
    },
    {
      matcher: "/admin/stories/:id",
      method: ["PATCH"],
      middlewares: [validateAndTransformBody(UpdateStorySlideSchema)],
    },
    {
      matcher: "/admin/stories/groups",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateStoryGroupSchema)],
    },
    {
      matcher: "/admin/stories/groups/:id",
      method: ["PATCH"],
      middlewares: [validateAndTransformBody(UpdateStoryGroupSchema)],
    },
    {
      matcher: "/admin/stories/:id/hotspots",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateStoryHotspotSchema)],
    },
    {
      matcher: "/admin/stories/:id/hotspots",
      method: ["DELETE"],
      middlewares: [validateAndTransformBody(DeleteStoryHotspotSchema)],
    },
    {
      matcher: "/admin/stories/:id/stickers",
      method: ["POST"],
      middlewares: [validateAndTransformBody(CreateStoryStickerSchema)],
    },
    {
      matcher: "/admin/stories/:id/stickers",
      method: ["DELETE"],
      middlewares: [validateAndTransformBody(DeleteStoryStickerSchema)],
    },
    {
      matcher: "/store/stories/:id/events",
      method: ["POST"],
      middlewares: [validateAndTransformBody(RecordStoryEngagementSchema)],
    },
    {
      matcher: "/store/stories/:id/interact",
      method: ["POST"],
      middlewares: [validateAndTransformBody(InteractWithStoryStickerSchema)],
    },
  ],
})

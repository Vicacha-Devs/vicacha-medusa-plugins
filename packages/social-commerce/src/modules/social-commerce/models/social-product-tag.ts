import { model } from "@medusajs/framework/utils"

/**
 * Links Medusa products & variants to any SocialMediaPost (video, reel, story, image, carousel)
 * with optional video timeline timestamp_seconds or image/story x,y hotspot coordinates.
 */
export const SocialProductTag = model
  .define("social_product_tag", {
    id: model.id().primaryKey(),
    social_media_post_id: model.text().nullable(),
    social_post_id: model.text().nullable(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    timestamp_seconds: model.number().nullable(),
    position_x: model.number().nullable(),
    position_y: model.number().nullable(),
    label: model.text().nullable(),
    is_featured: model.boolean().default(false),
    display_order: model.number().default(0),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["social_media_post_id", "product_id"],
      name: "IDX_social_product_tag_media_post_product",
    },
    {
      on: ["social_post_id", "product_id"],
      name: "IDX_social_product_tag_post_product",
    },
    {
      on: ["product_id"],
      name: "IDX_social_product_tag_product",
    },
  ])

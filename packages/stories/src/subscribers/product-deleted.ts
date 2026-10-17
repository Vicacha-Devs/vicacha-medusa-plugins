import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type StoriesModuleService from "../modules/story/service"
import { STORIES_MODULE } from "../modules/story/types"

export default async function productDeletedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) return
  const storiesService = container.resolve(
    STORIES_MODULE
  ) as StoriesModuleService
  await storiesService.removeHotspotsByProductId(data.id)
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { resolveStoriesService } from "../modules/story"

export default async function productDeletedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) return
  const storiesService = resolveStoriesService(container)
  await storiesService.removeHotspotsByProductId(data.id)
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}

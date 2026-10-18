import type { MedusaContainer } from "@medusajs/framework/types"
import { resolveStoriesService } from "../modules/story"

export default async function expireEphemeralStoriesJob(
  container: MedusaContainer
) {
  const storiesService = resolveStoriesService(container)
  await storiesService.expireOutdatedStories()
}

export const config = {
  name: "expire-ephemeral-stories",
  schedule: "*/15 * * * *",
}

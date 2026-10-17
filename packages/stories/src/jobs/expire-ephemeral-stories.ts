import type { MedusaContainer } from "@medusajs/framework/types"
import type StoriesModuleService from "../modules/story/service"
import { STORIES_MODULE } from "../modules/story/types"

export default async function expireEphemeralStoriesJob(
  container: MedusaContainer
) {
  const storiesService = container.resolve(
    STORIES_MODULE
  ) as StoriesModuleService
  await storiesService.expireOutdatedStories()
}

export const config = {
  name: "expire-ephemeral-stories",
  schedule: "*/15 * * * *",
}

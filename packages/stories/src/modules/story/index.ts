import { Module } from "@medusajs/framework/utils"
import StoriesModuleService from "./service"
import { LEGACY_STORIES_MODULE, STORIES_MODULE } from "./types"

export type StoryServiceType = typeof StoriesModuleService
export type IStoryService = StoriesModuleService

export function resolveStoriesService(scope: {
  resolve: (key: string) => unknown
}): StoriesModuleService {
  try {
    const svc = scope.resolve(STORIES_MODULE)
    if (svc) {
      return svc as StoriesModuleService
    }
  } catch {
    // Fall back to legacy @bambiste/medusa-stories module key ("Story")
  }
  return scope.resolve(LEGACY_STORIES_MODULE) as StoriesModuleService
}

export {
  STORIES_MODULE,
  LEGACY_STORIES_MODULE,
  StoriesModuleService,
  StoriesModuleService as StoriesService,
}
export * from "./models"
export * from "./types"
export * from "./utils/security"

export default Module(STORIES_MODULE, {
  service: StoriesModuleService,
})

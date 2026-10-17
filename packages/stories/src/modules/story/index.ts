import { Module } from "@medusajs/framework/utils"
import StoriesModuleService from "./service"
import { STORIES_MODULE } from "./types"

export { STORIES_MODULE, StoriesModuleService }
export * from "./models"
export * from "./types"
export * from "./utils/security"

export default Module(STORIES_MODULE, {
  service: StoriesModuleService,
})

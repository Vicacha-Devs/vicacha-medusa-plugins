import { Module } from "@medusajs/framework/utils"
import NotificationsModuleService from "./service"
import { NOTIFICATIONS_MODULE } from "./types"

export default Module(NOTIFICATIONS_MODULE, {
  service: NotificationsModuleService,
})

export * from "./types"
export { NotificationsModuleService }

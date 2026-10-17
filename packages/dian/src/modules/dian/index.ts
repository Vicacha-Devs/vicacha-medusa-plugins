import { Module } from "@medusajs/framework/utils"
import DianModuleService from "./service"
import { DIAN_MODULE } from "../../types"

export { DIAN_MODULE }
export { DianModuleService }
export * from "./models"
export * from "./utils"
export * from "./providers"

export default Module(DIAN_MODULE, {
  service: DianModuleService,
})

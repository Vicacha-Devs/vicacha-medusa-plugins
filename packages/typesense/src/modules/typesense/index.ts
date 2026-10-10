import { Module } from "@medusajs/framework/utils"
import TypesenseModuleService from "./service"
import { TYPESENSE_MODULE } from "./types"

export * from "./types"
export * from "./models"
export * from "./utils/schemas"
export * from "./utils/transformers"
export * from "./utils/filter-compiler"
export { TypesenseModuleService }

export default Module(TYPESENSE_MODULE, {
  service: TypesenseModuleService,
})

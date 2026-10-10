import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  TypesenseSearchProviderService,
  TYPESENSE_PROVIDER_IDENTIFIER,
  type TypesenseSearchProviderOptions,
} from "./service"

export {
  TypesenseSearchProviderService,
  TYPESENSE_PROVIDER_IDENTIFIER,
  type TypesenseSearchProviderOptions,
}

export default ModuleProvider(Modules.SEARCH, {
  services: [TypesenseSearchProviderService],
})

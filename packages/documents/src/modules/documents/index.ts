import type { ModuleExports } from "@medusajs/framework/types"
import { Module } from "@medusajs/framework/utils"
import DocumentsModuleService from "./service"
import { DOCUMENTS_MODULE } from "./types"

export { DOCUMENTS_MODULE }
export * from "./types"
export { DocumentsModuleService }

type DocumentsLinkable = Record<
  | "mpdDocument"
  | "mpdDocumentSettings"
  | "mpdDocumentTemplate"
  | "mpdSignatureRequest",
  any
>

// Explicit annotation keeps the emitted declaration portable (TS2742).
const DocumentsModule = Module(DOCUMENTS_MODULE, {
  service: DocumentsModuleService,
}) as ModuleExports<typeof DocumentsModuleService> & {
  linkable: DocumentsLinkable
}

export default DocumentsModule

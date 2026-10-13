import { model } from "@medusajs/framework/utils"
import {
  DOCUMENT_TYPES,
  PAGE_ORIENTATIONS,
  PAGE_SIZES,
  TEMPLATE_ENGINES,
} from "../types"

export const DocumentTemplate = model
  .define("mpd_document_template", {
    id: model.id().primaryKey(),
    name: model.text().searchable(),
    description: model.text().nullable(),
    document_type: model.enum([...DOCUMENT_TYPES]).default("invoice"),
    engine: model.enum([...TEMPLATE_ENGINES]).default("handlebars"),
    preset_key: model.text().nullable(),
    page_size: model.enum([...PAGE_SIZES]).default("A4"),
    orientation: model.enum([...PAGE_ORIENTATIONS]).default("portrait"),
    html_content: model.text().nullable(),
    styles: model.json().nullable(),
    sections: model.json().nullable(),
    is_default: model.boolean().default(false),
    is_system: model.boolean().default(false),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["document_type", "is_default"],
      name: "IDX_mpd_template_type_default",
    },
  ])

export default DocumentTemplate

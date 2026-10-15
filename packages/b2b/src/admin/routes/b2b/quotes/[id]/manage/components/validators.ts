import { z } from "zod"

export const ManageQuoteFormSchema = z.object({})

export type ManageQuoteFormSchemaType = z.infer<typeof ManageQuoteFormSchema>

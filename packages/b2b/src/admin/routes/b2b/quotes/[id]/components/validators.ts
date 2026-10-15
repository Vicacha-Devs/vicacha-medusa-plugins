import { z } from "zod"

export const MessageSchema = z.object({
  text: z.string().min(1),
  item_id: z.string().nullish(),
})

export type MessageFormData = z.infer<typeof MessageSchema>

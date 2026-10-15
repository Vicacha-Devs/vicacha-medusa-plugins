import { z } from "zod"

export const makeEmployeeCreateFormSchema = () =>
  z.object({
    first_name: z.string().optional().or(z.literal("")),
    last_name: z.string().optional().or(z.literal("")),
    email: z.email(),
    phone: z.string().optional().or(z.literal("")),
    spending_limit: z.string().optional(),
    is_admin: z.boolean(),
  })

export type CreateEmployeeFormValues = z.infer<
  ReturnType<typeof makeEmployeeCreateFormSchema>
>

export const makeEmployeeUpdateFormSchema = () =>
  z.object({
    spending_limit: z.string().optional(),
    is_admin: z.boolean(),
  })

export type UpdateEmployeeFormValues = z.infer<
  ReturnType<typeof makeEmployeeUpdateFormSchema>
>

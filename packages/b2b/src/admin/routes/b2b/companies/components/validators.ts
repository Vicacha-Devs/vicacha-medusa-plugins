import { z } from "zod"

import { ESpendingLimitResetFrequency } from "../../../../../types"

export const makeCompanyFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("companies.form.name")),
    email: z.email(),
    currency_code: z.string().min(1, t("companies.form.currency")),
    phone: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    zip: z.string().optional().or(z.literal("")),
    country: z.string().optional().or(z.literal("")),
    logo_url: z.string().optional().or(z.literal("")),
    spending_limit_reset_frequency: z
      .enum(ESpendingLimitResetFrequency)
      .optional(),
    spending_limit_reset_at: z.string().optional().or(z.literal("")),
  })

export type CompanyFormValues = z.infer<ReturnType<typeof makeCompanyFormSchema>>

export const makeCompanyCreateFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("companies.form.name")),
    email: z.email(),
    currency_code: z.string().min(1, t("companies.form.currency")),
    phone: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    zip: z.string().optional().or(z.literal("")),
    country: z.string().optional().or(z.literal("")),
    logo_url: z.string().optional().or(z.literal("")),
    spending_limit_reset_frequency: z
      .enum(ESpendingLimitResetFrequency)
      .optional(),
    customer_group_id: z.string().optional().or(z.literal("")),
    requires_admin_approval: z.boolean(),
    requires_sales_manager_approval: z.boolean(),
  })

export type CompanyCreateFormValues = z.infer<
  ReturnType<typeof makeCompanyCreateFormSchema>
>

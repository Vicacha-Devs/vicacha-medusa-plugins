import { zodResolver } from "@hookform/resolvers/zod"
import { Button, CurrencyInput, Input, Text } from "@medusajs/ui"
import {
  CoolSwitch,
  currencySymbolMap,
  Form,
  KeyboundForm,
  RouteDrawer,
} from "@vicacha-devs/medusa-shared-admin/admin"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AdminCreateEmployee, QueryCompany } from "../../../../../../../types"

const makeSchema = () =>
  z.object({
    first_name: z.string().optional().or(z.literal("")),
    last_name: z.string().optional().or(z.literal("")),
    email: z.email(),
    phone: z.string().optional().or(z.literal("")),
    spending_limit: z.string().optional(),
    is_admin: z.boolean(),
  })

type CreateEmployeeFormValues = z.infer<ReturnType<typeof makeSchema>>

export function EmployeesCreateForm({
  handleSubmit,
  loading,
  error,
  company,
}: {
  handleSubmit: (data: AdminCreateEmployee & { email: string; first_name?: string; last_name?: string; phone?: string }) => Promise<void>
  loading: boolean
  error: Error | null
  company: QueryCompany
}) {
  const { t } = useTranslation()

  const form = useForm<CreateEmployeeFormValues>({
    resolver: zodResolver(makeSchema()),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      spending_limit: "0",
      is_admin: false,
    },
  })

  const currencyKey = (company.currency_code || "USD") as keyof typeof currencySymbolMap

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={form.handleSubmit((data) =>
          handleSubmit({
            ...data,
            company_id: company.id,
            customer_id: "",
            spending_limit: data.spending_limit ? parseInt(data.spending_limit, 10) : 0,
          })
        )}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-6 overflow-auto p-4">
          <div className="flex flex-col gap-y-4">
            <h2 className="h2-core">{t("employees.form.details")}</h2>
            <Form.Field
              control={form.control}
              name="first_name"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>{t("employees.form.firstName")}</Form.Label>
                  <Form.Control>
                    <Input placeholder="John" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="last_name"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>{t("employees.form.lastName")}</Form.Label>
                  <Form.Control>
                    <Input placeholder="Doe" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="email"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label>{t("employees.form.email")}</Form.Label>
                  <Form.Control>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="phone"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>{t("employees.form.phone")}</Form.Label>
                  <Form.Control>
                    <Input placeholder="0612345678" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
          <div className="flex flex-col gap-y-4">
            <h2 className="h2-core">{t("employees.form.permissions")}</h2>
            <Form.Field
              control={form.control}
              name="spending_limit"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>
                    {t("employees.form.spendingLimit", {
                      currency: company.currency_code?.toUpperCase() || "USD",
                    })}
                  </Form.Label>
                  <Form.Control>
                    <CurrencyInput
                      symbol={currencySymbolMap[currencyKey]}
                      code={company.currency_code || "USD"}
                      placeholder="1000"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="is_admin"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>{t("employees.form.adminAccess")}</Form.Label>
                  <Form.Control>
                    <CoolSwitch
                      fieldName="is_admin"
                      label={t("employees.form.isAdmin")}
                      description={t("employees.form.isAdminDescription")}
                      checked={field.value}
                      onChange={field.onChange}
                      tooltip={t("employees.form.isAdminTooltip")}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <RouteDrawer.Close asChild>
            <Button variant="secondary">{t("actions.cancel")}</Button>
          </RouteDrawer.Close>
          <Button type="submit" isLoading={loading}>
            {t("actions.save")}
          </Button>
          {error && <Text className="text-ui-fg-error">{error.message}</Text>}
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

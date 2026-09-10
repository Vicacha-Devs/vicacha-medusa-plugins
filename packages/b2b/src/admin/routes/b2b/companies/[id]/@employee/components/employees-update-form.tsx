import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Container, CurrencyInput, Table, Text } from "@medusajs/ui"
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

import { AdminUpdateEmployee, QueryCompany, QueryEmployee } from "../../../../../../../types"

const makeSchema = () =>
  z.object({
    spending_limit: z.string().optional(),
    is_admin: z.boolean(),
  })

type UpdateEmployeeFormValues = z.infer<ReturnType<typeof makeSchema>>

export function EmployeesUpdateForm({
  company,
  employee,
  handleSubmit,
  loading,
  error,
}: {
  employee: QueryEmployee
  company: QueryCompany
  handleSubmit: (data: AdminUpdateEmployee) => Promise<void>
  loading: boolean
  error: Error | null
}) {
  const { t } = useTranslation()

  const form = useForm<UpdateEmployeeFormValues>({
    resolver: zodResolver(makeSchema()),
    defaultValues: {
      spending_limit: employee?.spending_limit?.toString() ?? "0",
      is_admin: employee?.is_admin ?? false,
    },
  })

  const currencyKey = (company.currency_code || "USD") as keyof typeof currencySymbolMap

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={form.handleSubmit((data) =>
          handleSubmit({
            spending_limit: data.spending_limit ? Number(data.spending_limit) : undefined,
            is_admin: data.is_admin,
          })
        )}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-6 overflow-auto p-4">
          <div className="flex flex-col gap-y-4">
            <div className="flex items-center justify-between">
              <h2 className="h2-core">{t("employees.form.details")}</h2>
              <a
                href={`/app/customers/${employee?.customer?.id}/edit`}
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              >
                {t("employees.form.editCustomerDetails")}
              </a>
            </div>
            <Container className="p-0 overflow-hidden">
              <Table>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      {t("employees.form.name")}
                    </Table.Cell>
                    <Table.Cell>
                      {employee?.customer?.first_name} {employee?.customer?.last_name}
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      {t("employees.form.email")}
                    </Table.Cell>
                    <Table.Cell>{employee?.customer?.email}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      {t("employees.form.phone")}
                    </Table.Cell>
                    <Table.Cell>{employee?.customer?.phone ?? "—"}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      {t("employees.form.company")}
                    </Table.Cell>
                    <Table.Cell>{company.name}</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </Container>
          </div>
          <div className="flex flex-col gap-y-4">
            <h2 className="h2-core">{t("employees.form.permissions")}</h2>
            <Form.Field
              control={form.control}
              name="spending_limit"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>{t("fields.spendingLimit")}</Form.Label>
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

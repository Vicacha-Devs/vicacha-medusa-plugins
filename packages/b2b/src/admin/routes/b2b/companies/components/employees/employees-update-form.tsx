import {
  Button,
  Container,
  CurrencyInput,
  Drawer,
  Label,
  Table,
  Text,
} from "@medusajs/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { CoolSwitch, currencySymbolMap } from "@vicacha-devs/shared/admin";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "../../../../../../types";

const updateEmployeeSchema = z.object({
  spending_limit: z.string().optional(),
  is_admin: z.boolean(),
});

type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>;

export function EmployeesUpdateForm({
  company,
  employee,
  handleSubmit,
  loading,
  error,
}: {
  employee: QueryEmployee;
  company: QueryCompany;
  handleSubmit: (data: AdminUpdateEmployee) => Promise<void>;
  loading: boolean;
  error: Error | null;
}) {
  const { t } = useTranslation();

  const {
    handleSubmit: rhfHandleSubmit,
    control,
  } = useForm<UpdateEmployeeFormValues>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      spending_limit: employee?.spending_limit?.toString() || "0",
      is_admin: employee?.is_admin || false,
    },
  });

  const onSubmit = rhfHandleSubmit((data) => {
    handleSubmit({
      spending_limit: data.spending_limit ? Number(data.spending_limit) : undefined,
      is_admin: data.is_admin,
    });
  });

  const currencyKey = (company.currency_code || "USD") as keyof typeof currencySymbolMap;

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="h2-core">{t("employees.form.details")}</h2>
              <a
                href={`/app/customers/${employee?.customer!.id}/edit`}
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover self-end"
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
                      {employee?.customer!.first_name}{" "}
                      {employee?.customer!.last_name}
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      {t("employees.form.email")}
                    </Table.Cell>
                    <Table.Cell>{employee?.customer!.email}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      {t("employees.form.phone")}
                    </Table.Cell>
                    <Table.Cell>{employee?.customer!.phone}</Table.Cell>
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
          <div className="flex flex-col gap-4">
            <h2 className="h2-core">{t("employees.form.permissions")}</h2>
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="txt-compact-small font-medium">
                {t("fields.spendingLimit")}
              </Label>
              <Controller
                name="spending_limit"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    symbol={currencySymbolMap[currencyKey]}
                    code={company.currency_code || "USD"}
                    placeholder="1000"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="txt-compact-small font-medium">
                {t("employees.form.adminAccess")}
              </Label>
              <Controller
                name="is_admin"
                control={control}
                render={({ field }) => (
                  <CoolSwitch
                    fieldName="is_admin"
                    label={t("employees.form.isAdmin")}
                    description={t("employees.form.isAdminDescription")}
                    checked={field.value}
                    onChange={field.onChange}
                    tooltip={t("employees.form.isAdminTooltip")}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button variant="secondary">{t("actions.cancel")}</Button>
        </Drawer.Close>
        <Button type="submit" isLoading={loading}>
          {t("actions.save")}
        </Button>
        {error && <Text className="text-ui-fg-error">{error.message}</Text>}
      </Drawer.Footer>
    </form>
  );
}

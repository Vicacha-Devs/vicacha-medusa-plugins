import {
  Button,
  Container,
  CurrencyInput,
  Drawer,
  Label,
  Table,
  Text,
} from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "@/../types";
import { CoolSwitch } from "@/components/common";
import { currencySymbolMap } from "@/utils";

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

  const [formData, setFormData] = useState<{
    spending_limit: string;
    is_admin: boolean;
  }>({
    spending_limit: employee?.spending_limit?.toString() || "0",
    is_admin: employee?.is_admin || false,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const spendingLimit = formData.spending_limit
      ? Number(formData.spending_limit)
      : undefined;

    const data = {
      ...formData,
      id: employee?.id,
      spending_limit: spendingLimit,
      raw_spending_limit: {
        value: spendingLimit,
      },
    };

    handleSubmit(data);
  };

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
              <CurrencyInput
                symbol={currencySymbolMap[company.currency_code || "USD"]}
                code={company.currency_code || "USD"}
                name="spending_limit"
                value={formData.spending_limit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    spending_limit: e.target.value.replace(/[^0-9.]/g, ""),
                  })
                }
                placeholder="1000"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="txt-compact-small font-medium">
                {t("employees.form.adminAccess")}
              </Label>
              <CoolSwitch
                fieldName="is_admin"
                label={t("employees.form.isAdmin")}
                description={t("employees.form.isAdminDescription")}
                checked={formData.is_admin}
                onChange={(checked) =>
                  setFormData({ ...formData, is_admin: checked })
                }
                tooltip={t("employees.form.isAdminTooltip")}
              />
            </div>
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button variant="secondary">{t("actions.cancel")}</Button>
        </Drawer.Close>
        <Button type="submit" disabled={loading}>
          {loading ? t("actions.saving") : t("actions.save")}
        </Button>
        {error && <Text className="text-red-500">{error.message}</Text>}
      </Drawer.Footer>
    </form>
  );
}

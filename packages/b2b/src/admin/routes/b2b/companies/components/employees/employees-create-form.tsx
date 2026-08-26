import {
  Button,
  CurrencyInput,
  Drawer,
  Input,
  Label,
  Text
} from "@medusajs/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { CoolSwitch, currencySymbolMap } from "@vicacha-devs/medusa-shared-admin/admin";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AdminCreateEmployee, QueryCompany } from "../../../../../../types";

const createEmployeeSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().min(1, "Email is required").check(z.email({ error: "Invalid email address" })),
  phone: z.string().optional(),
  spending_limit: z.string().optional(),
  is_admin: z.boolean(),
});

type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;

export function EmployeesCreateForm({
  handleSubmit,
  loading,
  error,
  company,
}: {
  handleSubmit: (data: AdminCreateEmployee) => Promise<void>;
  loading: boolean;
  error: Error | null;
  company: QueryCompany;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateEmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      spending_limit: "0",
      is_admin: false,
    },
  });

  const currencyKey = (company.currency_code || "USD") as keyof typeof currencySymbolMap;

  const onSubmit = rhfHandleSubmit((data) => {
    handleSubmit({
      ...data,
      company_id: company.id,
      customer_id: "",
      spending_limit: data.spending_limit ? parseInt(data.spending_limit, 10) : 0,
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="flex flex-col p-4 gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="h2-core">{t("employees.form.details")}</h2>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              {t("employees.form.firstName")}
            </Label>
            <Input
              type="text"
              placeholder="John"
              {...register("first_name")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              {t("employees.form.lastName")}
            </Label>
            <Input
              type="text"
              placeholder="Doe"
              {...register("last_name")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              {t("employees.form.email")} *
            </Label>
            <Input
              type="email"
              placeholder="john.doe@example.com"
              className={errors.email ? "border-ui-fg-error" : ""}
              {...register("email")}
            />
            {errors.email && (
              <Text className="txt-compact-xsmall text-ui-fg-error">{errors.email.message}</Text>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              {t("employees.form.phone")}
            </Label>
            <Input
              type="text"
              placeholder="0612345678"
              {...register("phone")}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="h2-core">{t("employees.form.permissions")}</h2>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              {t("employees.form.spendingLimit", {
                currency: company.currency_code?.toUpperCase() || "USD",
              })}
            </Label>
            <Controller
              name="spending_limit"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  symbol={currencySymbolMap[currencyKey]}
                  code={company.currency_code || "USD"}
                  type="text"
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

import { Button, Drawer, Input, Label, Select, Text } from "@medusajs/ui";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { AdminUpdateCompany } from "../../../../../types";
import { useRegions } from "../../../../hooks/api";

const companySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").check(z.email({ error: "Invalid email address" })),
  currency_code: z.string().min(1, "Currency is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  logo_url: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompanyForm({
  company,
  handleSubmit,
  loading,
  error,
}: {
  company?: AdminUpdateCompany;
  handleSubmit: (data: AdminUpdateCompany) => Promise<void>;
  loading: boolean;
  error: Error | null;
}) {
  const { t } = useTranslation();
  const { regions, isPending: regionsLoading } = useRegions();

  const currencyCodes = regions?.map((r) => r.currency_code);
  const countries = regions?.flatMap((r) => r.countries);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    control,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name ?? "",
      email: company?.email ?? "",
      currency_code: company?.currency_code ?? "",
      phone: company?.phone ?? "",
      address: company?.address ?? "",
      city: company?.city ?? "",
      state: company?.state ?? "",
      zip: company?.zip ?? "",
      country: company?.country ?? "",
      logo_url: company?.logo_url ?? "",
    },
  });

  const onSubmit = rhfHandleSubmit((data) => handleSubmit(data));

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <Label size="xsmall">{t("companies.form.name")} *</Label>
          <Input
            type="text"
            placeholder="Medusa"
            className={errors.name ? "border-ui-fg-error" : ""}
            {...register("name")}
          />
          {errors.name && (
            <Text className="txt-compact-xsmall text-ui-fg-error">{errors.name.message}</Text>
          )}

          <Label size="xsmall">{t("companies.form.phone")}</Label>
          <Input
            type="text"
            placeholder="1234567890"
            {...register("phone")}
          />

          <Label size="xsmall">{t("companies.form.email")} *</Label>
          <Input
            type="email"
            placeholder="medusa@medusa.com"
            className={errors.email ? "border-ui-fg-error" : ""}
            {...register("email")}
          />
          {errors.email && (
            <Text className="txt-compact-xsmall text-ui-fg-error">{errors.email.message}</Text>
          )}

          <Label size="xsmall">{t("companies.form.address")}</Label>
          <Input
            type="text"
            placeholder="1234 Main St"
            {...register("address")}
          />
          <Label size="xsmall">{t("companies.form.city")}</Label>
          <Input
            type="text"
            placeholder="New York"
            {...register("city")}
          />
          <Label size="xsmall">{t("companies.form.state")}</Label>
          <Input
            type="text"
            placeholder="NY"
            {...register("state")}
          />
          <Label size="xsmall">{t("companies.form.zip")}</Label>
          <Input
            type="text"
            placeholder="10001"
            {...register("zip")}
          />
          <div className="flex gap-4 w-full">
            <div className="flex flex-col gap-2 w-1/2">
              <Label size="xsmall">{t("companies.form.country")}</Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={regionsLoading}
                  >
                    <Select.Trigger disabled={regionsLoading}>
                      <Select.Value placeholder={t("companies.form.selectCountry")} />
                    </Select.Trigger>
                    <Select.Content className="z-50">
                      {countries?.map((country) => (
                        <Select.Item
                          key={country?.iso_2 || ""}
                          value={country?.iso_2 || ""}
                        >
                          {country?.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <Label size="xsmall">{t("companies.form.currency")} *</Label>
              <Controller
                name="currency_code"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={regionsLoading}
                  >
                    <Select.Trigger
                      disabled={regionsLoading}
                      className={errors.currency_code ? "border-ui-fg-error" : ""}
                    >
                      <Select.Value placeholder={t("companies.form.selectCurrency")} />
                    </Select.Trigger>
                    <Select.Content className="z-50">
                      {currencyCodes?.map((currencyCode) => (
                        <Select.Item key={currencyCode} value={currencyCode}>
                          {currencyCode.toUpperCase()}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              />
              {errors.currency_code && (
                <Text className="txt-compact-xsmall text-ui-fg-error">{errors.currency_code.message}</Text>
              )}
            </div>
          </div>
          {/* TODO: Add logo upload */}
          <Label size="xsmall">{t("companies.form.logoUrl")}</Label>
          <Input
            type="text"
            placeholder="https://example.com/logo.png"
            {...register("logo_url")}
          />
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button variant="secondary">{t("actions.cancel")}</Button>
        </Drawer.Close>
        <Button type="submit" isLoading={loading}>
          {t("actions.save")}
        </Button>
        {error && (
          <Text className="txt-compact-small text-ui-fg-warning">
            Error: {error?.message}
          </Text>
        )}
      </Drawer.Footer>
    </form>
  );
}

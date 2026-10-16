import { Form } from "@medusajs/dashboard/components"
import { Input, Select } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { type CompanyCreateFormValues } from "./validators"

export interface CompanyCreateDetailsTabProps {
  form: UseFormReturn<CompanyCreateFormValues>
  availableCountries: { iso_2: string; display_name: string }[]
  regionsLoading: boolean
}

export const CompanyCreateDetailsTab = ({
  form,
  availableCountries,
  regionsLoading,
}: CompanyCreateDetailsTabProps) => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-6 p-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Form.Field
          control={form.control}
          name="name"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label>{t("companies.form.name")}</Form.Label>
              <Form.Control>
                <Input {...field} />
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
              <Form.Label>{t("companies.form.email")}</Form.Label>
              <Form.Control>
                <Input type="email" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Form.Field
          control={form.control}
          name="phone"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label optional>{t("companies.form.phone")}</Form.Label>
              <Form.Control>
                <Input {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="logo_url"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label optional>{t("companies.form.logoUrl")}</Form.Label>
              <Form.Control>
                <Input type="url" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>

      <Form.Field
        control={form.control}
        name="address"
        render={({ field }: any) => (
          <Form.Item>
            <Form.Label optional>{t("companies.form.address")}</Form.Label>
            <Form.Control>
              <Input {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Form.Field
          control={form.control}
          name="city"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label optional>{t("companies.form.city")}</Form.Label>
              <Form.Control>
                <Input {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="state"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label optional>{t("companies.form.state")}</Form.Label>
              <Form.Control>
                <Input {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="zip"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label optional>{t("companies.form.zip")}</Form.Label>
              <Form.Control>
                <Input {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>

      <Form.Field
        control={form.control}
        name="country"
        render={({ field }: any) => (
          <Form.Item>
            <Form.Label optional>{t("companies.form.country")}</Form.Label>
            <Form.Control>
              <Select
                value={field.value?.toLowerCase() ?? ""}
                onValueChange={(v) => field.onChange(v)}
                disabled={regionsLoading}
              >
                <Select.Trigger>
                  <Select.Value placeholder={t("companies.form.selectCountry")} />
                </Select.Trigger>
                <Select.Content>
                  {availableCountries.map((c: any) => (
                    <Select.Item key={c.iso_2} value={c.iso_2}>
                      {c.display_name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </div>
  )
}

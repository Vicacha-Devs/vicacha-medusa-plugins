import { Form } from "@medusajs/dashboard/components"
import { Input, Select } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { ESpendingLimitResetFrequency } from "../../../../../types/enums"
import { type CompanyFormValues } from "./validators"

export interface CompanyFormAdminTabProps {
  form: UseFormReturn<CompanyFormValues>
  availableCurrencies: { code: string; name: string }[]
  regionsLoading: boolean
}

export const CompanyFormAdminTab = ({
  form,
  availableCurrencies,
  regionsLoading,
}: CompanyFormAdminTabProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-4">
      <Form.Field
        control={form.control}
        name="currency_code"
        render={({ field }: any) => (
          <Form.Item>
            <Form.Label>{t("companies.form.currency")}</Form.Label>
            <Form.Control>
              <Select
                value={field.value?.toUpperCase() ?? ""}
                onValueChange={(v) => field.onChange(v.toLowerCase())}
                disabled={regionsLoading}
              >
                <Select.Trigger>
                  <Select.Value placeholder={t("companies.form.selectCurrency")} />
                </Select.Trigger>
                <Select.Content>
                  {availableCurrencies.map((c) => (
                    <Select.Item key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={form.control}
        name="spending_limit_reset_frequency"
        render={({ field }: any) => (
          <Form.Item>
            <Form.Label optional>
              {t("companies.form.spendingLimitResetFrequency")}
            </Form.Label>
            <Form.Control>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <Select.Trigger>
                  <Select.Value placeholder={t("companies.form.selectFrequency")} />
                </Select.Trigger>
                <Select.Content>
                  {Object.values(ESpendingLimitResetFrequency).map((freq) => (
                    <Select.Item key={freq} value={freq}>
                      {t(`companies.form.resetFrequency.${freq}`)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={form.control}
        name="spending_limit_reset_at"
        render={({ field }: any) => (
          <Form.Item>
            <Form.Label optional>{t("companies.form.spendingLimitResetAt")}</Form.Label>
            <Form.Control>
              <Input type="date" {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </div>
  )
}

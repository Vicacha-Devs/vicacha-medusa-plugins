import { Form } from "@medusajs/dashboard/components"
import { Hint, Select } from "@medusajs/ui"
import { CoolSwitch } from "@vicacha-devs/medusa-shared-admin/admin"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { ESpendingLimitResetFrequency } from "../../../../../types"
import { type CompanyCreateFormValues } from "./validators"

const RESET_FREQUENCIES = [
  ESpendingLimitResetFrequency.NEVER,
  ESpendingLimitResetFrequency.DAILY,
  ESpendingLimitResetFrequency.WEEKLY,
  ESpendingLimitResetFrequency.MONTHLY,
  ESpendingLimitResetFrequency.YEARLY,
]

export interface CompanyCreateAdminTabProps {
  form: UseFormReturn<CompanyCreateFormValues>
  availableCurrencies: { code: string; name: string }[]
  customerGroups: { id: string; name: string }[]
  regionsLoading: boolean
  groupsLoading: boolean
}

export const CompanyCreateAdminTab = ({
  form,
  availableCurrencies,
  customerGroups,
  regionsLoading,
  groupsLoading,
}: CompanyCreateAdminTabProps) => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 p-8">
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

      <div className="flex flex-col gap-y-4">
        <h2 className="h2-core">{t("companies.form.spendingSection")}</h2>
        <Form.Field
          control={form.control}
          name="spending_limit_reset_frequency"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label optional>
                {t("companies.form.spendingLimitResetFrequency")}
              </Form.Label>
              <Form.Control>
                <Select
                  value={field.value ?? ESpendingLimitResetFrequency.NEVER}
                  onValueChange={field.onChange}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {RESET_FREQUENCIES.map((freq) => (
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
      </div>

      <div className="flex flex-col gap-y-4">
        <h2 className="h2-core">{t("companies.customerGroup.title")}</h2>
        {groupsLoading ? null : customerGroups.length === 0 ? (
          <Hint variant="info">{t("companies.customerGroup.noGroups")}</Hint>
        ) : (
          <Form.Field
            control={form.control}
            name="customer_group_id"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>{t("companies.customerGroup.header")}</Form.Label>
                <Form.Control>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value
                        placeholder={t("companies.customerGroup.selectPlaceholder")}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {customerGroups.map((g: any) => (
                        <Select.Item key={g.id} value={g.id}>
                          {g.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        )}
      </div>

      <div className="flex flex-col gap-y-4">
        <h2 className="h2-core">{t("companies.approvalSettings.title")}</h2>
        <Form.Field
          control={form.control}
          name="requires_admin_approval"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <CoolSwitch
                  fieldName="requires_admin_approval"
                  label={t("companies.approvalSettings.requiresAdmin")}
                  description={t("companies.approvalSettings.requiresAdminDescription")}
                  checked={field.value}
                  onChange={field.onChange}
                />
              </Form.Control>
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="requires_sales_manager_approval"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <CoolSwitch
                  fieldName="requires_sales_manager_approval"
                  label={t("companies.approvalSettings.requiresSalesManager")}
                  description={t(
                    "companies.approvalSettings.requiresSalesManagerDescription"
                  )}
                  checked={field.value}
                  onChange={field.onChange}
                />
              </Form.Control>
            </Form.Item>
          )}
        />
      </div>
    </div>
  )
}

import { Form } from "@medusajs/dashboard/components"
import { Container, Heading, Input, Select, Textarea } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { SUPPORTED_LOCALES } from "../../../modules/documents/types"
import type { DocumentSettingsFormValues } from "./validators"

interface SettingsCompanySectionProps {
  form: UseFormReturn<DocumentSettingsFormValues>
}

export const SettingsCompanySection: React.FC<SettingsCompanySectionProps> = ({
  form,
}) => {
  const { t } = useTranslation()

  const textInputs: Array<{
    name: keyof DocumentSettingsFormValues
    labelKey: string
    optional?: boolean
    placeholder?: string
    colSpan2?: boolean
  }> = [
    { name: "company_name", labelKey: "settings.companyName" },
    { name: "company_tax_id", labelKey: "settings.taxId", optional: true },
    {
      name: "company_address",
      labelKey: "settings.companyAddress",
      optional: true,
      colSpan2: true,
    },
    {
      name: "company_logo",
      labelKey: "settings.logoUrl",
      optional: true,
      placeholder: "https://...",
    },
    { name: "primary_color", labelKey: "settings.primaryColor" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("settings.companySectionTitle")}</Heading>
      </div>
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {textInputs.map(
            ({ name, labelKey, optional, placeholder, colSpan2 }) => (
              <div
                key={String(name)}
                className={colSpan2 ? "md:col-span-2" : undefined}
              >
                <Form.Field
                  control={form.control}
                  name={name as any}
                  render={({ field }: any) => (
                    <Form.Item>
                      <Form.Label optional={optional}>{t(labelKey)}</Form.Label>
                      <Form.Control>
                        <Input
                          size="small"
                          placeholder={placeholder}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              </div>
            )
          )}

          <Form.Field
            control={form.control}
            name="default_locale"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("settings.defaultLocale")}</Form.Label>
                <Form.Control>
                  <Select
                    size="small"
                    value={field.value || "en"}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {SUPPORTED_LOCALES.map((loc) => (
                        <Select.Item key={loc} value={loc}>
                          {loc.toUpperCase()}
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
            name="invoice_template"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("settings.invoicePreset")}</Form.Label>
                <Form.Control>
                  <Select
                    size="small"
                    value={field.value || "clean"}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="clean">
                        {t("settings.presetClean")}
                      </Select.Item>
                      <Select.Item value="classic">
                        {t("settings.presetClassic")}
                      </Select.Item>
                      <Select.Item value="compact">
                        {t("settings.presetCompact")}
                      </Select.Item>
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="receipt_template"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("settings.posWidthPreset")}</Form.Label>
                <Form.Control>
                  <Select
                    size="small"
                    value={field.value || "pos_80mm"}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="pos_80mm">
                        {t("settings.pos80mm")}
                      </Select.Item>
                      <Select.Item value="pos_58mm">
                        {t("settings.pos58mm")}
                      </Select.Item>
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(["notes", "bank_details"] as const).map((fieldName) => (
            <Form.Field
              key={fieldName}
              control={form.control}
              name={fieldName}
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>
                    {t(
                      fieldName === "notes"
                        ? "settings.documentNotes"
                        : "settings.bankDetails"
                    )}
                  </Form.Label>
                  <Form.Control>
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          ))}
        </div>
      </div>
    </Container>
  )
}

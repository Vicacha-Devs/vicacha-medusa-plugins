import { Form, SectionRow } from "@medusajs/dashboard/components"
import { Container, Heading, Switch } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import type { DocumentSettingsFormValues } from "./validators"

interface SettingsAutomationSectionProps {
  form: UseFormReturn<DocumentSettingsFormValues>
}

export const SettingsAutomationSection: React.FC<
  SettingsAutomationSectionProps
> = ({ form }) => {
  const { t } = useTranslation()

  const toggleFields: Array<{
    name: keyof DocumentSettingsFormValues
    labelKey: string
  }> = [
    {
      name: "auto_generate_invoice",
      labelKey: "settings.autoGenerateInvoice",
    },
    {
      name: "auto_generate_packing_slip",
      labelKey: "settings.autoGeneratePackingSlip",
    },
    {
      name: "auto_generate_credit_note",
      labelKey: "settings.autoGenerateCreditNote",
    },
    {
      name: "auto_email_invoice",
      labelKey: "settings.autoEmailInvoice",
    },
    {
      name: "auto_email_credit_note",
      labelKey: "settings.autoEmailCreditNote",
    },
    {
      name: "require_signature",
      labelKey: "settings.includeSignature",
    },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("settings.automationSectionTitle")}</Heading>
      </div>
      {toggleFields.map(({ name, labelKey }) => (
        <Form.Field
          key={String(name)}
          control={form.control}
          name={name as any}
          render={({ field }: any) => (
            <SectionRow
              title={t(labelKey)}
              value={
                <Switch
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              }
            />
          )}
        />
      ))}
    </Container>
  )
}

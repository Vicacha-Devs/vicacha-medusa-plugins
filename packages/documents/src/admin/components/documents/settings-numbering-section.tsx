import { Form } from "@medusajs/dashboard/components"
import { Badge, Container, Heading, Input, Text } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { formatDocumentNumber } from "../../../modules/documents/utils/numbering"
import type { DocumentSettingsFormValues } from "./validators"

interface SettingsNumberingSectionProps {
  form: UseFormReturn<DocumentSettingsFormValues>
}

export const SettingsNumberingSection: React.FC<
  SettingsNumberingSectionProps
> = ({ form }) => {
  const { t } = useTranslation()
  const settings = form.watch()

  const sampleInvoiceNumber = formatDocumentNumber(
    settings.invoice_number_format,
    {
      number: Number(
        settings.invoice_forced_next_number || settings.next_invoice_number || 1
      ),
      prefix: settings.invoice_prefix || "INV",
      order_display_id: 1042,
    },
    Number(settings.invoice_number_padding || 5)
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
        <div>
          <Heading level="h2">{t("settings.numberingSectionTitle")}</Heading>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("settings.numberingTokensHint")}
          </Text>
        </div>
        <Badge color="green">
          {t("settings.nextInvoicePreview", { sample: sampleInvoiceNumber })}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-4">
        <Form.Field
          control={form.control}
          name="invoice_number_format"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label>{t("settings.invoiceFormat")}</Form.Label>
              <Form.Control>
                <Input size="small" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="invoice_forced_next_number"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label optional>
                {t("settings.forcedNextInvoice")}
              </Form.Label>
              <Form.Control>
                <Input
                  size="small"
                  type="number"
                  placeholder={String(settings.next_invoice_number || 1)}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="packing_slip_number_format"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label>{t("settings.packingSlipFormat")}</Form.Label>
              <Form.Control>
                <Input size="small" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="credit_note_number_format"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Label>{t("settings.creditNoteFormat")}</Form.Label>
              <Form.Control>
                <Input size="small" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>
    </Container>
  )
}

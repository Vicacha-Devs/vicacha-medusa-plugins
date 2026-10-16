import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  KeyboundForm,
  RouteDrawer,
  useRouteModal,
} from "@medusajs/dashboard/components"
import { Button, Heading, Input, Select, Text, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { useBulkGenerateDocuments } from "../../../../hooks"
import type { DocumentType } from "../../../../modules/documents/types"

const bulkGenerateSchema = z.object({
  order_ids_input: z.string().min(1),
  document_type: z.enum(["invoice", "packing_slip", "credit_note", "receipt"]),
})

type BulkGenerateFormValues = z.infer<typeof bulkGenerateSchema>

const BulkGenerateContent: React.FC = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const bulkGenerateMutation = useBulkGenerateDocuments()

  const form = useForm<BulkGenerateFormValues>({
    resolver: zodResolver(bulkGenerateSchema),
    defaultValues: {
      order_ids_input: "",
      document_type: "invoice",
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    const orderIds = values.order_ids_input
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (orderIds.length === 0) {
      toast.error(t("hub.messages.enterOrderId"))
      return
    }

    try {
      const json = await bulkGenerateMutation.mutateAsync({
        order_ids: orderIds,
        document_type: values.document_type as DocumentType,
      })
      toast.success(
        t("hub.messages.bulkSuccess", {
          generated: json.generated ?? json.generated_count ?? 0,
          skipped: json.skipped ?? 0,
          failed: json.failed ?? json.failed_count ?? 0,
        })
      )
      handleSuccess()
    } catch (err: any) {
      toast.error(err?.message || t("hub.messages.bulkError"))
    }
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto p-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("hub.bulkSubtitle")}
          </Text>

          <Form.Field
            control={form.control}
            name="order_ids_input"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("hub.colOrder")}</Form.Label>
                <Form.Control>
                  <Input
                    size="small"
                    placeholder={t("hub.bulkPlaceholder")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="document_type"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("hub.colType")}</Form.Label>
                <Form.Control>
                  <Select
                    size="small"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder={t("hub.typePlaceholder")} />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="invoice">
                        {t("types.invoice")}
                      </Select.Item>
                      <Select.Item value="packing_slip">
                        {t("types.packing_slip")}
                      </Select.Item>
                      <Select.Item value="credit_note">
                        {t("types.credit_note")}
                      </Select.Item>
                      <Select.Item value="receipt">
                        {t("types.receipt")}
                      </Select.Item>
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>

        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("settings.backToHub")}
              </Button>
            </RouteDrawer.Close>
            <Button
              size="small"
              type="submit"
              isLoading={bulkGenerateMutation.isPending}
            >
              {t("hub.bulkRunButton")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

const DocumentsBulkGenerateDrawer: React.FC = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("hub.bulkTitle")}</Heading>
      </RouteDrawer.Header>
      <BulkGenerateContent />
    </RouteDrawer>
  )
}

export default DocumentsBulkGenerateDrawer

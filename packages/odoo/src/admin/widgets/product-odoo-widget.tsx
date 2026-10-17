import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useOdooMappings, useTriggerOdooSync } from "../../hooks"

interface ProductWidgetProps {
  data?: {
    id?: string
    title?: string
    metadata?: Record<string, unknown> | null
  }
}

const ProductOdooWidget = ({ data }: ProductWidgetProps) => {
  const { t, i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const productId = data?.id ?? ""
  const mappingsQuery = useOdooMappings(
    productId ? { entity_type: "product", medusa_id: productId } : undefined,
    { enabled: Boolean(productId) }
  )
  const triggerSyncMutation = useTriggerOdooSync()

  const mapping = mappingsQuery.data?.mappings?.[0]
  const odooTemplateId =
    data?.metadata?.odoo_id ??
    data?.metadata?.odoo_export_id ??
    mapping?.odoo_id ??
    null

  const handleSyncProduct = async () => {
    try {
      const res = await triggerSyncMutation.mutateAsync({
        entity: "products",
        direction: "bidirectional",
      })
      if ("message" in res) {
        toast.success(res.message)
      }
      void mappingsQuery.refetch()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.syncProductError")
      )
    }
  }

  return (
    <Container className="divide-y p-0" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">{t("widget.productTitle")}</Heading>
          <StatusBadge color={odooTemplateId ? "green" : "grey"}>
            {odooTemplateId
              ? t("widget.productLinkedBadge", {
                  templateId: String(odooTemplateId),
                })
              : t("widget.productUnlinkedBadge")}
          </StatusBadge>
        </div>
        <Button
          size="small"
          variant="secondary"
          isLoading={triggerSyncMutation.isPending}
          onClick={() => void handleSyncProduct()}
        >
          {t("widget.syncProductButton")}
        </Button>
      </div>

      <SectionRow
        title={t("widget.productTitle")}
        value={
          odooTemplateId ? (
            <Badge size="2xsmall" color="green">
              {t("widget.productLinkedBadge", {
                templateId: String(odooTemplateId),
              })}
            </Badge>
          ) : (
            "—"
          )
        }
      />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductOdooWidget

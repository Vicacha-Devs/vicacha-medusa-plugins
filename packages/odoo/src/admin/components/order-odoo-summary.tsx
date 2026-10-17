import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Toaster,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface OrderOdooSummaryProps {
  odooOrderId: unknown
  odooInvoiceId: unknown
  isSyncing: boolean
  feedback?: string | null
  onSyncOrder: () => void
}

export const OrderOdooSummary = ({
  odooOrderId,
  odooInvoiceId,
  isSyncing,
  onSyncOrder,
}: OrderOdooSummaryProps) => {
  const { t, i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <>
      <Toaster />
      <Container className="divide-y p-0" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-2">
            <Heading level="h2">{t("widget.orderTitle")}</Heading>
            <StatusBadge color={odooOrderId ? "green" : "orange"}>
              {odooOrderId
                ? t("widget.orderSyncedBadge", {
                    orderId: String(odooOrderId),
                  })
                : t("widget.orderNotSyncedBadge")}
            </StatusBadge>
          </div>
          <Button
            size="small"
            variant="secondary"
            isLoading={isSyncing}
            onClick={onSyncOrder}
          >
            {odooOrderId
              ? t("widget.reverifyOrderButton")
              : t("widget.syncOrderButton")}
          </Button>
        </div>

        <SectionRow
          title={t("widget.orderTitle")}
          value={
            odooOrderId ? (
              <Badge size="2xsmall" color="green">
                {t("widget.orderSyncedBadge", {
                  orderId: String(odooOrderId),
                })}
              </Badge>
            ) : (
              "—"
            )
          }
        />

        {Boolean(odooInvoiceId) && (
          <SectionRow
            title="Odoo Invoice"
            value={
              <Badge size="2xsmall" color="blue">
                {t("widget.invoiceBadge", {
                  invoiceId: String(odooInvoiceId),
                })}
              </Badge>
            }
          />
        )}
      </Container>
    </>
  )
}

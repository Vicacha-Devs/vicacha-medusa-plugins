import { SectionRow } from "@medusajs/dashboard/components"
import { formatCurrency } from "@medusajs/dashboard/lib"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Badge, Container, Heading } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { QueryQuote } from "../../../../../../types"

const ORDER_STATUS_COLOR: Record<string, "green" | "orange" | "red" | "blue" | "grey" | "purple"> = {
  completed: "green",
  pending: "orange",
  requires_action: "orange",
  draft: "grey",
  archived: "grey",
  cancelled: "red",
}

interface QuoteOrderSectionProps {
  quote: QueryQuote
}

export const QuoteOrderSection = ({ quote }: QuoteOrderSectionProps) => {
  const { t } = useTranslation()
  const q = quote as any
  const draftOrder = q.draft_order
  const draftOrderId = q.draft_order_id

  const OrderStatusBadge = ({ status }: { status?: string }) => {
    if (!status) return <span className="txt-compact-small text-ui-fg-subtle">—</span>
    const color = ORDER_STATUS_COLOR[status] ?? "grey"
    return (
      <Badge size="2xsmall" color={color}>
        {t(`quotes.orderStatus.${status}`, { defaultValue: status.replace(/_/g, " ") })}
      </Badge>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("quotes.detail.draftOrder")}</Heading>
        {(draftOrder || draftOrderId) && (
          <Link
            to={`/orders/${draftOrder?.id ?? draftOrderId}`}
            className="flex shrink-0 items-center text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
            tabIndex={-1}
          >
            <ArrowUpRightOnBox className="h-5 w-5" />
          </Link>
        )}
      </div>
      {draftOrder ? (
        <>
          <SectionRow
            title={t("quotes.detail.order")}
            value={
              <Link
                to={`/orders/${draftOrder.id}`}
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
              >
                #{draftOrder.display_id}
              </Link>
            }
          />
          <SectionRow title={t("fields.status")} value={<OrderStatusBadge status={draftOrder.status} />} />
          <SectionRow
            title={t("fields.total")}
            value={
              draftOrder.total != null && draftOrder.currency_code
                ? formatCurrency(
                  draftOrder.total / 100,
                  draftOrder.currency_code)
                : "—"
            }
          />
          <SectionRow
            title={t("fields.createdAt")}
            value={draftOrder.created_at ? new Date(draftOrder.created_at).toLocaleDateString() : "—"}
          />
        </>
      ) : draftOrderId ? (
        <SectionRow
          title={t("fields.id")}
          value={
            <Link
              to={`/orders/${draftOrderId}`}
              className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
            >
              {draftOrderId}
            </Link>
          }
        />
      ) : (
        <div className="px-6 py-4 txt-compact-small text-ui-fg-subtle">{t("quotes.detail.noDraftOrder")}</div>
      )}
    </Container>
  )
}

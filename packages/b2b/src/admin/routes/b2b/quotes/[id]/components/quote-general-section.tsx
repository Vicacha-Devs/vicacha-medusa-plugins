import { Container, Heading } from "@medusajs/ui"
import { SectionRow } from "@vicacha-devs/medusa-shared-admin/admin"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { QueryQuote } from "../../../../../../types"
import { QuoteActionsMenu, QuoteStatusBadge } from "../../components"

interface QuoteGeneralSectionProps {
  quote: QueryQuote
}

export const QuoteGeneralSection = ({ quote }: QuoteGeneralSectionProps) => {
  const { t } = useTranslation()
  const q = quote as any

  const orderLinkId = q.draft_order?.id ?? q.draft_order_id
  const displayId = q.draft_order?.display_id

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Heading>{displayId != null ? `#${displayId}` : quote.id}</Heading>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <QuoteActionsMenu quote={quote} />
      </div>
      <SectionRow
        title={t("quotes.detail.orderChange")}
        value={
          q.order_change_id ? (
            orderLinkId ? (
              <Link
                to={`/orders/${orderLinkId}`}
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
              >
                {String(q.order_change_id)}
              </Link>
            ) : (
              String(q.order_change_id)
            )
          ) : (
            "—"
          )
        }
      />
      <SectionRow
        title={t("quotes.detail.cart")}
        value={q.cart_id ? String(q.cart_id) : "—"}
      />
      <SectionRow
        title={t("quotes.table.messages")}
        value={String(Array.isArray(q.messages) ? q.messages.length : 0)}
      />
      <SectionRow
        title={t("fields.createdAt")}
        value={q.created_at ? new Date(q.created_at).toLocaleDateString() : "—"}
      />
      <SectionRow
        title={t("fields.updatedAt")}
        value={q.updated_at ? new Date(q.updated_at).toLocaleDateString() : "—"}
      />
    </Container>
  )
}

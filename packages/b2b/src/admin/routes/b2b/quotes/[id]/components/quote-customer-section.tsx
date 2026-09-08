import { Container, Heading } from "@medusajs/ui"
import { SectionRow } from "@vicacha-devs/medusa-shared-admin/admin"
import { Link } from "react-router-dom"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { useTranslation } from "react-i18next"

import { QueryQuote } from "../../../../../../types"

interface QuoteCustomerSectionProps {
  quote: QueryQuote
}

export const QuoteCustomerSection = ({ quote }: QuoteCustomerSectionProps) => {
  const { t } = useTranslation()
  const q = quote as any
  const customer = q.customer

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("quotes.detail.customer")}</Heading>
        {customer && (
          <Link
            to={`/customers/${customer.id}`}
            className="flex shrink-0 items-center text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
            tabIndex={-1}
          >
            <ArrowUpRightOnBox className="h-5 w-5" />
          </Link>
        )}
      </div>
      {customer ? (
        <>
          <SectionRow
            title={t("fields.name")}
            value={
              <Link
                to={`/customers/${customer.id}`}
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
              >
                {[customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
                  customer.email ||
                  customer.id}
              </Link>
            }
          />
          <SectionRow title={t("fields.email")} value={customer.email || "—"} />
          {customer.phone && (
            <SectionRow title={t("fields.phone")} value={customer.phone} />
          )}
          {(q.customer?.employee?.spending_limit != null) && (
            <SectionRow
              title={t("fields.spendingLimit")}
              value={
                q.customer.employee.spending_limit === 0
                  ? t("quotes.detail.unlimited")
                  : new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: q.customer.employee.company?.currency_code ?? "USD",
                    }).format(q.customer.employee.spending_limit / 100)
              }
            />
          )}
        </>
      ) : (
        <div className="px-6 py-4 txt-compact-small text-ui-fg-subtle">{t("quotes.detail.noCustomer")}</div>
      )}
    </Container>
  )
}

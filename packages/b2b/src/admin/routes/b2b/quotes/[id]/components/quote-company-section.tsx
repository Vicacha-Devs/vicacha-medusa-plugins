import { Container, Heading } from "@medusajs/ui"
import { SectionRow } from "@vicacha-devs/medusa-shared-admin/admin"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { QueryQuote } from "../../../../../../types"

interface QuoteCompanySectionProps {
  quote: QueryQuote
}

export const QuoteCompanySection = ({ quote }: QuoteCompanySectionProps) => {
  const { t } = useTranslation()
  const q = quote as any
  const company = q.customer?.employee?.company

  if (!company) return null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("quotes.detail.company")}</Heading>
        <Link
          to={`/b2b/companies/${company.id}`}
          className="flex shrink-0 items-center text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
          tabIndex={-1}
        >
          <ArrowUpRightOnBox className="h-5 w-5" />
        </Link>
      </div>
      <SectionRow
        title={t("fields.name")}
        value={
          <Link
            to={`/b2b/companies/${company.id}`}
            className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
          >
            {company.name}
          </Link>
        }
      />
      {company.currency_code && (
        <SectionRow title={t("fields.currency")} value={company.currency_code.toUpperCase()} />
      )}
    </Container>
  )
}

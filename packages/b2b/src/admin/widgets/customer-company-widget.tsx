import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Container, Heading } from "@medusajs/ui"
import { SectionRow, Thumbnail } from "@vicacha-devs/medusa-shared-admin/admin"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useCustomerEmployee } from "../hooks/api"

const CustomerCompanyWidget = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const { employee, isPending } = useCustomerEmployee(id!)

  if (isPending || !employee?.company) {
    return null
  }

  const { company } = employee

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("fields.company")}</Heading>
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
          <div className="flex items-center gap-3">
            <Thumbnail src={company.logo_url} />
            <Link
              to={`/b2b/companies/${company.id}`}
              className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
              >
              {company.name}
            </Link>
          </div>
        }
      />
      {company.currency_code && (
        <SectionRow
          title={t("fields.currency")}
          value={company.currency_code.toUpperCase()}
        />
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side",
})

export default CustomerCompanyWidget

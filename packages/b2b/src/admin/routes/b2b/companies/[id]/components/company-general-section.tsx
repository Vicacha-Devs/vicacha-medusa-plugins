import { Badge, Container, Heading } from "@medusajs/ui"
import { SectionRow, Thumbnail } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"
import { QueryCompany } from "../../../../../../types"
import { CompanyActionsMenu } from "../../components/company-actions-menu"

interface CompanyGeneralSectionProps {
  company: QueryCompany
}

export const CompanyGeneralSection = ({ company }: CompanyGeneralSectionProps) => {
  const { t } = useTranslation()
  const c = company as any

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Thumbnail src={c.logo_url} />
          <Heading>{c.name}</Heading>
        </div>
        <CompanyActionsMenu company={company} />
      </div>
      <SectionRow title={t("companies.detail.email")} value={c.email || "—"} />
      <SectionRow title={t("companies.detail.phone")} value={c.phone || "—"} />
      <SectionRow title={t("companies.detail.address")} value={c.address || "—"} />
      <SectionRow title={t("companies.detail.city")} value={c.city || "—"} />
      <SectionRow title={t("companies.detail.state")} value={c.state || "—"} />
      {c.currency_code && (
        <SectionRow
          title={t("companies.detail.currency")}
          value={
            <Badge size="xsmall" color="grey">
              {c.currency_code.toUpperCase()}
            </Badge>
          }
        />
      )}
      {c.spending_limit_reset_frequency && (
        <SectionRow
          title={t("companies.detail.spendingLimitResetFrequency")}
          value={c.spending_limit_reset_frequency}
        />
      )}
      {c.spending_limit_reset_at && (
        <SectionRow
          title={t("companies.detail.spendingLimitResetAt")}
          value={new Date(c.spending_limit_reset_at).toLocaleDateString()}
        />
      )}
    </Container>
  )
}

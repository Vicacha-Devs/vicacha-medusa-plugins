import { LockClosedSolid } from "@medusajs/icons"
import { Badge, Container, Heading } from "@medusajs/ui"
import { ActionMenu, SectionRow } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"

import { QueryCompany } from "../../../../../../types"

interface Props {
  company: QueryCompany
}

const BoolBadge = ({ value, t }: { value: boolean; t: (k: string) => string }) =>
  value ? (
    <Badge size="xsmall" color="green">{t("general.yes")}</Badge>
  ) : (
    <Badge size="xsmall" color="grey">{t("general.no")}</Badge>
  )

export const CompanyApprovalSettingsSection = ({ company }: Props) => {
  const { t } = useTranslation()
  const c = company as any
  const settings = c.approval_settings

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("companies.detail.approvalSettings")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("companies.actions.approvalSettings"),
                  to: `/b2b/companies/${company.id}/approval-settings`,
                  icon: <LockClosedSolid />,
                },
              ],
            },
          ]}
        />
      </div>
      <SectionRow
        title={t("companies.approvalSettings.requiresAdmin")}
        value={<BoolBadge value={!!settings?.requires_admin_approval} t={t} />}
      />
      <SectionRow
        title={t("companies.approvalSettings.requiresSalesManager")}
        value={<BoolBadge value={!!settings?.requires_sales_manager_approval} t={t} />}
      />
    </Container>
  )
}

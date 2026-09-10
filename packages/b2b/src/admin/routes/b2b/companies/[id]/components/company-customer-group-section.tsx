import { Link as LinkIcon } from "@medusajs/icons"
import { Container, Heading } from "@medusajs/ui"
import { ActionMenu, SectionRow } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { QueryCompany } from "../../../../../../types"

interface Props {
  company: QueryCompany
}

export const CompanyCustomerGroupSection = ({ company }: Props) => {
  const { t } = useTranslation()
  const c = company as any
  const group = Array.isArray(c.customer_group) ? c.customer_group[0] : c.customer_group

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("companies.detail.customerGroup")}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("companies.actions.manageCustomerGroup"),
                  to: `/b2b/companies/${company.id}/customer-group`,
                  icon: <LinkIcon />,
                },
              ],
            },
          ]}
        />
      </div>
      <SectionRow
        title={t("companies.detail.customerGroup")}
        value={
          group?.id ? (
            <Link
              to={`/customer-groups/${group.id}`}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
            >
              {group.name || group.id}
            </Link>
          ) : (
            "—"
          )
        }
      />
    </Container>
  )
}

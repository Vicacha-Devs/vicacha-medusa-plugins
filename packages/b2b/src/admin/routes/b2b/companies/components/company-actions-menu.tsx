import { Link, LockClosedSolid, PencilSquare, Trash } from "@medusajs/icons"
import { ActionMenu } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"

import { QueryCompany } from "../../../../../types"
import { useDeleteCompanyListAction } from "./use-delete-company-list-action"

export const CompanyActionsMenu = ({ company }: { company: QueryCompany }) => {
  const { t } = useTranslation()
  const handleDelete = useDeleteCompanyListAction({ company })

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              label: t("companies.actions.editDetails"),
              to: `/b2b/companies/${company.id}/edit`,
              icon: <PencilSquare />,
            },
            {
              label: t("companies.actions.manageCustomerGroup"),
              to: `/b2b/companies/${company.id}/customer-group`,
              icon: <Link />,
            },
            {
              label: t("companies.actions.approvalSettings"),
              to: `/b2b/companies/${company.id}/approval-settings`,
              icon: <LockClosedSolid />,
            },
          ],
        },
        {
          actions: [
            {
              label: t("companies.actions.delete"),
              onClick: handleDelete,
              icon: <Trash />,
            },
          ],
        },
      ]}
    />
  )
}

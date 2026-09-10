import { LayoutComposer } from "@medusajs/dashboard/components"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { detailPageDefaultEntries, TwoColumnPageSkeleton } from "@vicacha-devs/medusa-shared-admin/admin"
import { Outlet, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useCompany } from "../../../../hooks/api"
import { CompanyGeneralSection } from "./components/company-general-section"
import { CompanyEmployeesSection } from "./components/company-employees-section"
import { CompanyApprovalSettingsSection } from "./components/company-approval-settings-section"
import { CompanyCustomerGroupSection } from "./components/company-customer-group-section"

const CompanyDetail = () => {
  const { id } = useParams()
  const { data, isLoading, isError, error } = useCompany(id!)
  const company = data?.company

  if (isLoading || !company) {
    return <TwoColumnPageSkeleton mainSections={2} sidebarSections={2} showJSON showMetadata />
  }

  if (isError) {
    throw error
  }

  return (
    <LayoutComposer
      widgetsZonePrefix="b2b.company.details"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      data={company as any}
      sections={{
        main: (
          <>
            <LayoutComposer.Entry id="CompanyGeneralSection">
              <CompanyGeneralSection company={company} />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="CompanyEmployeesSection">
              <CompanyEmployeesSection companyId={company.id} />
            </LayoutComposer.Entry>
            {detailPageDefaultEntries(company as any)}
          </>
        ),
        side: (
          <>
            <LayoutComposer.Entry id="CompanyCustomerGroupSection">
              <CompanyCustomerGroupSection company={company} />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="CompanyApprovalSettingsSection">
              <CompanyApprovalSettingsSection company={company} />
            </LayoutComposer.Entry>
          </>
        ),
      }}
    />
  )
}

const Breadcrumb = ({ id }: { id?: string }) => {
  const { t } = useTranslation()
  const { data } = useCompany(id ?? "", undefined, { enabled: !!id })
  return data?.company?.name ?? id ?? t("companies.label")
}

export const handle = {
  breadcrumb: (match: any) => <Breadcrumb id={match?.params?.id} />,
}

export default CompanyDetail

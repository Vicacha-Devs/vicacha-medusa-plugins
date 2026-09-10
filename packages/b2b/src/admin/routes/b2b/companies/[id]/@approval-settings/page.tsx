import { Button, toast } from "@medusajs/ui"
import { CoolSwitch, RouteDrawer, useRouteModal } from "@vicacha-devs/medusa-shared-admin/admin"
import { useState } from "react"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useCompany, useUpdateApprovalSettings } from "../../../../../hooks/api"

const ApprovalSettingsContent = ({ id }: { id: string }) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const { data, isLoading } = useCompany(id)
  const company = data?.company as any
  const approvalSettings = company?.approval_settings

  const [requiresAdminApproval, setRequiresAdminApproval] = useState<boolean | null>(null)
  const [requiresSalesManagerApproval, setRequiresSalesManagerApproval] = useState<boolean | null>(null)

  const { mutateAsync, isPending } = useUpdateApprovalSettings(id)

  if (isLoading || !company) return null

  const adminValue = requiresAdminApproval ?? (approvalSettings?.requires_admin_approval || false)
  const salesValue = requiresSalesManagerApproval ?? (approvalSettings?.requires_sales_manager_approval || false)

  const handleSubmit = async () => {
    try {
      await mutateAsync({
        id: approvalSettings?.id,
        requires_admin_approval: adminValue,
        requires_sales_manager_approval: salesValue,
      })
      toast.success(t("companies.toasts.approvalSettingsUpdated"))
      handleSuccess()
    } catch {
      toast.error(t("companies.toasts.approvalSettingsError"))
    }
  }

  return (
    <>
      <RouteDrawer.Body className="flex flex-col gap-2">
        <CoolSwitch
          checked={adminValue}
          onChange={() => setRequiresAdminApproval(!adminValue)}
          fieldName="requires_admin_approval"
          label={t("companies.approvalSettings.requiresAdmin")}
          description={t("companies.approvalSettings.requiresAdminDescription")}
        />
        <CoolSwitch
          checked={salesValue}
          onChange={() => setRequiresSalesManagerApproval(!salesValue)}
          fieldName="requires_sales_manager_approval"
          label={t("companies.approvalSettings.requiresSalesManager")}
          description={t("companies.approvalSettings.requiresSalesManagerDescription")}
        />
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <Button variant="secondary" onClick={() => handleSuccess()}>
          {t("actions.cancel")}
        </Button>
        <Button onClick={handleSubmit} isLoading={isPending}>
          {t("actions.save")}
        </Button>
      </RouteDrawer.Footer>
    </>
  )
}

const CompanyApprovalSettings = () => {
  const { t } = useTranslation()
  const { id } = useParams()

  if (!id) return null

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title>
          {t("companies.approvalSettings.title")}
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      <ApprovalSettingsContent id={id} />
    </RouteDrawer>
  )
}

export default CompanyApprovalSettings

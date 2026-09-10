import { Heading, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { RouteDrawer, useRouteModal } from "@vicacha-devs/medusa-shared-admin/admin"

import { useCompany, useUpdateCompany } from "../../../../../hooks/api"
import { AdminUpdateCompany } from "../../../../../../types"
import { CompanyForm } from "../../components/company-form"

const EditContent = ({ id }: { id: string }) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { data, isLoading } = useCompany(id)
  const { mutateAsync, isPending } = useUpdateCompany(id)

  const handleSubmit = async (formData: AdminUpdateCompany) => {
    const payload: AdminUpdateCompany = {
      ...formData,
      phone: (formData.phone as any) || null,
      address: (formData.address as any) || null,
      city: (formData.city as any) || null,
      state: (formData.state as any) || null,
      zip: (formData.zip as any) || null,
      country: (formData.country as any) || null,
      logo_url: (formData.logo_url as any) || null,
      spending_limit_reset_at: (formData as any).spending_limit_reset_at
        ? new Date((formData as any).spending_limit_reset_at).toISOString()
        : null,
    }
    try {
      await mutateAsync(payload, {
        onSuccess: (result) => {
          const name = (result as any).company?.name ?? ""
          toast.success(t("companies.toasts.updated", { name }))
          handleSuccess()
        },
        onError: (err) => toast.error(err.message),
      })
    } catch {}
  }

  const company = data?.company
  if (isLoading || !company) return null

  return (
    <CompanyForm
      mode="update"
      company={{
        name: company.name,
        email: company.email,
        currency_code: company.currency_code,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        zip: company.zip,
        country: company.country,
        logo_url: company.logo_url,
        spending_limit_reset_frequency: (company as any).spending_limit_reset_frequency ?? null,
        spending_limit_reset_at: (company as any).spending_limit_reset_at ?? null,
      }}
      onSubmit={handleSubmit}
      loading={isPending}
    />
  )
}

const CompanyEdit = () => {
  const { t } = useTranslation()
  const { id } = useParams()

  if (!id) return null

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("companies.form.editTitle")}</Heading>
      </RouteDrawer.Header>
      <EditContent id={id} />
    </RouteDrawer>
  )
}

export default CompanyEdit

import { toast } from "@medusajs/ui"
import { RouteFocusModal, useRouteModal } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"

import { useCreateCompany } from "../../../../hooks/api"
import { CompanyCreateForm, CompanyCreateFormValues } from "../components/company-create-form"
import { ESpendingLimitResetFrequency } from "../../../../../types"

const CreateContent = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { mutateAsync: createCompany, isPending } = useCreateCompany()

  const handleSubmit = async (values: CompanyCreateFormValues) => {
    const {
      spending_limit_reset_frequency,
      customer_group_id,
      requires_admin_approval,
      requires_sales_manager_approval,
      ...details
    } = values

    try {
      await createCompany({
        ...details,
        phone: details.phone || undefined,
        address: details.address || undefined,
        city: details.city || undefined,
        state: details.state || undefined,
        zip: details.zip || undefined,
        country: details.country || undefined,
        logo_url: details.logo_url || undefined,
        currency_code: details.currency_code || undefined,
        spending_limit_reset_frequency:
          spending_limit_reset_frequency &&
          spending_limit_reset_frequency !== ESpendingLimitResetFrequency.NEVER
            ? spending_limit_reset_frequency
            : undefined,
        group_id: customer_group_id || undefined,
        requires_admin_approval,
        requires_sales_manager_approval,
      } as any)

      toast.success(t("companies.toasts.created", { name: details.name }))
      handleSuccess()
    } catch (err: any) {
      toast.error(err?.message ?? t("general.error"))
    }
  }

  return <CompanyCreateForm onSubmit={handleSubmit} loading={isPending} />
}

const CompanyCreate = () => (
  <RouteFocusModal>
    <CreateContent />
  </RouteFocusModal>
)

export default CompanyCreate

import { Heading, toast } from "@medusajs/ui"
import { RouteDrawer, useCreateCustomer, useRouteModal } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { useCompany, useCreateEmployee } from "../../../../../../hooks/api"
import { EmployeesCreateForm } from "../components/employees-create-form"

const CreateContent = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const { handleSuccess } = useRouteModal()

  const { data, isLoading } = useCompany(id!)
  const company = data?.company

  const { mutateAsync: createCustomer, isPending: creatingCustomer, error: customerError } =
    useCreateCustomer()
  const { mutateAsync: createEmployee, isPending: creatingEmployee, error: employeeError } =
    useCreateEmployee(id!)

  if (isLoading || !company) return null

  const handleSubmit = async (formData: any) => {
    try {
      const { customer } = await createCustomer({
        email: formData.email,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        phone: formData.phone || undefined,
        company_name: company.name,
      })

      if (!customer?.id) {
        toast.error(t("employees.toasts.createCustomerError"))
        return
      }

      await createEmployee({
        spending_limit: formData.spending_limit,
        is_admin: formData.is_admin,
        customer_id: customer.id,
      })

      toast.success(
        t("employees.toasts.created", {
          firstName: customer.first_name,
          lastName: customer.last_name,
        })
      )
      handleSuccess()
    } catch {}
  }

  return (
    <EmployeesCreateForm
      handleSubmit={handleSubmit}
      loading={creatingCustomer || creatingEmployee}
      error={customerError || employeeError}
      company={company as any}
    />
  )
}

const EmployeeCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("employees.drawers.addTitle")}</Heading>
      </RouteDrawer.Header>
      <CreateContent />
    </RouteDrawer>
  )
}

export default EmployeeCreate

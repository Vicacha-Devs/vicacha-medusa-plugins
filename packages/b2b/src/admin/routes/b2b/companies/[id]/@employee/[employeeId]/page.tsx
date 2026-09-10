import { Heading, toast } from "@medusajs/ui"
import { RouteDrawer, useRouteModal } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { AdminUpdateEmployee } from "../../../../../../../types"
import { useCompany, useEmployee, useUpdateEmployee } from "../../../../../../hooks/api"
import { EmployeesUpdateForm } from "../components/employees-update-form"

const UpdateContent = () => {
  const { t } = useTranslation()
  const { id, employeeId } = useParams()
  const { handleSuccess } = useRouteModal()

  const { data: companyData, isLoading: companyLoading } = useCompany(id!)
  const { data: employeeData, isLoading: employeeLoading } = useEmployee(id!, employeeId!)
  const { mutateAsync, isPending, error } = useUpdateEmployee(id!, employeeId!)

  if (companyLoading || employeeLoading) return null

  const company = companyData?.company
  const employee = employeeData?.employee

  if (!company || !employee) return null

  const handleSubmit = async (formData: AdminUpdateEmployee) => {
    try {
      await mutateAsync({ ...formData, id: employeeId }, {
        onSuccess: () => {
          toast.success(
            t("employees.toasts.updated", { email: employee?.customer?.email })
          )
          handleSuccess()
        },
        onError: (err) => toast.error(err.message),
      })
    } catch {}
  }

  return (
    <EmployeesUpdateForm
      handleSubmit={handleSubmit}
      loading={isPending}
      error={error}
      employee={employee as any}
      company={company as any}
    />
  )
}

const EmployeeUpdate = () => {
  const { t } = useTranslation()
  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("employees.drawers.editTitle")}</Heading>
      </RouteDrawer.Header>
      <UpdateContent />
    </RouteDrawer>
  )
}

export default EmployeeUpdate

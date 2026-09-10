import { PencilSquare, Trash } from "@medusajs/icons"
import { toast, usePrompt } from "@medusajs/ui"
import { ActionMenu } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"

import { QueryEmployee } from "../../../../../../../types"
import { useDeleteEmployee } from "../../../../../../hooks/api"

export const EmployeesActionsMenu = ({ employee }: { employee: QueryEmployee }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const { mutateAsync: deleteEmployee, isPending: isDeleting } = useDeleteEmployee(employee.company_id)

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("employees.prompts.delete.title"),
      description: t("employees.prompts.delete.description"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })
    if (!confirmed) return
    try {
      await deleteEmployee(employee.id, {
        onSuccess: () => toast.success(t("employees.toasts.deleted")),
        onError: (err: any) => toast.error(err.message),
      })
    } catch {}
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              label: t("actions.edit"),
              to: `/b2b/companies/${employee.company_id}/employee/${employee.id}`,
              icon: <PencilSquare />,
            },
          ],
        },
        {
          actions: [
            {
              label: t("actions.delete"),
              onClick: handleDelete,
              disabled: isDeleting,
              icon: <Trash />,
            },
          ],
        },
      ]}
    />
  )
}

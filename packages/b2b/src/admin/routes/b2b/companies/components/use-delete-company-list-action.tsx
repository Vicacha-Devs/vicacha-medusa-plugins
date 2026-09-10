import { toast, usePrompt } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { QueryCompany } from "../../../../../types"
import { useDeleteCompany } from "../../../../hooks/api"

export const useDeleteCompanyListAction = ({ company }: { company: QueryCompany }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()
  const { mutateAsync } = useDeleteCompany(company.id)

  return async () => {
    const confirmed = await prompt({
      title: t("deletePrompt.title"),
      description: t("deletePrompt.description"),
      confirmText: t("deletePrompt.delete"),
      cancelText: t("deletePrompt.cancel"),
    })
    if (!confirmed) return

    try {
      await mutateAsync(undefined, {
        onSuccess: () => {
          toast.success(t("companies.toasts.deleted", { name: company.name }))
          navigate("/b2b/companies")
        },
        onError: (e) => toast.error(e.message),
      })
    } catch {}
  }
}

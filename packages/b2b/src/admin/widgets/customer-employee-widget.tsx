import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Heading } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { SectionRow } from "@vicacha-devs/medusa-shared-admin/admin"

import { useCustomerEmployee } from "../hooks/api"

const CustomerEmployeeWidget = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const { employee, isPending } = useCustomerEmployee(id!)

  if (isPending || !employee) {
    return null
  }

  const currencyCode = employee.company?.currency_code ?? "USD"

  const spendingLimitValue =
    employee.spending_limit === 0 || employee.spending_limit == null
      ? t("quotes.detail.unlimited")
      : new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currencyCode,
        }).format(employee.spending_limit / 100)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("employees.label")}</Heading>
        {employee.is_admin && (
          <Badge size="2xsmall" rounded="full" color="purple">
            {t("employees.admin")}
          </Badge>
        )}
      </div>
      <SectionRow
        title={t("fields.spendingLimit")}
        value={spendingLimitValue}
      />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side.before",
})

export default CustomerEmployeeWidget

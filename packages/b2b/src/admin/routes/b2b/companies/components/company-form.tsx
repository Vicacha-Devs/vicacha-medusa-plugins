import { zodResolver } from "@hookform/resolvers/zod"
import { KeyboundForm, RouteDrawer } from "@medusajs/dashboard/components"
import { useRegions } from "@medusajs/dashboard/hooks"
import { currencies } from "@medusajs/dashboard/lib"
import { Button, Tabs } from "@medusajs/ui"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { AdminCreateCompany, AdminUpdateCompany } from "../../../../../types"
import { ESpendingLimitResetFrequency } from "../../../../../types/enums"
import { CompanyFormAdminTab } from "./company-form-admin-tab"
import { CompanyFormDetailsTab } from "./company-form-details-tab"
import { CompanyFormValues, makeCompanyFormSchema } from "./validators"

const ALL_CURRENCIES = Object.values(currencies).sort((a, b) =>
  a.name.localeCompare(b.name)
)

interface CreateFormProps {
  mode: "create"
  company?: undefined
  onSubmit: (data: AdminCreateCompany) => Promise<void>
  loading: boolean
}

interface UpdateFormProps {
  mode: "update"
  company: {
    name: string
    email: string
    currency_code: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    country: string | null
    logo_url: string | null
    spending_limit_reset_frequency: ESpendingLimitResetFrequency | null
    spending_limit_reset_at: string | Date | null
  }
  onSubmit: (data: AdminUpdateCompany) => Promise<void>
  loading: boolean
}

type CompanyFormProps = CreateFormProps | UpdateFormProps

export function CompanyForm({ company, onSubmit, loading }: CompanyFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => makeCompanyFormSchema(t), [t])

  const { regions, isPending: regionsLoading } = useRegions({})

  const currencyCodes = useMemo(
    () => new Set(regions?.map((r) => r.currency_code.toUpperCase()) ?? []),
    [regions]
  )
  const availableCurrencies = useMemo(
    () => ALL_CURRENCIES.filter((c) => !currencyCodes.size || currencyCodes.has(c.code)),
    [currencyCodes]
  )

  const availableCountries = useMemo(() => {
    const seen = new Set<string>()
    return (regions?.flatMap((r) => (r as any).countries ?? []) ?? [])
      .filter((c: any) => {
        if (seen.has(c.iso_2)) return false
        seen.add(c.iso_2)
        return true
      })
      .sort((a: any, b: any) => a.display_name.localeCompare(b.display_name))
  }, [regions])

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? "",
      email: company?.email ?? "",
      currency_code: company?.currency_code ?? "",
      phone: company?.phone ?? "",
      address: company?.address ?? "",
      city: company?.city ?? "",
      state: company?.state ?? "",
      zip: company?.zip ?? "",
      country: company?.country ?? "",
      logo_url: company?.logo_url ?? "",
      spending_limit_reset_frequency:
        company?.spending_limit_reset_frequency ?? ESpendingLimitResetFrequency.MONTHLY,
      spending_limit_reset_at: company?.spending_limit_reset_at
        ? new Date(company.spending_limit_reset_at as any).toISOString().split("T")[0]
        : "",
    },
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={form.handleSubmit((data) => onSubmit(data as any))}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <Tabs defaultValue="details" className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b px-4 pt-2">
            <Tabs.List>
              <Tabs.Trigger value="details">{t("companies.form.tabs.details")}</Tabs.Trigger>
              <Tabs.Trigger value="admin">{t("companies.form.tabs.admin")}</Tabs.Trigger>
            </Tabs.List>
          </div>

          <RouteDrawer.Body className="flex flex-1 flex-col overflow-auto p-4">
            <Tabs.Content value="details">
              <CompanyFormDetailsTab
                form={form}
                availableCountries={availableCountries}
                regionsLoading={regionsLoading}
              />
            </Tabs.Content>

            <Tabs.Content value="admin">
              <CompanyFormAdminTab
                form={form}
                availableCurrencies={availableCurrencies}
                regionsLoading={regionsLoading}
              />
            </Tabs.Content>
          </RouteDrawer.Body>
        </Tabs>

        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={loading}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

import { zodResolver } from "@hookform/resolvers/zod"
import { KeyboundForm, RouteFocusModal } from "@medusajs/dashboard/components"
import { useRegions } from "@medusajs/dashboard/hooks"
import { currencies } from "@medusajs/dashboard/lib"
import { Button, ProgressStatus, ProgressTabs } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "@vicacha-devs/medusa-shared-admin/admin"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { ESpendingLimitResetFrequency } from "../../../../../types"
import { CompanyCreateAdminTab } from "./company-create-admin-tab"
import { CompanyCreateDetailsTab } from "./company-create-details-tab"
import {
  type CompanyCreateFormValues,
  makeCompanyCreateFormSchema,
} from "./validators"

const ALL_CURRENCIES = Object.values(currencies).sort((a, b) =>
  a.name.localeCompare(b.name)
)

enum Tab {
  DETAILS = "details",
  ADMIN = "admin",
}

type TabState = Record<Tab, ProgressStatus>

interface CompanyCreateFormProps {
  onSubmit: (data: CompanyCreateFormValues) => Promise<void>
  loading: boolean
}

export function CompanyCreateForm({ onSubmit, loading }: CompanyCreateFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => makeCompanyCreateFormSchema(t), [t])

  const [tab, setTab] = useState<Tab>(Tab.DETAILS)
  const [tabState, setTabState] = useState<TabState>({
    [Tab.DETAILS]: "in-progress",
    [Tab.ADMIN]: "not-started",
  })

  const { regions, isPending: regionsLoading } = useRegions({})
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["customer-groups"],
    queryFn: () =>
      sdk.client.fetch<{ customer_groups: { id: string; name: string }[] }>(
        "/admin/customer-groups"
      ),
  })
  const customerGroups = groupsData?.customer_groups ?? []

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

  const form = useForm<CompanyCreateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      currency_code: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      logo_url: "",
      spending_limit_reset_frequency: ESpendingLimitResetFrequency.NEVER,
      customer_group_id: "",
      requires_admin_approval: false,
      requires_sales_manager_approval: false,
    },
  })

  const goToAdmin = async () => {
    const valid = await form.trigger(["name", "email"])
    if (!valid) return
    setTab(Tab.ADMIN)
    setTabState({ [Tab.DETAILS]: "completed", [Tab.ADMIN]: "in-progress" })
  }

  const handleSubmit = form.handleSubmit(onSubmit)

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <ProgressTabs
          value={tab}
          onValueChange={async (value) => {
            if (value === Tab.ADMIN) {
              await goToAdmin()
              return
            }
            setTab(Tab.DETAILS)
            setTabState((s) => ({ ...s, [Tab.DETAILS]: "in-progress" }))
          }}
          className="flex h-full flex-col overflow-hidden"
        >
          <RouteFocusModal.Header>
            <div className="-my-2 w-full border-l">
              <ProgressTabs.List className="flex w-full items-center">
                <ProgressTabs.Trigger
                  status={tabState[Tab.DETAILS]}
                  value={Tab.DETAILS}
                  className="max-w-[200px] truncate"
                >
                  {t("companies.form.tabs.details")}
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  status={tabState[Tab.ADMIN]}
                  value={Tab.ADMIN}
                  className="max-w-[200px] truncate"
                >
                  {t("companies.form.tabs.admin")}
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </div>
          </RouteFocusModal.Header>

          <RouteFocusModal.Body className="size-full overflow-hidden">
            <ProgressTabs.Content className="size-full overflow-y-auto" value={Tab.DETAILS}>
              <CompanyCreateDetailsTab
                form={form}
                availableCountries={availableCountries}
                regionsLoading={regionsLoading}
              />
            </ProgressTabs.Content>

            <ProgressTabs.Content className="size-full overflow-y-auto" value={Tab.ADMIN}>
              <CompanyCreateAdminTab
                form={form}
                availableCurrencies={availableCurrencies}
                customerGroups={customerGroups}
                regionsLoading={regionsLoading}
                groupsLoading={groupsLoading}
              />
            </ProgressTabs.Content>
          </RouteFocusModal.Body>
        </ProgressTabs>

        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            {tab === Tab.DETAILS ? (
              <Button key="next" type="button" size="small" onClick={goToAdmin}>
                {t("actions.continue")}
              </Button>
            ) : (
              <Button key="submit" type="submit" size="small" isLoading={loading}>
                {t("actions.save")}
              </Button>
            )}
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}

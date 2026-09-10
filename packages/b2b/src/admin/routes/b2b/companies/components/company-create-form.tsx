import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Hint, Input, ProgressStatus, ProgressTabs, Select } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import {
  CoolSwitch,
  currencies,
  Form,
  KeyboundForm,
  RouteFocusModal,
  sdk,
  useRegions,
} from "@vicacha-devs/medusa-shared-admin/admin"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ESpendingLimitResetFrequency } from "../../../../../types"


const ALL_CURRENCIES = Object.values(currencies).sort((a, b) =>
  a.name.localeCompare(b.name)
)

const RESET_FREQUENCIES = [
  ESpendingLimitResetFrequency.NEVER,
  ESpendingLimitResetFrequency.DAILY,
  ESpendingLimitResetFrequency.WEEKLY,
  ESpendingLimitResetFrequency.MONTHLY,
  ESpendingLimitResetFrequency.YEARLY,
]

const makeSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("companies.form.name")),
    email: z.email(),
    currency_code: z.string().min(1, t("companies.form.currency")),
    phone: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    zip: z.string().optional().or(z.literal("")),
    country: z.string().optional().or(z.literal("")),
    logo_url: z.string().optional().or(z.literal("")),
    spending_limit_reset_frequency: z
      .enum(ESpendingLimitResetFrequency)
      .optional(),
    customer_group_id: z.string().optional().or(z.literal("")),
    requires_admin_approval: z.boolean(),
    requires_sales_manager_approval: z.boolean(),
  })

export type CompanyCreateFormValues = z.infer<ReturnType<typeof makeSchema>>

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
  const schema = useMemo(() => makeSchema(t), [t])

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
            {/* ── DETAILS ── */}
            <ProgressTabs.Content className="size-full overflow-y-auto" value={Tab.DETAILS}>
              <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-6 p-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Form.Field
                    control={form.control}
                    name="name"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label>{t("companies.form.name")}</Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={form.control}
                    name="email"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label>{t("companies.form.email")}</Form.Label>
                        <Form.Control>
                          <Input type="email" {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Form.Field
                    control={form.control}
                    name="phone"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label optional>{t("companies.form.phone")}</Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={form.control}
                    name="logo_url"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label optional>{t("companies.form.logoUrl")}</Form.Label>
                        <Form.Control>
                          <Input type="url" {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>

                <Form.Field
                  control={form.control}
                  name="address"
                  render={({ field }: any) => (
                    <Form.Item>
                      <Form.Label optional>{t("companies.form.address")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Form.Field
                    control={form.control}
                    name="city"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label optional>{t("companies.form.city")}</Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={form.control}
                    name="state"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label optional>{t("companies.form.state")}</Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={form.control}
                    name="zip"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label optional>{t("companies.form.zip")}</Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>

                <Form.Field
                  control={form.control}
                  name="country"
                  render={({ field }: any) => (
                    <Form.Item>
                      <Form.Label optional>{t("companies.form.country")}</Form.Label>
                      <Form.Control>
                        <Select
                          value={field.value?.toLowerCase() ?? ""}
                          onValueChange={(v) => field.onChange(v)}
                          disabled={regionsLoading}
                        >
                          <Select.Trigger>
                            <Select.Value placeholder={t("companies.form.selectCountry")} />
                          </Select.Trigger>
                          <Select.Content>
                            {availableCountries.map((c: any) => (
                              <Select.Item key={c.iso_2} value={c.iso_2}>
                                {c.display_name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              </div>
            </ProgressTabs.Content>

            {/* ── ADMIN ── */}
            <ProgressTabs.Content className="size-full overflow-y-auto" value={Tab.ADMIN}>
              <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 p-8">
                <Form.Field
                  control={form.control}
                  name="currency_code"
                  render={({ field }: any) => (
                    <Form.Item>
                      <Form.Label>{t("companies.form.currency")}</Form.Label>
                      <Form.Control>
                        <Select
                          value={field.value?.toUpperCase() ?? ""}
                          onValueChange={(v) => field.onChange(v.toLowerCase())}
                          disabled={regionsLoading}
                        >
                          <Select.Trigger>
                            <Select.Value placeholder={t("companies.form.selectCurrency")} />
                          </Select.Trigger>
                          <Select.Content>
                            {availableCurrencies.map((c) => (
                              <Select.Item key={c.code} value={c.code}>
                                {c.code} — {c.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />

                <div className="flex flex-col gap-y-4">
                  <h2 className="h2-core">{t("companies.form.spendingSection")}</h2>
                  <Form.Field
                    control={form.control}
                    name="spending_limit_reset_frequency"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Label optional>
                          {t("companies.form.spendingLimitResetFrequency")}
                        </Form.Label>
                        <Form.Control>
                          <Select
                            value={field.value ?? ESpendingLimitResetFrequency.NEVER}
                            onValueChange={field.onChange}
                          >
                            <Select.Trigger>
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              {RESET_FREQUENCIES.map((freq) => (
                                <Select.Item key={freq} value={freq}>
                                  {t(`companies.form.resetFrequency.${freq}`)}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select>
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-y-4">
                  <h2 className="h2-core">{t("companies.customerGroup.title")}</h2>
                  {groupsLoading ? null : customerGroups.length === 0 ? (
                    <Hint variant="info">{t("companies.customerGroup.noGroups")}</Hint>
                  ) : (
                    <Form.Field
                      control={form.control}
                      name="customer_group_id"
                      render={({ field }: any) => (
                        <Form.Item>
                          <Form.Label optional>{t("companies.customerGroup.header")}</Form.Label>
                          <Form.Control>
                            <Select value={field.value ?? ""} onValueChange={field.onChange}>
                              <Select.Trigger>
                                <Select.Value
                                  placeholder={t("companies.customerGroup.selectPlaceholder")}
                                />
                              </Select.Trigger>
                              <Select.Content>
                                {customerGroups.map((g: any) => (
                                  <Select.Item key={g.id} value={g.id}>
                                    {g.name}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select>
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-y-4">
                  <h2 className="h2-core">{t("companies.approvalSettings.title")}</h2>
                  <Form.Field
                    control={form.control}
                    name="requires_admin_approval"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Control>
                          <CoolSwitch
                            fieldName="requires_admin_approval"
                            label={t("companies.approvalSettings.requiresAdmin")}
                            description={t("companies.approvalSettings.requiresAdminDescription")}
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </Form.Control>
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={form.control}
                    name="requires_sales_manager_approval"
                    render={({ field }: any) => (
                      <Form.Item>
                        <Form.Control>
                          <CoolSwitch
                            fieldName="requires_sales_manager_approval"
                            label={t("companies.approvalSettings.requiresSalesManager")}
                            description={t(
                              "companies.approvalSettings.requiresSalesManagerDescription"
                            )}
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </Form.Control>
                      </Form.Item>
                    )}
                  />
                </div>
              </div>
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

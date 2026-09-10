import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Select, Tabs } from "@medusajs/ui"
import { currencies, Form, KeyboundForm, RouteDrawer, useRegions } from "@vicacha-devs/medusa-shared-admin/admin"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AdminCreateCompany, AdminUpdateCompany } from "../../../../../types"
import { ESpendingLimitResetFrequency } from "../../../../../types/enums"

const ALL_CURRENCIES = Object.values(currencies).sort((a, b) =>
  a.name.localeCompare(b.name)
)

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
    spending_limit_reset_frequency: z.nativeEnum(ESpendingLimitResetFrequency).optional(),
    spending_limit_reset_at: z.string().optional().or(z.literal("")),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

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
  const schema = useMemo(() => makeSchema(t), [t])

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

  const form = useForm<FormValues>({
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
      spending_limit_reset_frequency: company?.spending_limit_reset_frequency ?? ESpendingLimitResetFrequency.MONTHLY,
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
            <Tabs.Content value="details" className="flex flex-col gap-y-4">
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
            </Tabs.Content>

            <Tabs.Content value="admin" className="flex flex-col gap-y-4">
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
              <Form.Field
                control={form.control}
                name="spending_limit_reset_frequency"
                render={({ field }: any) => (
                  <Form.Item>
                    <Form.Label optional>{t("companies.form.spendingLimitResetFrequency")}</Form.Label>
                    <Form.Control>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value placeholder={t("companies.form.selectFrequency")} />
                        </Select.Trigger>
                        <Select.Content>
                          {Object.values(ESpendingLimitResetFrequency).map((freq) => (
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
              <Form.Field
                control={form.control}
                name="spending_limit_reset_at"
                render={({ field }: any) => (
                  <Form.Item>
                    <Form.Label optional>{t("companies.form.spendingLimitResetAt")}</Form.Label>
                    <Form.Control>
                      <Input type="date" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </Tabs.Content>
          </RouteDrawer.Body>
        </Tabs>

        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">{t("actions.cancel")}</Button>
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

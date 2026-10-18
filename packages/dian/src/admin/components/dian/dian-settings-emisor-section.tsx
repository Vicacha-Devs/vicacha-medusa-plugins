import { useEffect, useState } from "react"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { dianClient } from "../../../sdk"

export interface DianSettingsEmisorSectionProps {
  config: Record<string, any> | null
  municipalities: Array<Record<string, any>>
  onSaved: () => void
}

export const DianSettingsEmisorSection: React.FC<
  DianSettingsEmisorSectionProps
> = ({ config, municipalities, onSaved }) => {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState({
    seller_nit: "",
    registration_name: "",
    trade_name: "",
    email: "",
    phone: "",
    address_line: "",
    municipality_code: "11001",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    setForm({
      seller_nit: String(config.seller_nit || ""),
      registration_name: String(config.registration_name || ""),
      trade_name: String(config.trade_name || ""),
      email: String(config.email || ""),
      phone: String(config.phone || ""),
      address_line: String(config.address_line || ""),
      municipality_code: String(config.municipality_code || "11001"),
    })
  }, [config])

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dianClient.updateConfig(form)
      toast.success(t("dian.settings.toastEmisorSaved"))
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || t("dian.settings.toastEmisorError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="px-6 py-4">
        <Heading level="h1">{t("dian.settings.emisorTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("dian.settings.emisorSubtitle")}
        </Text>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3"
      >
        <div>
          <Label>
            {t("dian.settings.nitLabel", { dv: config?.seller_dv || "-" })}
          </Label>
          <Input
            value={form.seller_nit}
            onChange={(e) => updateField("seller_nit", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.settings.registrationNameLabel")}</Label>
          <Input
            value={form.registration_name}
            onChange={(e) => updateField("registration_name", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.settings.tradeNameLabel")}</Label>
          <Input
            value={form.trade_name}
            onChange={(e) => updateField("trade_name", e.target.value)}
          />
        </div>
        <div>
          <Label>{t("dian.settings.municipalityLabel")}</Label>
          <Select
            value={form.municipality_code}
            onValueChange={(v) => updateField("municipality_code", v)}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {municipalities.map((m) => (
                <Select.Item key={m.code} value={m.code}>
                  {m.code} - {m.name} ({m.department_name})
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div>
          <Label>{t("dian.settings.emailLabel")}</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.settings.phoneLabel")}</Label>
          <Input
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label>{t("dian.settings.addressLabel")}</Label>
          <Input
            value={form.address_line}
            onChange={(e) => updateField("address_line", e.target.value)}
          />
        </div>
        <div className="flex items-end justify-end">
          <Button type="submit" isLoading={saving}>
            {t("dian.settings.saveEmisorBtn")}
          </Button>
        </div>
      </form>
    </Container>
  )
}

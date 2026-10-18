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

export interface DianSettingsSoftwareSectionProps {
  config: Record<string, any> | null
  onSaved: () => void
}

export const DianSettingsSoftwareSection: React.FC<
  DianSettingsSoftwareSectionProps
> = ({ config, onSaved }) => {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState({
    environment: "2",
    provider: "native_soap",
    software_id: "",
    software_pin: "",
    test_set_id: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    setForm({
      environment: String(config.environment || "2"),
      provider: String(config.provider || "native_soap"),
      software_id: String(config.software_id || ""),
      software_pin: String(config.software_pin || ""),
      test_set_id: String(config.test_set_id || ""),
    })
  }, [config])

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dianClient.updateConfig({
        ...form,
        test_set_id: form.test_set_id || null,
      })
      toast.success(t("dian.settings.toastSoftwareSaved"))
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || t("dian.settings.toastSoftwareError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="px-6 py-4">
        <Heading level="h2">{t("dian.settings.softwareTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("dian.settings.softwareSubtitle")}
        </Text>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3"
      >
        <div>
          <Label>{t("dian.settings.environmentLabel")}</Label>
          <Select
            value={form.environment}
            onValueChange={(v) => updateField("environment", v)}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="2">{t("dian.settings.env2Option")}</Select.Item>
              <Select.Item value="1">{t("dian.settings.env1Option")}</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label>{t("dian.settings.providerLabel")}</Label>
          <Select
            value={form.provider}
            onValueChange={(v) => updateField("provider", v)}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="native_soap">
                {t("dian.settings.providerNativeOption")}
              </Select.Item>
              <Select.Item value="siigo">
                {t("dian.settings.providerSiigoOption")}
              </Select.Item>
              <Select.Item value="alegra">
                {t("dian.settings.providerAlegraOption")}
              </Select.Item>
              <Select.Item value="dataico">
                {t("dian.settings.providerDataicoOption")}
              </Select.Item>
              <Select.Item value="facturatech">
                {t("dian.settings.providerFacturatechOption")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label>{t("dian.settings.testSetIdLabel")}</Label>
          <Input
            value={form.test_set_id}
            onChange={(e) => updateField("test_set_id", e.target.value)}
          />
        </div>

        <div>
          <Label>{t("dian.settings.softwareIdLabel")}</Label>
          <Input
            value={form.software_id}
            onChange={(e) => updateField("software_id", e.target.value)}
          />
        </div>

        <div>
          <Label>{t("dian.settings.softwarePinLabel")}</Label>
          <Input
            type="password"
            value={form.software_pin}
            onChange={(e) => updateField("software_pin", e.target.value)}
          />
        </div>

        <div className="flex items-end justify-end">
          <Button type="submit" isLoading={saving}>
            {t("dian.settings.saveSoftwareBtn")}
          </Button>
        </div>
      </form>
    </Container>
  )
}

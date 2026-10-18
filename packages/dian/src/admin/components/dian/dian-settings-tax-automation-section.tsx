import { useEffect, useState } from "react"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { dianClient } from "../../../sdk"

export interface DianSettingsTaxAutomationSectionProps {
  config: Record<string, any> | null
  onSaved: () => void
}

export const DianSettingsTaxAutomationSection: React.FC<
  DianSettingsTaxAutomationSectionProps
> = ({ config, onSaved }) => {
  const { t, i18n } = useTranslation()
  const [autoPaymentCaptured, setAutoPaymentCaptured] = useState(true)
  const [autoOrderPlaced, setAutoOrderPlaced] = useState(false)
  const [autoRefundCreditNote, setAutoRefundCreditNote] = useState(true)
  const [enableContingency, setEnableContingency] = useState(true)
  const [enableWithholdings, setEnableWithholdings] = useState(true)
  const [retefuenteRate, setRetefuenteRate] = useState("2.5")
  const [reteivaRate, setReteivaRate] = useState("15")
  const [reteicaRate, setReteicaRate] = useState("11.04")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    setAutoPaymentCaptured(Boolean(config.auto_emit_on_payment_captured))
    setAutoOrderPlaced(Boolean(config.auto_emit_on_order_placed))
    setAutoRefundCreditNote(Boolean(config.auto_emit_credit_note_on_refund))
    setEnableContingency(Boolean(config.enable_contingency_fallback))
    setEnableWithholdings(Boolean(config.enable_withholdings))
    setRetefuenteRate(String(config.retefuente_goods_rate ?? 2.5))
    setReteivaRate(String(config.reteiva_rate ?? 15))
    setReteicaRate(String(config.reteica_rate_per_thousand ?? 11.04))
  }, [config])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dianClient.updateConfig({
        auto_emit_on_payment_captured: autoPaymentCaptured,
        auto_emit_on_order_placed: autoOrderPlaced,
        auto_emit_credit_note_on_refund: autoRefundCreditNote,
        enable_contingency_fallback: enableContingency,
        enable_withholdings: enableWithholdings,
        retefuente_goods_rate: Number(retefuenteRate),
        reteiva_rate: Number(reteivaRate),
        reteica_rate_per_thousand: Number(reteicaRate),
      })
      toast.success(t("dian.settings.toastAutomationSaved"))
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || t("dian.settings.toastAutomationError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="px-6 py-4">
        <Heading level="h2">{t("dian.settings.automationTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("dian.settings.automationSubtitle")}
        </Text>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Text weight="plus" size="small">
                {t("dian.settings.autoPaymentCapturedTitle")}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t("dian.settings.autoPaymentCapturedDesc")}
              </Text>
            </div>
            <Switch
              checked={autoPaymentCaptured}
              onCheckedChange={setAutoPaymentCaptured}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Text weight="plus" size="small">
                {t("dian.settings.autoOrderPlacedTitle")}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t("dian.settings.autoOrderPlacedDesc")}
              </Text>
            </div>
            <Switch
              checked={autoOrderPlaced}
              onCheckedChange={setAutoOrderPlaced}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Text weight="plus" size="small">
                {t("dian.settings.autoRefundTitle")}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t("dian.settings.autoRefundDesc")}
              </Text>
            </div>
            <Switch
              checked={autoRefundCreditNote}
              onCheckedChange={setAutoRefundCreditNote}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Text weight="plus" size="small">
                {t("dian.settings.contingencyTitle")}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t("dian.settings.contingencyDesc")}
              </Text>
            </div>
            <Switch
              checked={enableContingency}
              onCheckedChange={setEnableContingency}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>{t("dian.settings.withholdingsLabel")}</Label>
            <Switch
              checked={enableWithholdings}
              onCheckedChange={setEnableWithholdings}
            />
          </div>
          <div>
            <Label>{t("dian.settings.retefuenteLabel")}</Label>
            <Input
              type="number"
              step="0.01"
              value={retefuenteRate}
              onChange={(e) => setRetefuenteRate(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("dian.settings.reteivaLabel")}</Label>
            <Input
              type="number"
              step="0.01"
              value={reteivaRate}
              onChange={(e) => setReteivaRate(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("dian.settings.reteicaLabel")}</Label>
            <Input
              type="number"
              step="0.01"
              value={reteicaRate}
              onChange={(e) => setReteicaRate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="submit" isLoading={saving}>
            {t("dian.settings.saveAutomationBtn")}
          </Button>
        </div>
      </form>
    </Container>
  )
}

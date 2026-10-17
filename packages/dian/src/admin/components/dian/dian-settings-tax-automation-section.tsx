import React, { useEffect, useState } from "react"
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
import { dianClient } from "../../../sdk"

export interface DianSettingsTaxAutomationSectionProps {
  config: Record<string, any> | null
  onSaved: () => void
}

export const DianSettingsTaxAutomationSection: React.FC<
  DianSettingsTaxAutomationSectionProps
> = ({ config, onSaved }) => {
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
      toast.success("Reglas de automatización y retenciones DIAN actualizadas")
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar reglas DIAN")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">
          Automatización de Emisión, Contingencia (Tipo 03) y Retenciones
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Configura disparadores automáticos, modo contingencia ante caídas del
          WS DIAN y tarifas informativas de ReteFuente (06), ReteIVA (05) y
          ReteICA (07).
        </Text>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Text weight="plus" size="small">
                Emitir Factura (01) al capturar pago
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Evento: order.payment_captured
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
                Emitir Factura (01) al crear orden
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Evento: order.placed
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
                Emitir Nota Crédito (91) en reembolsos
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Evento: order.refund_created
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
                Modo Contingencia Automático (Tipo 03)
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Encola para retransmisión si DIAN WS responde 5xx o timeout
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
            <Label>Calcular Retenciones B2B</Label>
            <Switch
              checked={enableWithholdings}
              onCheckedChange={setEnableWithholdings}
            />
          </div>
          <div>
            <Label>ReteFuente Compras (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={retefuenteRate}
              onChange={(e) => setRetefuenteRate(e.target.value)}
            />
          </div>
          <div>
            <Label>ReteIVA (% sobre IVA)</Label>
            <Input
              type="number"
              step="0.01"
              value={reteivaRate}
              onChange={(e) => setReteivaRate(e.target.value)}
            />
          </div>
          <div>
            <Label>ReteICA (Por mil ‰)</Label>
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
            Guardar Reglas y Retenciones
          </Button>
        </div>
      </form>
    </Container>
  )
}

import React, { useEffect, useState } from "react"
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
import { dianClient } from "../../../sdk"

export interface DianSettingsSoftwareSectionProps {
  config: Record<string, any> | null
  onSaved: () => void
}

export const DianSettingsSoftwareSection: React.FC<
  DianSettingsSoftwareSectionProps
> = ({ config, onSaved }) => {
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
      toast.success("Configuración de Software y Proveedor DIAN actualizada")
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar Software DIAN")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">
          Ambiente, Software Propio / Proveedor Tecnológico y Habilitación
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Configura SoftwareID, SoftwarePIN (para SoftwareSecurityCode y CUDE) y
          TestSetId para el Set de Pruebas de Habilitación DIAN.
        </Text>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3"
      >
        <div>
          <Label>Ambiente DIAN</Label>
          <Select
            value={form.environment}
            onValueChange={(v) => updateField("environment", v)}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="2">2 - Habilitación / Pruebas</Select.Item>
              <Select.Item value="1">1 - Producción Oficial</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label>Motor / Proveedor Tecnológico</Label>
          <Select
            value={form.provider}
            onValueChange={(v) => updateField("provider", v)}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="native_soap">
                Software Propio (DIAN SOAP Directo)
              </Select.Item>
              <Select.Item value="siigo">Siigo Nube API</Select.Item>
              <Select.Item value="alegra">Alegra Colombia API</Select.Item>
              <Select.Item value="dataico">Dataico API</Select.Item>
              <Select.Item value="facturatech">FacturaTech</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label>TestSetId (Habilitación)</Label>
          <Input
            value={form.test_set_id}
            onChange={(e) => updateField("test_set_id", e.target.value)}
          />
        </div>

        <div>
          <Label>Software ID DIAN</Label>
          <Input
            value={form.software_id}
            onChange={(e) => updateField("software_id", e.target.value)}
          />
        </div>

        <div>
          <Label>Software PIN (5 dígitos)</Label>
          <Input
            type="password"
            value={form.software_pin}
            onChange={(e) => updateField("software_pin", e.target.value)}
          />
        </div>

        <div className="flex items-end justify-end">
          <Button type="submit" isLoading={saving}>
            Guardar Software DIAN
          </Button>
        </div>
      </form>
    </Container>
  )
}

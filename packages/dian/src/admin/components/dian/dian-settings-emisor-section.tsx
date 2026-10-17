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

export interface DianSettingsEmisorSectionProps {
  config: Record<string, any> | null
  municipalities: Array<Record<string, any>>
  onSaved: () => void
}

export const DianSettingsEmisorSection: React.FC<
  DianSettingsEmisorSectionProps
> = ({ config, municipalities, onSaved }) => {
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
      toast.success("Datos fiscales del Emisor DIAN actualizados")
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar datos del Emisor")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Datos Fiscales del Emisor (OFE)</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Identificación tributaria (NIT y DV Módulo 11), Razón Social,
          ubicación DANE DIVIPOLA y datos de contacto del Obligado a Facturar.
        </Text>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3"
      >
        <div>
          <Label>NIT Emisor (DV calculado: {config?.seller_dv || "-"})</Label>
          <Input
            value={form.seller_nit}
            onChange={(e) => updateField("seller_nit", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Razón Social</Label>
          <Input
            value={form.registration_name}
            onChange={(e) => updateField("registration_name", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Nombre Comercial</Label>
          <Input
            value={form.trade_name}
            onChange={(e) => updateField("trade_name", e.target.value)}
          />
        </div>
        <div>
          <Label>Municipio DANE (DIVIPOLA)</Label>
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
          <Label>Correo Electrónico Emisor</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Teléfono Emisor</Label>
          <Input
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label>Dirección Física</Label>
          <Input
            value={form.address_line}
            onChange={(e) => updateField("address_line", e.target.value)}
          />
        </div>
        <div className="flex items-end justify-end">
          <Button type="submit" isLoading={saving}>
            Guardar Emisor
          </Button>
        </div>
      </form>
    </Container>
  )
}

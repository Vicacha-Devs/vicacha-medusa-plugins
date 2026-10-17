import React, { useState } from "react"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  toast,
} from "@medusajs/ui"
import { dianClient } from "../../../sdk"

export interface DianResolutionCreateFormSectionProps {
  onSaved: () => void
}

export const DianResolutionCreateFormSection: React.FC<
  DianResolutionCreateFormSectionProps
> = ({ onSaved }) => {
  const [prefix, setPrefix] = useState("FE")
  const [resolutionNumber, setResolutionNumber] = useState("18760000001")
  const [documentType, setDocumentType] = useState("01")
  const [fromNumber, setFromNumber] = useState("1")
  const [toNumber, setToNumber] = useState("100000")
  const [validFrom, setValidFrom] = useState("2025-01-01")
  const [validTo, setValidTo] = useState("2030-12-31")
  const [technicalKey, setTechnicalKey] = useState("")
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dianClient.upsertResolution({
        resolution_number: resolutionNumber,
        prefix,
        document_type: documentType,
        from_number: Number(fromNumber),
        to_number: Number(toNumber),
        current_number: Number(fromNumber),
        valid_from: validFrom,
        valid_to: validTo,
        technical_key: technicalKey || null,
        is_active: true,
      })
      toast.success("Resolución DIAN 1876 guardada")
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar resolución")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">
        Agregar Nueva Resolución 1876
      </Heading>
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div>
          <Label>Tipo de Documento</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="01">01 - Factura Electrónica</Select.Item>
              <Select.Item value="20">20 - POS Electrónico</Select.Item>
              <Select.Item value="91">91 - Nota Crédito</Select.Item>
              <Select.Item value="92">92 - Nota Débito</Select.Item>
              <Select.Item value="03">03 - Contingencia</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div>
          <Label>Prefijo</Label>
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Número Resolución 1876</Label>
          <Input
            value={resolutionNumber}
            onChange={(e) => setResolutionNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Rango Desde</Label>
          <Input
            type="number"
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Rango Hasta</Label>
          <Input
            type="number"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Clave Técnica DIAN (CUFE)</Label>
          <Input
            value={technicalKey}
            onChange={(e) => setTechnicalKey(e.target.value)}
            placeholder="fc8eac422eba..."
          />
        </div>
        <div>
          <Label>Vigencia Desde</Label>
          <Input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Vigencia Hasta</Label>
          <Input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" isLoading={saving}>
            Guardar Resolución
          </Button>
        </div>
      </form>
    </Container>
  )
}

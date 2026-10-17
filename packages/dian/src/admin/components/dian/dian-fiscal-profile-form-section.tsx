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

export interface DianFiscalProfileFormSectionProps {
  onSaved: () => void
}

export const DianFiscalProfileFormSection: React.FC<
  DianFiscalProfileFormSectionProps
> = ({ onSaved }) => {
  const [customerId, setCustomerId] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [organizationType, setOrganizationType] = useState("2")
  const [identificationType, setIdentificationType] = useState("13")
  const [identificationNumber, setIdentificationNumber] = useState("")
  const [registrationName, setRegistrationName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [municipalityCode, setMunicipalityCode] = useState("11001")
  const [saving, setSaving] = useState(false)

  const isLegalEntity = organizationType === "1"

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !phone.trim()) {
      toast.error(
        "El cliente debe tener correo electrónico y teléfono registrados para Facturación Electrónica DIAN."
      )
      return
    }
    if (isLegalEntity && !companyId.trim()) {
      toast.error(
        "Para Persona Jurídica (1) se requiere una Empresa vinculada en @vicacha-devs/medusa-plugin-b2b (company_id)."
      )
      return
    }

    setSaving(true)
    try {
      await dianClient.upsertFiscalProfile({
        customer_id: customerId.trim(),
        company_id: isLegalEntity ? companyId.trim() : null,
        organization_type: organizationType,
        identification_type: isLegalEntity ? "31" : identificationType,
        identification_number: identificationNumber.trim(),
        registration_name: registrationName.trim(),
        tax_regime: isLegalEntity ? "48" : "49",
        email: email.trim(),
        phone: phone.trim(),
        municipality_code: municipalityCode,
      })
      toast.success("Perfil fiscal DIAN del cliente guardado")
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar perfil fiscal")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-6">
      <Heading level="h2" className="mb-4">
        Registrar / Actualizar Perfil Fiscal DIAN de Cliente
      </Heading>
      <form
        onSubmit={(e) => void handleSave(e)}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div>
          <Label>ID Cliente Medusa (customer_id) *</Label>
          <Input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="cus_01..."
            required
          />
        </div>
        <div>
          <Label>Tipo de Organización *</Label>
          <Select value={organizationType} onValueChange={setOrganizationType}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="2">2 - Persona Natural (Cliente)</Select.Item>
              <Select.Item value="1">
                1 - Persona Jurídica (Requiere B2B Company)
              </Select.Item>
            </Select.Content>
          </Select>
        </div>
        {isLegalEntity ? (
          <div>
            <Label>ID Empresa B2B (@vicacha-devs/medusa-plugin-b2b) *</Label>
            <Input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="comp_01..."
              required
            />
          </div>
        ) : (
          <div>
            <Label>Tipo de Documento</Label>
            <Select
              value={identificationType}
              onValueChange={setIdentificationType}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="13">13 - Cédula de Ciudadanía</Select.Item>
                <Select.Item value="22">22 - Cédula de Extranjería</Select.Item>
                <Select.Item value="31">31 - NIT (Módulo 11)</Select.Item>
                <Select.Item value="41">41 - Pasaporte</Select.Item>
              </Select.Content>
            </Select>
          </div>
        )}
        <div>
          <Label>Número de Identificación / NIT (sin DV) *</Label>
          <Input
            value={identificationNumber}
            onChange={(e) => setIdentificationNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Nombre Completo o Razón Social *</Label>
          <Input
            value={registrationName}
            onChange={(e) => setRegistrationName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Código Municipio DANE</Label>
          <Input
            value={municipalityCode}
            onChange={(e) => setMunicipalityCode(e.target.value)}
            placeholder="11001"
          />
        </div>
        <div>
          <Label>Correo Electrónico (Obligatorio DIAN) *</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Teléfono de Contacto (Obligatorio DIAN) *</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" isLoading={saving}>
            Guardar Perfil Fiscal
          </Button>
        </div>
      </form>
    </Container>
  )
}

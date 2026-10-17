import React from "react"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"

export interface DianOverviewSectionProps {
  config: Record<string, any> | null
  documents: Array<Record<string, any>>
  resolutions: Array<Record<string, any>>
}

export const DianOverviewSection: React.FC<DianOverviewSectionProps> = ({
  config,
  documents,
  resolutions,
}) => {
  const validatedCount = documents.filter(
    (d) => d.status === "validated"
  ).length
  const contingencyCount = documents.filter(
    (d) => d.status === "contingency"
  ).length
  const activeResolutions = resolutions.filter((r) => r.is_active).length
  const isProd = config?.environment === "1"

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h1">Facturación Electrónica DIAN (Colombia)</Heading>
            <Badge color={isProd ? "green" : "orange"}>
              {isProd ? "Ambiente 1: Producción" : "Ambiente 2: Habilitación"}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            UBL 2.1 Anexo Técnico 1.9 • CUFE/CUDE SHA-384 • XAdES-EPES • PDF vía
            @vicacha-devs/medusa-plugin-documents • Clientes Jurídicos vía
            @vicacha-devs/medusa-plugin-b2b
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="small" asChild>
            <Link to="/dian/resolutions">Resoluciones 1876</Link>
          </Button>
          <Button variant="secondary" size="small" asChild>
            <Link to="/dian/fiscal-profiles">Perfiles Fiscales / B2B</Link>
          </Button>
          <Button variant="secondary" size="small" asChild>
            <Link to="/settings/dian">Configuración DIAN</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            Emisor NIT / Razón Social
          </Text>
          <Text weight="plus" className="mt-1">
            {config?.registration_name || "Sin configurar"}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            NIT {config?.seller_nit || "-"} - DV {config?.seller_dv || "-"}
          </Text>
        </div>

        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            Documentos Validados DIAN
          </Text>
          <Heading level="h2" className="mt-1">
            {validatedCount}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Total emitidos: {documents.length}
          </Text>
        </div>

        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            Contingencia (Tipo 03)
          </Text>
          <Heading level="h2" className="mt-1">
            {contingencyCount}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
             Cola de retransmisión SOAP
          </Text>
        </div>

        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            Resoluciones Activas (1876)
          </Text>
          <Heading level="h2" className="mt-1">
            {activeResolutions}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Proveedor: {config?.provider || "native_soap"}
          </Text>
        </div>
      </div>
    </Container>
  )
}

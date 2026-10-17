import React from "react"
import { Badge, Container, Heading, Table, Text } from "@medusajs/ui"

export interface DianFiscalProfilesTableSectionProps {
  profiles: Array<Record<string, any>>
}

export const DianFiscalProfilesTableSection: React.FC<
  DianFiscalProfilesTableSectionProps
> = ({ profiles }) => {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">
          Perfiles Fiscales de Clientes y Empresas B2B (Adquirentes)
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Todo comprador que solicite Factura Electrónica debe ser cliente
          registrado con email y teléfono. Clientes Jurídicos (NIT) requieren
          @vicacha-devs/medusa-plugin-b2b.
        </Text>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Cliente / Razón Social</Table.HeaderCell>
              <Table.HeaderCell>Tipo Persona</Table.HeaderCell>
              <Table.HeaderCell>Identificación (NIT / Doc)</Table.HeaderCell>
              <Table.HeaderCell>Email & Teléfono</Table.HeaderCell>
              <Table.HeaderCell>Municipio DANE</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {profiles.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell className="font-medium">
                  {p.registration_name}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={p.organization_type === "1" ? "blue" : "green"}>
                    {p.organization_type === "1"
                      ? "1 - Persona Jurídica (B2B)"
                      : "2 - Persona Natural"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {p.identification_type}: {p.identification_number}
                  {p.dv ? `-${p.dv}` : ""}
                </Table.Cell>
                <Table.Cell>
                  {p.email} • {p.phone}
                </Table.Cell>
                <Table.Cell>
                  {p.municipality_name} ({p.municipality_code})
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

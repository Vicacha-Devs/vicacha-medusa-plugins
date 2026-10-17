import React from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
} from "@medusajs/ui"

export interface DianDocumentsTableSectionProps {
  documents: Array<Record<string, any>>
  loading: boolean
  typeFilter: string
  setTypeFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  onRefresh: () => void
}

const DOC_TYPE_LABELS: Record<string, string> = {
  "01": "01 - Factura Electrónica",
  "02": "02 - Factura Exportación",
  "03": "03 - Contingencia Facturador",
  "20": "20 - POS Electrónico",
  "91": "91 - Nota Crédito",
  "92": "92 - Nota Débito",
}

export const DianDocumentsTableSection: React.FC<
  DianDocumentsTableSectionProps
> = ({
  documents,
  loading,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  onRefresh,
}) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading level="h2">Documentos Electrónicos Emitidos</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Descarga la Representación Gráfica PDF (@vicacha-devs/medusa-plugin-documents),
            XML UBL 2.1 firmado o el contenedor oficial AttachedDocument (.zip).
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48">
            <Select value={typeFilter} onValueChange={setTypeFilter} size="small">
              <Select.Trigger>
                <Select.Value placeholder="Tipo de documento" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">Todos los tipos</Select.Item>
                <Select.Item value="01">01 - Factura Electrónica</Select.Item>
                <Select.Item value="20">20 - POS Electrónico</Select.Item>
                <Select.Item value="91">91 - Nota Crédito</Select.Item>
                <Select.Item value="92">92 - Nota Débito</Select.Item>
              </Select.Content>
            </Select>
          </div>

          <div className="w-40">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              size="small"
            >
              <Select.Trigger>
                <Select.Value placeholder="Estado DIAN" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">Todos los estados</Select.Item>
                <Select.Item value="validated">Validado DIAN</Select.Item>
                <Select.Item value="contingency">Contingencia</Select.Item>
                <Select.Item value="rejected">Rechazado</Select.Item>
              </Select.Content>
            </Select>
          </div>

          <Button variant="secondary" size="small" onClick={onRefresh}>
            Actualizar
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Cargando documentos electrónicos DIAN...
          </Text>
        ) : documents.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No se encontraron documentos electrónicos con los filtros actuales.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Número</Table.HeaderCell>
                <Table.HeaderCell>Tipo</Table.HeaderCell>
                <Table.HeaderCell>Adquirente (Cliente / B2B)</Table.HeaderCell>
                <Table.HeaderCell>CUFE / CUDE</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
                <Table.HeaderCell>Estado</Table.HeaderCell>
                <Table.HeaderCell>Descargas</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {documents.map((doc) => {
                const buyer = (doc.buyer_snapshot || {}) as Record<string, any>
                return (
                  <Table.Row key={doc.id}>
                    <Table.Cell className="font-medium">
                      {doc.document_number}
                    </Table.Cell>
                    <Table.Cell>
                      {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {buyer.registration_name || "Consumidor Final"}
                        </span>
                        <span className="text-ui-fg-subtle text-xs">
                          {buyer.identification_number || "222222222222"}
                          {buyer.dv ? `-${buyer.dv}` : ""}
                          {buyer.is_b2b_legal_client ? " • B2B Jurídica" : ""}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs">
                        {String(doc.cufe_cude || "").slice(0, 18)}...
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      {Number(doc.payable_amount || 0).toLocaleString("es-CO")}{" "}
                      {doc.currency_code || "COP"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={
                          doc.status === "validated"
                            ? "green"
                            : doc.status === "contingency"
                              ? "orange"
                              : "red"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" size="small" asChild>
                          <a
                            href={`/admin/dian/documents/${doc.id}/download?format=pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            PDF
                          </a>
                        </Button>
                        <Button variant="secondary" size="small" asChild>
                          <a
                            href={`/admin/dian/documents/${doc.id}/download?format=xml`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            XML
                          </a>
                        </Button>
                        <Button variant="secondary" size="small" asChild>
                          <a
                            href={`/admin/dian/documents/${doc.id}/download?format=zip`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ZIP DIAN
                          </a>
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

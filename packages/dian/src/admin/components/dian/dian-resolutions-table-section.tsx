import React, { useState } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { dianClient } from "../../../sdk"

export interface DianResolutionsTableSectionProps {
  resolutions: Array<Record<string, any>>
  loading: boolean
  onRefresh: () => void
}

export const DianResolutionsTableSection: React.FC<
  DianResolutionsTableSectionProps
> = ({ resolutions, loading, onRefresh }) => {
  const [syncing, setSyncing] = useState(false)

  const handleSyncFromDian = async () => {
    setSyncing(true)
    try {
      await dianClient.syncResolutionsFromDian()
      toast.success("Rangos de numeración sincronizados desde DIAN SOAP")
      onRefresh()
    } catch (err: any) {
      toast.error(err?.message || "Error al sincronizar desde DIAN")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Resoluciones de Numeración DIAN (1876)</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Prefijos, rangos consecutivos, vigencia y Clave Técnica por tipo de
            documento (01 Factura, 20 POS, 91 NC, 92 ND).
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          isLoading={syncing}
          onClick={() => void handleSyncFromDian()}
        >
          Sincronizar GetNumberingRange DIAN
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small">Cargando resoluciones...</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Prefijo</Table.HeaderCell>
                <Table.HeaderCell>Resolución 1876</Table.HeaderCell>
                <Table.HeaderCell>Tipo</Table.HeaderCell>
                <Table.HeaderCell>Rango (Actual)</Table.HeaderCell>
                <Table.HeaderCell>Vigencia</Table.HeaderCell>
                <Table.HeaderCell>Estado</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {resolutions.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell className="font-semibold">{r.prefix}</Table.Cell>
                  <Table.Cell>{r.resolution_number}</Table.Cell>
                  <Table.Cell>{r.document_type}</Table.Cell>
                  <Table.Cell>
                    {r.from_number} - {r.to_number} (Actual:{" "}
                    <strong>{r.current_number}</strong>)
                  </Table.Cell>
                  <Table.Cell>
                    {r.valid_from} a {r.valid_to}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={r.is_active ? "green" : "grey"}>
                      {r.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

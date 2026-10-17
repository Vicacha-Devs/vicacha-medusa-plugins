import React, { useState } from "react"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useDianDocuments } from "../../../hooks"
import { dianClient } from "../../../sdk"
import type { DianDocumentType } from "../../../types"

export interface DianOrderWidgetSectionProps {
  orderId: string
}

export const DianOrderWidgetSection: React.FC<DianOrderWidgetSectionProps> = ({
  orderId,
}) => {
  const { documents, loading, refresh } = useDianDocuments({
    order_id: orderId,
  })
  const [emitting, setEmitting] = useState(false)

  const handleEmit = async (docType: DianDocumentType) => {
    setEmitting(true)
    try {
      const res = await dianClient.emitDocument({
        order_id: orderId,
        document_type: docType,
      })
      toast.success(
        `Documento DIAN ${res.document?.document_number || docType} emitido correctamente`
      )
      void refresh()
    } catch (err: any) {
      toast.error(err?.message || "Error al emitir documento electrónico DIAN")
    } finally {
      setEmitting(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading level="h2">Facturación Electrónica DIAN (Colombia)</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Emite Factura Electrónica (01), POS Electrónico (20) o Nota Crédito
            (91) con PDF generado por @vicacha-devs/medusa-plugin-documents.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="small"
            variant="primary"
            isLoading={emitting}
            onClick={() => void handleEmit("01")}
          >
            Emitir Factura (01)
          </Button>
          <Button
            size="small"
            variant="secondary"
            isLoading={emitting}
            onClick={() => void handleEmit("20")}
          >
            Emitir POS (20)
          </Button>
          <Button
            size="small"
            variant="secondary"
            isLoading={emitting}
            onClick={() => void handleEmit("91")}
          >
            Emitir Nota Crédito (91)
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Consultando documentos DIAN de la orden...
          </Text>
        ) : documents.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            Aún no se han emitido documentos electrónicos DIAN para esta orden.
          </Text>
        ) : (
          <div className="flex flex-col gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between gap-2 rounded-lg border p-3 md:flex-row md:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Text weight="plus">{doc.document_number}</Text>
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
                    <Badge color="blue">Tipo {doc.document_type}</Badge>
                  </div>
                  <Text size="xsmall" className="text-ui-fg-subtle font-mono">
                    {doc.cufe_cude_algorithm}: {doc.cufe_cude}
                  </Text>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="small" asChild>
                    <a
                      href={`/admin/dian/documents/${doc.id}/download?format=pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF Representación Gráfica
                    </a>
                  </Button>
                  <Button variant="secondary" size="small" asChild>
                    <a
                      href={`/admin/dian/documents/${doc.id}/download?format=xml`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      XML UBL 2.1
                    </a>
                  </Button>
                  <Button variant="secondary" size="small" asChild>
                    <a
                      href={`/admin/dian/documents/${doc.id}/download?format=zip`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      AttachedDocument (.zip)
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useDianDocuments } from "../../../hooks"
import { dianClient } from "../../../sdk"
import type { DianDocumentType } from "../../../types"

export interface DianOrderWidgetSectionProps {
  orderId: string
}

export const DianOrderWidgetSection: React.FC<DianOrderWidgetSectionProps> = ({
  orderId,
}) => {
  const { t, i18n } = useTranslation()
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
        t("dian.orderWidget.toastEmitted", {
          number: res.document?.document_number || docType,
        })
      )
      void refresh()
    } catch (err: any) {
      toast.error(err?.message || t("dian.orderWidget.toastError"))
    } finally {
      setEmitting(false)
    }
  }

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading level="h2">{t("dian.orderWidget.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.orderWidget.subtitle")}
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="small"
            variant="primary"
            isLoading={emitting}
            onClick={() => void handleEmit("01")}
          >
            {t("dian.orderWidget.emitInvoiceBtn")}
          </Button>
          <Button
            size="small"
            variant="secondary"
            isLoading={emitting}
            onClick={() => void handleEmit("20")}
          >
            {t("dian.orderWidget.emitPosBtn")}
          </Button>
          <Button
            size="small"
            variant="secondary"
            isLoading={emitting}
            onClick={() => void handleEmit("91")}
          >
            {t("dian.orderWidget.emitCreditNoteBtn")}
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.orderWidget.loading")}
          </Text>
        ) : documents.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.orderWidget.empty")}
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
                    <Badge color="blue">
                      {t("dian.orderWidget.typeBadge", {
                        type: doc.document_type,
                      })}
                    </Badge>
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
                      {t("dian.orderWidget.pdfBtn")}
                    </a>
                  </Button>
                  <Button variant="secondary" size="small" asChild>
                    <a
                      href={`/admin/dian/documents/${doc.id}/download?format=xml`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("dian.orderWidget.xmlBtn")}
                    </a>
                  </Button>
                  <Button variant="secondary" size="small" asChild>
                    <a
                      href={`/admin/dian/documents/${doc.id}/download?format=zip`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("dian.orderWidget.zipBtn")}
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

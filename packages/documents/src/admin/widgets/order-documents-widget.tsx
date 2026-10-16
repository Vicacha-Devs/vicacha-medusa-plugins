import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { SectionRow } from "@medusajs/dashboard/components"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useOrderDocumentsWidgetState } from "../../hooks"
import {
  DOCUMENTS_MODULE,
  type DocumentType,
  SUPPORTED_LOCALES,
} from "../../modules/documents/types"
import { OrderDocumentRow } from "../components/documents"

interface OrderWidgetProps {
  data: {
    id: string
    display_id?: number | string
    email?: string | null
    region_id?: string | null
  }
}

const OrderDocumentsWidget: React.FC<OrderWidgetProps> = ({ data: order }) => {
  const { t, i18n } = useTranslation()
  const {
    documents,
    loading,
    generating,
    actionDocId,
    selectedType,
    setSelectedType,
    selectedLocale,
    setSelectedLocale,
    docusealConfigured,
    expandedAuditId,
    setExpandedAuditId,
    customEmail,
    setCustomEmail,
    getDocTypeLabel,
    handleGenerate,
    handleRegenerate,
    handleSendEmail,
    handleSendForSignature,
    getDocumentPdfUrl,
  } = useOrderDocumentsWidgetState({
    orderId: order?.id || "",
    orderEmail: order?.email,
    orderRegionId: order?.region_id,
    t,
  })

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")
  const staleDocs = documents.filter((d) => d.is_stale)

  return (
    <Container className="divide-y p-0" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("widget.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("widget.subtitle")}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Badge size="xsmall" color="grey">
            {documents.length}
          </Badge>
          <Link
            to="/documents"
            className="flex shrink-0 items-center text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
            tabIndex={-1}
          >
            <ArrowUpRightOnBox className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {staleDocs.length > 0 && (
        <SectionRow
          title={t("widget.staleTitle")}
          value={
            <div className="flex items-center gap-2">
              <Text size="xsmall" className="text-ui-fg-subtle">
                {staleDocs[0].stale_reason || t("widget.staleSubtitle")}
              </Text>
              <Button
                size="small"
                variant="secondary"
                disabled={actionDocId === staleDocs[0].id}
                onClick={() => void handleRegenerate(staleDocs[0].id, false)}
              >
                {t("widget.issueRevisionButton", {
                  version: Number(staleDocs[0].version || 1) + 1,
                })}
              </Button>
            </div>
          }
        />
      )}

      <SectionRow
        title={t("widget.typePlaceholder")}
        value={
          <div className="grid grid-cols-2 gap-2">
            <Select
              size="small"
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as DocumentType)}
            >
              <Select.Trigger>
                <Select.Value placeholder={t("widget.typePlaceholder")} />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="invoice">{t("types.invoice")}</Select.Item>
                <Select.Item value="packing_slip">
                  {t("types.packing_slip")}
                </Select.Item>
                <Select.Item value="credit_note">
                  {t("types.credit_note")}
                </Select.Item>
                <Select.Item value="receipt">{t("types.receipt")}</Select.Item>
              </Select.Content>
            </Select>

            <Select
              size="small"
              value={selectedLocale}
              onValueChange={setSelectedLocale}
            >
              <Select.Trigger>
                <Select.Value placeholder={t("widget.localePlaceholder")} />
              </Select.Trigger>
              <Select.Content>
                {SUPPORTED_LOCALES.map((loc) => (
                  <Select.Item key={loc} value={loc}>
                    {loc.toUpperCase()}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        }
      />

      <div className="flex items-center justify-end px-6 py-3">
        <Button
          size="small"
          variant="primary"
          isLoading={generating}
          onClick={() => void handleGenerate()}
        >
          {t("widget.generateButton", {
            type: getDocTypeLabel(selectedType),
          })}
        </Button>
      </div>

      {loading ? (
        <SectionRow
          title={t("widget.title")}
          value={
            <Text size="small" className="text-ui-fg-subtle">
              {t("widget.loading")}
            </Text>
          }
        />
      ) : documents.length === 0 ? (
        <SectionRow
          title={t("widget.title")}
          value={
            <Text size="small" className="text-ui-fg-subtle">
              {t("widget.empty")}
            </Text>
          }
        />
      ) : (
        documents.map((doc) => (
          <OrderDocumentRow
            key={doc.id}
            doc={doc}
            docusealConfigured={docusealConfigured}
            isExpanded={expandedAuditId === doc.id}
            onToggleExpand={() =>
              setExpandedAuditId(expandedAuditId === doc.id ? null : doc.id)
            }
            customEmail={customEmail}
            setCustomEmail={setCustomEmail}
            getDocTypeLabel={getDocTypeLabel}
            getDocumentPdfUrl={getDocumentPdfUrl}
            onSendEmail={(id) => void handleSendEmail(id)}
            onRegenerate={(id, isRetry) => void handleRegenerate(id, isRetry)}
            onSendForSignature={(id) => void handleSendForSignature(id)}
          />
        ))
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderDocumentsWidget
export { DOCUMENTS_MODULE }

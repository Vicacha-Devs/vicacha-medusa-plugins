import React from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useOrderDocumentsWidgetState } from "../../hooks"
import {
  DOCUMENTS_MODULE,
  type DocumentType,
  SUPPORTED_LOCALES,
} from "../../modules/documents/types"

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
        <Badge color="grey">{documents.length}</Badge>
      </div>

      {/* Stale Document Alert Banner */}
      {staleDocs.length > 0 && (
        <div className="bg-ui-bg-field-hover px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-warning">
                {t("widget.staleTitle")}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {staleDocs[0].stale_reason || t("widget.staleSubtitle")}
              </Text>
            </div>
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
        </div>
      )}

      {/* Generate Controls */}
      <div className="flex flex-col gap-3 px-6 py-4">
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

      {/* Document List */}
      <div className="flex flex-col divide-y">
        {loading ? (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              {t("widget.loading")}
            </Text>
          </div>
        ) : documents.length === 0 ? (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              {t("widget.empty")}
            </Text>
          </div>
        ) : (
          documents.map((doc) => {
            const sig = doc.signature_request
            const auditEntries: any[] = Array.isArray(doc.audit_log)
              ? doc.audit_log
              : []
            const priorVersions: any[] = Array.isArray(doc.prior_versions)
              ? doc.prior_versions
              : []
            const isExpanded = expandedAuditId === doc.id

            return (
              <div key={doc.id} className="flex flex-col gap-2 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Text size="small" weight="plus">
                      {doc.document_number}
                    </Text>
                    <Badge size="2xsmall" color="grey">
                      {getDocTypeLabel(doc.document_type)}
                    </Badge>
                    {doc.version > 1 && (
                      <Badge size="2xsmall" color="blue">
                        v{doc.version}
                      </Badge>
                    )}
                    <Badge
                      size="2xsmall"
                      color={
                        doc.status === "generated"
                          ? doc.is_stale
                            ? "orange"
                            : "green"
                          : doc.status === "failed"
                            ? "red"
                            : "grey"
                      }
                    >
                      {doc.is_stale
                        ? t("statuses.stale")
                        : t(`statuses.${doc.status}`, {
                            defaultValue: doc.status,
                          })}
                    </Badge>
                  </div>

                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {(doc.locale || "en").toUpperCase()}
                  </Text>
                </div>

                {doc.status === "failed" && doc.error_message && (
                  <Text size="xsmall" className="text-ui-fg-error">
                    {t("widget.errorPrefix", { message: doc.error_message })}
                  </Text>
                )}

                {/* Optional Docuseal Signature Status */}
                {sig && (
                  <div className="flex items-center justify-between rounded bg-ui-bg-subtle px-3 py-1.5">
                    <Text size="xsmall">
                      {t("widget.signatureStatus", { email: sig.signer_email })}{" "}
                      <strong>{sig.status.toUpperCase()}</strong>
                    </Text>
                    {sig.status === "completed" && (
                      <a
                        href={getDocumentPdfUrl(doc.id, { signed: true })}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-ui-fg-interactive underline"
                      >
                        {t("widget.signedPdfLink")}
                      </a>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {doc.status === "generated" && (
                    <>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() =>
                          window.open(getDocumentPdfUrl(doc.id), "_blank")
                        }
                      >
                        {t("widget.viewPdf")}
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        isLoading={actionDocId === doc.id}
                        onClick={() => void handleSendEmail(doc.id)}
                      >
                        {t("widget.emailButton")}
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        isLoading={actionDocId === doc.id}
                        onClick={() => void handleRegenerate(doc.id, false)}
                      >
                        {t("widget.newRevisionButton")}
                      </Button>
                    </>
                  )}

                  {doc.status === "failed" && (
                    <Button
                      size="small"
                      variant="primary"
                      isLoading={actionDocId === doc.id}
                      onClick={() => void handleRegenerate(doc.id, true)}
                    >
                      {t("widget.retryButton")}
                    </Button>
                  )}

                  {docusealConfigured &&
                    doc.status === "generated" &&
                    (!sig ||
                      sig.status === "declined" ||
                      sig.status === "expired") && (
                      <Button
                        size="small"
                        variant="secondary"
                        isLoading={actionDocId === doc.id}
                        onClick={() => void handleSendForSignature(doc.id)}
                      >
                        {t("widget.sendSignatureButton")}
                      </Button>
                    )}

                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() =>
                      setExpandedAuditId(isExpanded ? null : doc.id)
                    }
                  >
                    {isExpanded
                      ? t("widget.hideHistory")
                      : t("widget.auditLogButton")}
                  </Button>
                </div>

                {/* Expandable Audit Log & Prior Versions Timeline (Phase 8.4) */}
                {isExpanded && (
                  <div className="mt-2 rounded border border-ui-border-base bg-ui-bg-subtle p-3">
                    <Text size="xsmall" weight="plus">
                      {t("widget.recipientOverrideLabel")}
                    </Text>
                    <div className="mt-1 mb-3">
                      <Input
                        size="small"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="customer@example.com"
                      />
                    </div>

                    <Text size="xsmall" weight="plus">
                      {t("widget.auditTrailTitle", {
                        count: auditEntries.length,
                      })}
                    </Text>
                    <div className="mt-1 flex flex-col gap-1">
                      {auditEntries.map((entry, idx) => (
                        <Text
                          key={`audit-${idx}`}
                          size="xsmall"
                          className="text-ui-fg-subtle"
                        >
                          • {new Date(entry.timestamp).toLocaleString()} —{" "}
                          <strong>{entry.event}</strong>
                          {entry.details?.recipient
                            ? ` (${entry.details.recipient})`
                            : ""}
                          {entry.details?.version
                            ? ` [v${entry.details.version}]`
                            : ""}
                        </Text>
                      ))}
                    </div>

                    {priorVersions.length > 0 && (
                      <div className="mt-2 border-t border-ui-border-base pt-2">
                        <Text size="xsmall" weight="plus">
                          {t("widget.priorVersionsTitle", {
                            count: priorVersions.length,
                          })}
                        </Text>
                        {priorVersions.map((pv, idx) => (
                          <div
                            key={`pv-${idx}`}
                            className="flex items-center justify-between text-xs text-ui-fg-subtle"
                          >
                            <span>
                              v{pv.version} — {pv.document_number}
                            </span>
                            {pv.file_url && (
                              <a
                                href={pv.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                {t("widget.archivePdfLink")}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderDocumentsWidget
export { DOCUMENTS_MODULE }

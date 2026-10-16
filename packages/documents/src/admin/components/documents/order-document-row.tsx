import { ActionMenu, SectionRow } from "@medusajs/dashboard/components"
import {
  ArrowDownTray,
  ArrowPath,
  Clock,
  Envelope,
  PencilSquare,
} from "@medusajs/icons"
import { Badge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { DocumentRecord, DocumentType } from "../../../types"
import { OrderDocumentAuditPanel } from "./order-document-audit-panel"

interface OrderDocumentRowProps {
  doc: DocumentRecord
  docusealConfigured: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  customEmail: string
  setCustomEmail: (value: string) => void
  getDocTypeLabel: (type: DocumentType | string) => string
  getDocumentPdfUrl: (docId: string, options?: { signed?: boolean }) => string
  onSendEmail: (docId: string) => void
  onRegenerate: (docId: string, isRetry: boolean) => void
  onSendForSignature: (docId: string) => void
}

export const OrderDocumentRow: React.FC<OrderDocumentRowProps> = ({
  doc,
  docusealConfigured,
  isExpanded,
  onToggleExpand,
  customEmail,
  setCustomEmail,
  getDocTypeLabel,
  getDocumentPdfUrl,
  onSendEmail,
  onRegenerate,
  onSendForSignature,
}) => {
  const { t } = useTranslation()
  const sig = doc.signature_request
  const auditEntries: any[] = Array.isArray(doc.audit_log) ? doc.audit_log : []
  const priorVersions: any[] = Array.isArray(doc.prior_versions)
    ? doc.prior_versions
    : []

  return (
    <div className="divide-y">
      <SectionRow
        title={doc.document_number}
        value={
          <div className="flex items-center justify-end gap-2">
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
            <Text size="xsmall" className="text-ui-fg-subtle">
              {(doc.locale || "en").toUpperCase()}
            </Text>
            <ActionMenu
              groups={[
                {
                  actions: [
                    ...(doc.status === "generated"
                      ? [
                          {
                            label: t("widget.viewPdf"),
                            onClick: () =>
                              window.open(getDocumentPdfUrl(doc.id), "_blank"),
                            icon: <ArrowDownTray />,
                          },
                          {
                            label: t("widget.emailButton"),
                            onClick: () => onSendEmail(doc.id),
                            icon: <Envelope />,
                          },
                          {
                            label: t("widget.newRevisionButton"),
                            onClick: () => onRegenerate(doc.id, false),
                            icon: <ArrowPath />,
                          },
                        ]
                      : []),
                    ...(doc.status === "failed"
                      ? [
                          {
                            label: t("widget.retryButton"),
                            onClick: () => onRegenerate(doc.id, true),
                            icon: <ArrowPath />,
                          },
                        ]
                      : []),
                    ...(docusealConfigured &&
                    doc.status === "generated" &&
                    (!sig ||
                      sig.status === "declined" ||
                      sig.status === "expired")
                      ? [
                          {
                            label: t("widget.sendSignatureButton"),
                            onClick: () => onSendForSignature(doc.id),
                            icon: <PencilSquare />,
                          },
                        ]
                      : []),
                    {
                      label: isExpanded
                        ? t("widget.hideHistory")
                        : t("widget.auditLogButton"),
                      onClick: onToggleExpand,
                      icon: <Clock />,
                    },
                  ],
                },
              ]}
            />
          </div>
        }
      />

      {doc.status === "failed" && doc.error_message && (
        <div className="px-6 py-2">
          <Text size="xsmall" className="text-ui-fg-error">
            {t("widget.errorPrefix", { message: doc.error_message })}
          </Text>
        </div>
      )}

      {sig && (
        <SectionRow
          title={t("widget.signatureStatus", {
            email: sig.signer_email,
          })}
          value={
            <div className="flex items-center gap-2">
              <Badge size="2xsmall" color="blue">
                {sig.status.toUpperCase()}
              </Badge>
              {sig.status === "completed" && (
                <a
                  href={getDocumentPdfUrl(doc.id, { signed: true })}
                  target="_blank"
                  rel="noreferrer"
                  className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
                >
                  {t("widget.signedPdfLink")}
                </a>
              )}
            </div>
          }
        />
      )}

      {isExpanded && (
        <OrderDocumentAuditPanel
          customEmail={customEmail}
          setCustomEmail={setCustomEmail}
          auditEntries={auditEntries}
          priorVersions={priorVersions}
        />
      )}
    </div>
  )
}

import { Input, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

interface OrderDocumentAuditPanelProps {
  customEmail: string
  setCustomEmail: (value: string) => void
  auditEntries: any[]
  priorVersions: any[]
}

export const OrderDocumentAuditPanel: React.FC<
  OrderDocumentAuditPanelProps
> = ({ customEmail, setCustomEmail, auditEntries, priorVersions }) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2 bg-ui-bg-subtle px-6 py-4">
      <Text size="xsmall" weight="plus">
        {t("widget.recipientOverrideLabel")}
      </Text>
      <Input
        size="small"
        value={customEmail}
        onChange={(e) => setCustomEmail(e.target.value)}
        placeholder="customer@example.com"
      />

      <Text size="xsmall" weight="plus" className="mt-2">
        {t("widget.auditTrailTitle", {
          count: auditEntries.length,
        })}
      </Text>
      <div className="flex flex-col gap-1">
        {auditEntries.map((entry, idx) => (
          <Text
            key={`audit-${idx}`}
            size="xsmall"
            className="text-ui-fg-subtle"
          >
            • {new Date(entry.timestamp).toLocaleString()} —{" "}
            <strong>{entry.event}</strong>
            {entry.details?.recipient ? ` (${entry.details.recipient})` : ""}
            {entry.details?.version ? ` [v${entry.details.version}]` : ""}
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
                  className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
                >
                  {t("widget.archivePdfLink")}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

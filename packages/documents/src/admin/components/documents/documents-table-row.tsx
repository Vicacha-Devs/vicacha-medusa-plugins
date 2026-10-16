import { ActionMenu } from "@medusajs/dashboard/components"
import { ArrowDownTray, ArrowUpRightOnBox } from "@medusajs/icons"
import { Badge, Checkbox, Table, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { documentsAdminSdk } from "../../../sdk"
import type { DocumentRecord } from "../../../types"

interface DocumentsTableRowProps {
  doc: DocumentRecord
  isSelected: boolean
  onToggleSelect: (id: string) => void
}

export const DocumentsTableRow: React.FC<DocumentsTableRowProps> = ({
  doc,
  isSelected,
  onToggleSelect,
}) => {
  const { t } = useTranslation()

  return (
    <Table.Row>
      <Table.Cell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(doc.id)}
        />
      </Table.Cell>
      <Table.Cell>
        <Text size="small" weight="plus">
          {doc.document_number}
        </Text>
        {doc.version > 1 && (
          <Badge size="2xsmall" color="blue" className="ml-1">
            v{doc.version}
          </Badge>
        )}
      </Table.Cell>
      <Table.Cell>
        <Badge size="2xsmall" color="grey">
          {t(`types.${doc.document_type}`, {
            defaultValue: doc.document_type,
          })}
        </Badge>
      </Table.Cell>
      <Table.Cell>
        <Link
          to={`/orders/${doc.order_id}`}
          className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
        >
          {doc.render_context_snapshot?.order?.display_id
            ? `#${doc.render_context_snapshot.order.display_id}`
            : doc.order_id}
        </Link>
      </Table.Cell>
      <Table.Cell>
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
      </Table.Cell>
      <Table.Cell>
        <Text size="xsmall">
          {(doc.locale || "en").toUpperCase()} •{" "}
          {doc.settings_snapshot?.region_id || t("hub.globalRegion")}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Text size="xsmall">
          {doc.generated_at
            ? new Date(doc.generated_at).toLocaleDateString()
            : "-"}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <ActionMenu
          groups={[
            {
              actions: [
                ...(doc.status === "generated"
                  ? [
                      {
                        label: t("hub.pdfButton"),
                        onClick: () =>
                          window.open(
                            documentsAdminSdk.getDocumentPdfUrl(doc.id),
                            "_blank"
                          ),
                        icon: <ArrowDownTray />,
                      },
                    ]
                  : []),
                {
                  label: t("hub.colOrder"),
                  to: `/orders/${doc.order_id}`,
                  icon: <ArrowUpRightOnBox />,
                },
              ],
            },
          ]}
        />
      </Table.Cell>
    </Table.Row>
  )
}

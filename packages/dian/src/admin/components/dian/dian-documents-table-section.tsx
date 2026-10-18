import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface DianDocumentsTableSectionProps {
  documents: Array<Record<string, any>>
  loading: boolean
  typeFilter: string
  setTypeFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  onRefresh: () => void
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
  const { t, i18n } = useTranslation()

  const docTypeLabels: Record<string, string> = {
    "01": t("dian.documents.type01"),
    "02": t("dian.documents.type02"),
    "03": t("dian.documents.type03"),
    "20": t("dian.documents.type20"),
    "91": t("dian.documents.type91"),
    "92": t("dian.documents.type92"),
  }

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading level="h2">{t("dian.documents.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.documents.subtitle")}
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48">
            <Select value={typeFilter} onValueChange={setTypeFilter} size="small">
              <Select.Trigger>
                <Select.Value placeholder={t("dian.documents.typePlaceholder")} />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">{t("dian.documents.allTypes")}</Select.Item>
                <Select.Item value="01">{t("dian.documents.type01")}</Select.Item>
                <Select.Item value="20">{t("dian.documents.type20")}</Select.Item>
                <Select.Item value="91">{t("dian.documents.type91")}</Select.Item>
                <Select.Item value="92">{t("dian.documents.type92")}</Select.Item>
              </Select.Content>
            </Select>
          </div>

          <div className="w-40">
            <Select value={statusFilter} onValueChange={setStatusFilter} size="small">
              <Select.Trigger>
                <Select.Value placeholder={t("dian.documents.statusPlaceholder")} />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">{t("dian.documents.allStatuses")}</Select.Item>
                <Select.Item value="validated">{t("dian.documents.statusValidated")}</Select.Item>
                <Select.Item value="contingency">{t("dian.documents.statusContingency")}</Select.Item>
                <Select.Item value="rejected">{t("dian.documents.statusRejected")}</Select.Item>
              </Select.Content>
            </Select>
          </div>

          <Button variant="secondary" size="small" onClick={onRefresh}>
            {t("dian.documents.refresh")}
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.documents.loading")}
          </Text>
        ) : documents.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.documents.empty")}
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("dian.documents.colNumber")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.documents.colType")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.documents.colBuyer")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.documents.colCufe")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.documents.colTotal")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.documents.colStatus")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.documents.colDownloads")}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {documents.map((doc) => {
                const buyer = (doc.buyer_snapshot || {}) as Record<string, any>
                return (
                  <Table.Row key={doc.id}>
                    <Table.Cell className="font-medium">{doc.document_number}</Table.Cell>
                    <Table.Cell>{docTypeLabels[doc.document_type] || doc.document_type}</Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {buyer.registration_name || t("dian.documents.finalConsumer")}
                        </span>
                        <span className="text-ui-fg-subtle text-xs">
                          {buyer.identification_number || "222222222222"}
                          {buyer.dv ? `-${buyer.dv}` : ""}
                          {buyer.is_b2b_legal_client ? ` • ${t("dian.documents.b2bLegalTag")}` : ""}
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
                          <a href={`/admin/dian/documents/${doc.id}/download?format=pdf`} target="_blank" rel="noreferrer">
                            {t("dian.documents.pdfBtn")}
                          </a>
                        </Button>
                        <Button variant="secondary" size="small" asChild>
                          <a href={`/admin/dian/documents/${doc.id}/download?format=xml`} target="_blank" rel="noreferrer">
                            {t("dian.documents.xmlBtn")}
                          </a>
                        </Button>
                        <Button variant="secondary" size="small" asChild>
                          <a href={`/admin/dian/documents/${doc.id}/download?format=zip`} target="_blank" rel="noreferrer">
                            {t("dian.documents.zipBtn")}
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

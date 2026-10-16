import {
  Button,
  Checkbox,
  Container,
  Heading,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { DocumentRecord } from "../../../types"
import { DocumentsFiltersBar } from "./documents-filters-bar"
import { DocumentsTableRow } from "./documents-table-row"

interface DocumentsTableSectionProps {
  documents: DocumentRecord[]
  count: number
  loading: boolean
  typeFilter: string
  setTypeFilter: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  dateFrom: string
  setDateFrom: (value: string) => void
  dateTo: string
  setDateTo: (value: string) => void
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  onExportCsv: () => void
  onBulkDownloadZip: () => void
}

export const DocumentsTableSection: React.FC<DocumentsTableSectionProps> = ({
  documents,
  count,
  loading,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  onExportCsv,
  onBulkDownloadZip,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2">{t("hub.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("hub.subtitle", { count })}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="small" variant="secondary" onClick={onExportCsv}>
            {t("hub.exportCsv")}
          </Button>
          <Button
            size="small"
            variant="secondary"
            disabled={selectedIds.size === 0}
            onClick={onBulkDownloadZip}
          >
            {t("hub.downloadZip", { count: selectedIds.size })}
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => navigate("/documents/bulk-generate")}
          >
            {t("hub.bulkRunButton")}
          </Button>
          <Button
            size="small"
            variant="primary"
            onClick={() => navigate("/documents/settings")}
          >
            {t("hub.settingsButton")}
          </Button>
        </div>
      </div>

      <DocumentsFiltersBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
      />

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>
              <Checkbox
                checked={
                  documents.length > 0 && selectedIds.size === documents.length
                }
                onCheckedChange={toggleSelectAll}
              />
            </Table.HeaderCell>
            <Table.HeaderCell>{t("hub.colNumber")}</Table.HeaderCell>
            <Table.HeaderCell>{t("hub.colType")}</Table.HeaderCell>
            <Table.HeaderCell>{t("hub.colOrder")}</Table.HeaderCell>
            <Table.HeaderCell>{t("hub.colStatus")}</Table.HeaderCell>
            <Table.HeaderCell>{t("hub.colLocaleRegion")}</Table.HeaderCell>
            <Table.HeaderCell>{t("hub.colGeneratedAt")}</Table.HeaderCell>
            <Table.HeaderCell>{t("hub.colActions")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell className="py-6 text-center">
                {t("hub.loading")}
              </Table.Cell>
            </Table.Row>
          ) : documents.length === 0 ? (
            <Table.Row>
              <Table.Cell className="py-6 text-center">
                {t("hub.empty")}
              </Table.Cell>
            </Table.Row>
          ) : (
            documents.map((doc) => (
              <DocumentsTableRow
                key={doc.id}
                doc={doc}
                isSelected={selectedIds.has(doc.id)}
                onToggleSelect={toggleSelect}
              />
            ))
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

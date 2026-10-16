import React, { useMemo, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { DocumentText } from "@medusajs/icons"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  useBulkDownloadDocuments,
  useDocumentsList,
} from "../../../hooks"
import { documentsAdminSdk } from "../../../sdk"
import type { DocumentStatus, DocumentType } from "../../../modules/documents/types"
import {
  DocumentsBulkGenerateSection,
  DocumentsOverviewSection,
  DocumentsTableSection,
} from "../../components/documents"

const DocumentsHubPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const queryParams = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      document_type:
        typeFilter !== "all" ? (typeFilter as DocumentType) : undefined,
      status:
        statusFilter !== "all" ? (statusFilter as DocumentStatus) : undefined,
      q: searchQuery.trim() || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [typeFilter, statusFilter, searchQuery, dateFrom, dateTo]
  )

  const { data: listData, isLoading: loading } = useDocumentsList(queryParams, {
    onError: () => {
      toast.error(t("hub.messages.loadError"))
    },
  })

  const documents = listData?.documents || []
  const count = listData?.count || 0

  const bulkDownloadMutation = useBulkDownloadDocuments()

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)))
    }
  }

  const handleBulkDownloadZip = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error(t("hub.messages.selectForZip"))
      return
    }
    try {
      const blob = await bulkDownloadMutation.mutateAsync({ document_ids: ids })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `documents-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t("hub.messages.zipSuccess", { count: ids.length }))
    } catch (err: any) {
      toast.error(err.message || t("hub.messages.zipError"))
    }
  }

  const handleExportCsv = () => {
    const exportUrl = documentsAdminSdk.getExportCsvUrl({
      document_type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
    window.open(exportUrl, "_blank")
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"}>
      <LayoutComposer
        widgetsZonePrefix="documents.list"
        preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
        sections={{
          main: (
            <>
              <LayoutComposer.Entry id="DocumentsOverviewSection">
                <DocumentsOverviewSection
                  documents={documents}
                  count={count}
                  loading={loading}
                />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="DocumentsListTable">
                <DocumentsTableSection
                  documents={documents}
                  count={count}
                  loading={loading}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  dateFrom={dateFrom}
                  setDateFrom={setDateFrom}
                  dateTo={dateTo}
                  setDateTo={setDateTo}
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  onExportCsv={handleExportCsv}
                  onBulkDownloadZip={() => void handleBulkDownloadZip()}
                />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="DocumentsBulkGenerateSection">
                <DocumentsBulkGenerateSection />
              </LayoutComposer.Entry>
            </>
          ),
        }}
      />
    </div>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("nav.label")
}

export const config = defineRouteConfig({
  label: "nav.label",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default DocumentsHubPage

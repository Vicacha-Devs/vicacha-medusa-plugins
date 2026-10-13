import React, { useMemo, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  useBulkDownloadDocuments,
  useBulkGenerateDocuments,
  useDocumentsList,
} from "../../../hooks"
import { documentsAdminSdk } from "../../../sdk"
import type { DocumentStatus, DocumentType } from "../../../modules/documents/types"
import { SUPPORTED_UI_LOCALES } from "../../components/documents/constants"

const DocumentsHubPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOrderIdsInput, setBulkOrderIdsInput] = useState<string>("")
  const [bulkType, setBulkType] = useState<DocumentType>("invoice")

  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").split(
    /[-_]/
  )[0]
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
  const bulkGenerateMutation = useBulkGenerateDocuments()
  const bulkRunning = bulkGenerateMutation.isPending

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

  const handleBulkGenerate = async () => {
    const orderIds = bulkOrderIdsInput
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (orderIds.length === 0) {
      toast.error(t("hub.messages.enterOrderId"))
      return
    }

    try {
      const json = await bulkGenerateMutation.mutateAsync({
        order_ids: orderIds,
        document_type: bulkType,
      })
      toast.success(
        t("hub.messages.bulkSuccess", {
          generated: json.generated ?? json.generated_count ?? 0,
          skipped: json.skipped ?? 0,
          failed: json.failed ?? json.failed_count ?? 0,
        })
      )
      setBulkOrderIdsInput("")
    } catch (err: any) {
      toast.error(err.message || t("hub.messages.bulkError"))
    }
  }

  return (
    <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading level="h1">{t("hub.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("hub.subtitle", { count })}
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <Select
                size="small"
                value={currentLang}
                onValueChange={(lng) => void i18n.changeLanguage(lng)}
              >
                <Select.Trigger aria-label={t("hub.languageLabel")}>
                  <Select.Value placeholder={t("hub.languageLabel")} />
                </Select.Trigger>
                <Select.Content>
                  {SUPPORTED_UI_LOCALES.map((loc) => (
                    <Select.Item key={loc.code} value={loc.code}>
                      {loc.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Button
              size="small"
              variant="secondary"
              onClick={handleExportCsv}
            >
              {t("hub.exportCsv")}
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={selectedIds.size === 0}
              onClick={() => void handleBulkDownloadZip()}
            >
              {t("hub.downloadZip", { count: selectedIds.size })}
            </Button>
            <Button
              size="small"
              variant="primary"
              onClick={() => {
                window.location.href = "/app/documents/settings"
              }}
            >
              {t("hub.settingsButton")}
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-5">
          <Input
            size="small"
            placeholder={t("hub.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            size="small"
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("hub.typePlaceholder")} />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">{t("hub.allTypes")}</Select.Item>
              <Select.Item value="invoice">{t("types.invoices")}</Select.Item>
              <Select.Item value="packing_slip">
                {t("types.packing_slips")}
              </Select.Item>
              <Select.Item value="credit_note">
                {t("types.credit_notes")}
              </Select.Item>
              <Select.Item value="receipt">{t("types.receipts")}</Select.Item>
            </Select.Content>
          </Select>

          <Select
            size="small"
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("hub.statusPlaceholder")} />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">{t("statuses.all")}</Select.Item>
              <Select.Item value="generated">
                {t("statuses.generated")}
              </Select.Item>
              <Select.Item value="failed">{t("statuses.failed")}</Select.Item>
              <Select.Item value="draft">{t("statuses.draft")}</Select.Item>
            </Select.Content>
          </Select>

          <Input
            size="small"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            size="small"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {/* Documents Table */}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                <Checkbox
                  checked={
                    documents.length > 0 &&
                    selectedIds.size === documents.length
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
                <Table.Row key={doc.id}>
                  <Table.Cell>
                    <Checkbox
                      checked={selectedIds.has(doc.id)}
                      onCheckedChange={() => toggleSelect(doc.id)}
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
                    <a
                      href={`/app/orders/${doc.order_id}`}
                      className="text-ui-fg-interactive underline"
                    >
                      {doc.render_context_snapshot?.order?.display_id
                        ? `#${doc.render_context_snapshot.order.display_id}`
                        : doc.order_id}
                    </a>
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
                      {doc.settings_snapshot?.region_id ||
                        t("hub.globalRegion")}
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
                    <div className="flex items-center gap-2">
                      {doc.status === "generated" && (
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() =>
                            window.open(
                              documentsAdminSdk.getDocumentPdfUrl(doc.id),
                              "_blank"
                            )
                          }
                        >
                          {t("hub.pdfButton")}
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </Container>

      {/* Bulk Generation Panel (Phase 7.1) */}
      <Container className="p-6">
        <Heading level="h2" className="mb-1">
          {t("hub.bulkTitle")}
        </Heading>
        <Text size="small" className="mb-3 text-ui-fg-subtle">
          {t("hub.bulkSubtitle")}
        </Text>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <Input
              size="small"
              placeholder={t("hub.bulkPlaceholder")}
              value={bulkOrderIdsInput}
              onChange={(e) => setBulkOrderIdsInput(e.target.value)}
            />
          </div>
          <Select
            size="small"
            value={bulkType}
            onValueChange={(v) => setBulkType(v as DocumentType)}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("hub.typePlaceholder")} />
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
          <Button
            size="small"
            variant="primary"
            isLoading={bulkRunning}
            onClick={() => void handleBulkGenerate()}
          >
            {t("hub.bulkRunButton")}
          </Button>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Documents",
  icon: DocumentText,
})

export default DocumentsHubPage

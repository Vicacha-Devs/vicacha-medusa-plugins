import { Input, Select } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

interface DocumentsFiltersBarProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  typeFilter: string
  setTypeFilter: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  dateFrom: string
  setDateFrom: (value: string) => void
  dateTo: string
  setDateTo: (value: string) => void
}

export const DocumentsFiltersBar: React.FC<DocumentsFiltersBarProps> = ({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}) => {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-5">
      <Input
        size="small"
        placeholder={t("hub.searchPlaceholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Select size="small" value={typeFilter} onValueChange={setTypeFilter}>
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

      <Select size="small" value={statusFilter} onValueChange={setStatusFilter}>
        <Select.Trigger>
          <Select.Value placeholder={t("hub.statusPlaceholder")} />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="all">{t("statuses.all")}</Select.Item>
          <Select.Item value="generated">{t("statuses.generated")}</Select.Item>
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
  )
}

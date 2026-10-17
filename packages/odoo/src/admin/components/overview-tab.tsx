import { SectionRow } from "@medusajs/dashboard/components"
import { Badge, Button, Container, Heading, StatusBadge } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  OdooStatusOverview,
  OdooSyncDirection,
} from "../../modules/odoo/types"
import type { OdooSyncEntity } from "../hooks/use-odoo-dashboard"

export interface OverviewTabProps {
  overview?: OdooStatusOverview
  isSyncing: boolean
  onSync: (entity: OdooSyncEntity, direction?: OdooSyncDirection) => void
}

export const OverviewTab = ({
  overview,
  isSyncing,
  onSync,
}: OverviewTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("overviewTab.manualSyncTitle")}</Heading>
        <StatusBadge
          color={
            overview?.status === "connected"
              ? "green"
              : overview?.status === "unconfigured"
                ? "orange"
                : "red"
          }
        >
          {overview?.status ?? t("header.statusLoading")}
        </StatusBadge>
      </div>

      <SectionRow
        title={t("overviewTab.mappingsLabel")}
        value={
          <Badge size="2xsmall" color="grey">
            {overview?.totalMappings ?? 0}
          </Badge>
        }
      />
      <SectionRow
        title={t("overviewTab.failuresLabel")}
        value={
          <Badge
            size="2xsmall"
            color={(overview?.openFailures ?? 0) > 0 ? "red" : "green"}
          >
            {overview?.openFailures ?? 0}
          </Badge>
        }
      />
      <SectionRow
        title={t("overviewTab.conflictsLabel")}
        value={
          <Badge
            size="2xsmall"
            color={(overview?.openConflicts ?? 0) > 0 ? "orange" : "grey"}
          >
            {overview?.openConflicts ?? 0}
          </Badge>
        }
      />
      <SectionRow
        title={t("overviewTab.posQueueLabel")}
        value={
          <Badge
            size="2xsmall"
            color={
              (overview?.pendingPosTransactions ?? 0) > 0 ? "blue" : "grey"
            }
          >
            {overview?.pendingPosTransactions ?? 0}
          </Badge>
        }
      />

      <div className="flex flex-wrap items-center gap-2 px-6 py-4">
        <Button
          size="small"
          variant="secondary"
          isLoading={isSyncing}
          onClick={() => onSync("products", "odoo_to_medusa")}
        >
          {t("overviewTab.importProducts")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          isLoading={isSyncing}
          onClick={() => onSync("products", "medusa_to_odoo")}
        >
          {t("overviewTab.exportProducts")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          isLoading={isSyncing}
          onClick={() => onSync("inventory", "odoo_to_medusa")}
        >
          {t("overviewTab.importStock")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          isLoading={isSyncing}
          onClick={() => onSync("inventory", "medusa_to_odoo")}
        >
          {t("overviewTab.exportStock")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          isLoading={isSyncing}
          onClick={() => onSync("customers", "bidirectional")}
        >
          {t("overviewTab.syncCustomers")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          isLoading={isSyncing}
          onClick={() => onSync("reconciliation")}
        >
          {t("overviewTab.runReconciliation")}
        </Button>
      </div>
    </Container>
  )
}

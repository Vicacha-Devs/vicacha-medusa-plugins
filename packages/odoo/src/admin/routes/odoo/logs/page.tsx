import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  DriftConflictsSection,
  RecentSyncRunsSection,
  SyncFailuresSection,
} from "../../../components"
import { useOdooDashboard } from "../../../hooks/use-odoo-dashboard"

const OdooLogsPage = () => {
  const { i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const {
    failuresQuery,
    conflictsQuery,
    logsQuery,
    mappingsQuery,
    resolveFailureMutation,
    resolveConflictMutation,
  } = useOdooDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="odoo.logs"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      dir={isRtl ? "rtl" : "ltr"}
      sections={{
        main: (
          <>
            <LayoutComposer.Entry id="OdooSyncFailuresSection">
              <SyncFailuresSection
                failures={failuresQuery.data?.failures ?? []}
                onResolveFailure={(id) =>
                  resolveFailureMutation.mutateAsync({ id })
                }
              />
            </LayoutComposer.Entry>

            <LayoutComposer.Entry id="OdooDriftConflictsSection">
              <DriftConflictsSection
                conflicts={conflictsQuery.data?.conflicts ?? []}
                onResolveConflict={(id, resolution) =>
                  resolveConflictMutation.mutateAsync({ id, resolution })
                }
              />
            </LayoutComposer.Entry>

            <LayoutComposer.Entry id="OdooRecentSyncRunsSection">
              <RecentSyncRunsSection
                logs={logsQuery.data?.logs ?? []}
                mappingsCount={mappingsQuery.data?.mappings?.length ?? 0}
              />
            </LayoutComposer.Entry>
          </>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.logs")
}

export const config = defineRouteConfig({
  label: "tabs.logs",
  translationNs: "odoo",
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default OdooLogsPage

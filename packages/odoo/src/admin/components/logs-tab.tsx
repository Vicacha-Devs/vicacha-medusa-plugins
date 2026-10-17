import { DriftConflictsSection } from "./conflicts-section"
import { SyncFailuresSection } from "./failures-section"
import { RecentSyncRunsSection } from "./sync-logs-table"

export interface LogsTabProps {
  failures: Array<Record<string, unknown>>
  conflicts: Array<Record<string, unknown>>
  logs: Array<Record<string, unknown>>
  mappingsCount: number
  onResolveFailure: (id: string) => Promise<unknown>
  onResolveConflict: (
    id: string,
    resolution: "odoo_wins" | "medusa_wins"
  ) => Promise<unknown>
}

export const LogsTab = ({
  failures,
  conflicts,
  logs,
  mappingsCount,
  onResolveFailure,
  onResolveConflict,
}: LogsTabProps) => {
  return (
    <div className="flex flex-col gap-y-4">
      <SyncFailuresSection
        failures={failures}
        onResolveFailure={onResolveFailure}
      />
      <DriftConflictsSection
        conflicts={conflicts}
        onResolveConflict={onResolveConflict}
      />
      <RecentSyncRunsSection logs={logs} mappingsCount={mappingsCount} />
    </div>
  )
}

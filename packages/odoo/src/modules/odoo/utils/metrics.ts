import type {
  OdooBarcodeContext,
  OdooCircuitState,
  OdooEntityType,
  OdooProtocolVersion,
  OdooSyncDirection,
} from "../types"

class OdooMetricsRegistry {
  private syncRunsTotal = new Map<string, number>()
  private syncRecordsProcessedTotal = new Map<string, number>()
  private syncDurationMsSum = new Map<string, number>()
  private syncDurationMsCount = new Map<string, number>()
  private rpcRequestsTotal = new Map<string, number>()
  private barcodeLookupsTotal = new Map<string, number>()
  private circuitStateValue = 0
  private openFailuresCount = 0
  private openConflictsCount = 0

  recordSyncRun(params: {
    entity: OdooEntityType | "all"
    direction: OdooSyncDirection
    status: "success" | "failed" | "skipped"
    created?: number
    updated?: number
    skipped?: number
    failed?: number
    durationMs: number
  }): void {
    const runKey = `entity="${params.entity}",direction="${params.direction}",status="${params.status}"`
    this.syncRunsTotal.set(runKey, (this.syncRunsTotal.get(runKey) ?? 0) + 1)

    const durKey = `entity="${params.entity}",direction="${params.direction}"`
    this.syncDurationMsSum.set(
      durKey,
      (this.syncDurationMsSum.get(durKey) ?? 0) + Math.max(0, params.durationMs)
    )
    this.syncDurationMsCount.set(
      durKey,
      (this.syncDurationMsCount.get(durKey) ?? 0) + 1
    )

    const actions: Array<["created" | "updated" | "skipped" | "failed", number]> =
      [
        ["created", params.created ?? 0],
        ["updated", params.updated ?? 0],
        ["skipped", params.skipped ?? 0],
        ["failed", params.failed ?? 0],
      ]

    for (const [action, count] of actions) {
      if (count > 0) {
        const recKey = `entity="${params.entity}",action="${action}"`
        this.syncRecordsProcessedTotal.set(
          recKey,
          (this.syncRecordsProcessedTotal.get(recKey) ?? 0) + count
        )
      }
    }
  }

  recordRpcCall(params: {
    protocol: OdooProtocolVersion
    model: string
    method: string
    status: "success" | "error"
  }): void {
    const safeModel = params.model.replace(/[^a-zA-Z0-9._-]/g, "_")
    const safeMethod = params.method.replace(/[^a-zA-Z0-9._-]/g, "_")
    const key = `protocol="${params.protocol}",model="${safeModel}",method="${safeMethod}",status="${params.status}"`
    this.rpcRequestsTotal.set(key, (this.rpcRequestsTotal.get(key) ?? 0) + 1)
  }

  recordBarcodeLookup(params: {
    context: OdooBarcodeContext
    source: string
    found: boolean
  }): void {
    const key = `context="${params.context}",source="${params.source}",found="${params.found ? "true" : "false"}"`
    this.barcodeLookupsTotal.set(
      key,
      (this.barcodeLookupsTotal.get(key) ?? 0) + 1
    )
  }

  setCircuitState(state: OdooCircuitState): void {
    this.circuitStateValue =
      state === "open" ? 2 : state === "half-open" ? 1 : 0
  }

  setOpenCounts(failures: number, conflicts: number): void {
    this.openFailuresCount = Math.max(0, failures)
    this.openConflictsCount = Math.max(0, conflicts)
  }

  reset(): void {
    this.syncRunsTotal.clear()
    this.syncRecordsProcessedTotal.clear()
    this.syncDurationMsSum.clear()
    this.syncDurationMsCount.clear()
    this.rpcRequestsTotal.clear()
    this.barcodeLookupsTotal.clear()
    this.circuitStateValue = 0
    this.openFailuresCount = 0
    this.openConflictsCount = 0
  }

  toJSON(): Record<string, unknown> {
    return {
      circuitStateValue: this.circuitStateValue,
      openFailuresCount: this.openFailuresCount,
      openConflictsCount: this.openConflictsCount,
      syncRuns: Object.fromEntries(this.syncRunsTotal),
      recordsProcessed: Object.fromEntries(this.syncRecordsProcessedTotal),
      rpcRequests: Object.fromEntries(this.rpcRequestsTotal),
      barcodeLookups: Object.fromEntries(this.barcodeLookupsTotal),
    }
  }

  renderPrometheus(): string {
    const lines: string[] = []

    lines.push(
      "# HELP odoo_sync_runs_total Total number of Odoo synchronization runs",
      "# TYPE odoo_sync_runs_total counter"
    )
    for (const [labels, val] of this.syncRunsTotal.entries()) {
      lines.push(`odoo_sync_runs_total{${labels}} ${val}`)
    }

    lines.push(
      "# HELP odoo_sync_records_processed_total Total number of records processed during Odoo syncs",
      "# TYPE odoo_sync_records_processed_total counter"
    )
    for (const [labels, val] of this.syncRecordsProcessedTotal.entries()) {
      lines.push(`odoo_sync_records_processed_total{${labels}} ${val}`)
    }

    lines.push(
      "# HELP odoo_sync_duration_ms_sum Total duration in milliseconds of Odoo sync runs",
      "# TYPE odoo_sync_duration_ms_sum counter"
    )
    for (const [labels, val] of this.syncDurationMsSum.entries()) {
      lines.push(`odoo_sync_duration_ms_sum{${labels}} ${val}`)
    }

    lines.push(
      "# HELP odoo_sync_duration_ms_count Count of timed Odoo sync runs",
      "# TYPE odoo_sync_duration_ms_count counter"
    )
    for (const [labels, val] of this.syncDurationMsCount.entries()) {
      lines.push(`odoo_sync_duration_ms_count{${labels}} ${val}`)
    }

    lines.push(
      "# HELP odoo_rpc_requests_total Total number of RPC calls made to Odoo",
      "# TYPE odoo_rpc_requests_total counter"
    )
    for (const [labels, val] of this.rpcRequestsTotal.entries()) {
      lines.push(`odoo_rpc_requests_total{${labels}} ${val}`)
    }

    lines.push(
      "# HELP odoo_barcode_lookups_total Total number of POS and warehouse barcode lookups",
      "# TYPE odoo_barcode_lookups_total counter"
    )
    for (const [labels, val] of this.barcodeLookupsTotal.entries()) {
      lines.push(`odoo_barcode_lookups_total{${labels}} ${val}`)
    }

    lines.push(
      "# HELP odoo_circuit_breaker_state Current Odoo RPC circuit breaker state (0=closed, 1=half-open, 2=open)",
      "# TYPE odoo_circuit_breaker_state gauge",
      `odoo_circuit_breaker_state ${this.circuitStateValue}`,
      "# HELP odoo_open_failures_total Current number of unresolved ERP sync failures",
      "# TYPE odoo_open_failures_total gauge",
      `odoo_open_failures_total ${this.openFailuresCount}`,
      "# HELP odoo_open_conflicts_total Current number of unresolved ERP reconciliation conflicts",
      "# TYPE odoo_open_conflicts_total gauge",
      `odoo_open_conflicts_total ${this.openConflictsCount}`
    )

    return `${lines.join("\n")}\n`
  }
}

export const odooMetrics = new OdooMetricsRegistry()

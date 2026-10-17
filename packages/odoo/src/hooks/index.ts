import type {
  OdooBarcodeContext,
  OdooBarcodeResolutionResult,
  OdooConnectionConfig,
  OdooConnectionVerificationResult,
  OdooEntityType,
  OdooMutationHookOptions,
  OdooOrderSyncResult,
  OdooQueryHookOptions,
  OdooReconciliationResult,
  OdooReconciliationStrategy,
  OdooRedactedConnectionConfig,
  OdooSectionName,
  OdooStatusOverview,
  OdooSyncDirection,
  OdooSyncResult,
} from "../modules/odoo/types"
import { defaultOdooSdk, odooQueryKeys } from "../sdk"
import { useOdooMutation, useOdooQuery } from "./use-sdk-primitives"

export * from "./use-sdk-primitives"

export function useOdooStatus(options?: OdooQueryHookOptions<OdooStatusOverview>) {
  return useOdooQuery(
    odooQueryKeys.status(),
    () => defaultOdooSdk.admin.getStatus(),
    options
  )
}

export function useOdooConfig(
  options?: OdooQueryHookOptions<{ config: OdooRedactedConnectionConfig }>
) {
  return useOdooQuery(
    odooQueryKeys.config(),
    () => defaultOdooSdk.admin.getConfig(),
    options
  )
}

export function useOdooSectionSettings<T = Record<string, unknown>>(
  section: OdooSectionName,
  options?: OdooQueryHookOptions<{ section: OdooSectionName; settings: T }>
) {
  return useOdooQuery(
    odooQueryKeys.section(section),
    () => defaultOdooSdk.admin.getSectionSettings<T>(section),
    options
  )
}

export function useOdooOptions(
  options?: OdooQueryHookOptions<
    Awaited<ReturnType<typeof defaultOdooSdk.admin.getOptions>>
  >
) {
  return useOdooQuery(
    odooQueryKeys.options(),
    () => defaultOdooSdk.admin.getOptions(),
    options
  )
}

export function useOdooMappings(
  filters?: { entity_type?: OdooEntityType; medusa_id?: string },
  options?: OdooQueryHookOptions<{ mappings: Array<Record<string, unknown>> }>
) {
  return useOdooQuery(
    odooQueryKeys.mappings(filters),
    () => defaultOdooSdk.admin.listMappings(filters),
    options
  )
}

export function useOdooSyncLogs(
  filters?: { entity_type?: string },
  options?: OdooQueryHookOptions<
    Awaited<ReturnType<typeof defaultOdooSdk.admin.listLogs>>
  >
) {
  return useOdooQuery(
    odooQueryKeys.logs(filters),
    () => defaultOdooSdk.admin.listLogs(filters),
    options
  )
}

export function useOdooFailures(
  filters?: { resolved?: boolean },
  options?: OdooQueryHookOptions<{ failures: Array<Record<string, unknown>> }>
) {
  return useOdooQuery(
    odooQueryKeys.failures(filters),
    () => defaultOdooSdk.admin.listFailures(filters),
    options
  )
}

export function useOdooConflicts(
  filters?: { status?: string },
  options?: OdooQueryHookOptions<{ conflicts: Array<Record<string, unknown>> }>
) {
  return useOdooQuery(
    odooQueryKeys.conflicts(filters),
    () => defaultOdooSdk.admin.listConflicts(filters),
    options
  )
}

export function useOdooPosTransactions(
  filters?: { status?: string },
  options?: OdooQueryHookOptions<{
    transactions: Array<Record<string, unknown>>
  }>
) {
  return useOdooQuery(
    odooQueryKeys.posTransactions(filters),
    () => defaultOdooSdk.admin.listPosTransactions(filters),
    options
  )
}

export function useSaveOdooConfig(
  options?: OdooMutationHookOptions<
    { ok: boolean; config: OdooRedactedConnectionConfig },
    Partial<OdooConnectionConfig>
  >
) {
  return useOdooMutation(
    (payload) => defaultOdooSdk.admin.saveConfig(payload),
    options,
    odooQueryKeys.all
  )
}

export function useVerifyOdooConnection(
  options?: OdooMutationHookOptions<
    OdooConnectionVerificationResult,
    Partial<OdooConnectionConfig>
  >
) {
  return useOdooMutation(
    (payload) => defaultOdooSdk.admin.verifyConnection(payload),
    options,
    odooQueryKeys.status()
  )
}

export function useSaveOdooSectionSettings<T = Record<string, unknown>>(
  section: OdooSectionName,
  options?: OdooMutationHookOptions<
    { ok: boolean; section: OdooSectionName; settings: T },
    Partial<T>
  >
) {
  return useOdooMutation(
    (settings) =>
      defaultOdooSdk.admin.saveSectionSettings<T>(section, settings),
    options,
    odooQueryKeys.section(section)
  )
}

export function useTriggerOdooSync(
  options?: OdooMutationHookOptions<
    OdooSyncResult | OdooReconciliationResult,
    {
      entity:
        | "products"
        | "inventory"
        | "customers"
        | "reconciliation"
        | "all"
      direction?: OdooSyncDirection
      strategy?: OdooReconciliationStrategy
      driftThreshold?: number
    }
  >
) {
  return useOdooMutation(
    ({ entity, ...rest }) => defaultOdooSdk.admin.triggerSync(entity, rest),
    options,
    odooQueryKeys.all
  )
}

export function useSyncOrderToOdoo(
  options?: OdooMutationHookOptions<OdooOrderSyncResult, { orderId: string }>
) {
  return useOdooMutation(
    ({ orderId }) => defaultOdooSdk.admin.syncOrder(orderId),
    options,
    odooQueryKeys.all
  )
}

export function useResolveOdooFailure(
  options?: OdooMutationHookOptions<
    { ok: boolean; failure: Record<string, unknown> },
    { id: string; resolvedBy?: string }
  >
) {
  return useOdooMutation(
    (payload) => defaultOdooSdk.admin.resolveFailure(payload),
    options,
    odooQueryKeys.failures()
  )
}

export function useResolveOdooConflict(
  options?: OdooMutationHookOptions<
    { ok: boolean; conflict: Record<string, unknown> },
    {
      id: string
      resolution: "odoo_wins" | "medusa_wins" | "custom"
      customValue?: unknown
      resolvedBy?: string
    }
  >
) {
  return useOdooMutation(
    (payload) => defaultOdooSdk.admin.resolveConflict(payload),
    options,
    odooQueryKeys.conflicts()
  )
}

export function useBarcodeLookup(
  options?: OdooMutationHookOptions<
    OdooBarcodeResolutionResult,
    { barcode: string; context?: OdooBarcodeContext }
  >
) {
  return useOdooMutation(
    (payload) => defaultOdooSdk.store.lookupBarcode(payload),
    options
  )
}

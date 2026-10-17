import { toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useBarcodeLookup,
  useOdooConfig,
  useOdooConflicts,
  useOdooFailures,
  useOdooMappings,
  useOdooOptions,
  useOdooPosTransactions,
  useOdooSectionSettings,
  useOdooStatus,
  useOdooSyncLogs,
  useResolveOdooConflict,
  useResolveOdooFailure,
  useSaveOdooConfig,
  useSaveOdooSectionSettings,
  useTriggerOdooSync,
  useVerifyOdooConnection,
} from "../../hooks"
import type {
  OdooBarcodeContext,
  OdooInventorySyncSettings,
  OdooOrderSyncSettings,
  OdooProductSyncSettings,
  OdooProtocolVersion,
  OdooReconciliationSettings,
  OdooSyncDirection,
} from "../../modules/odoo/types"

export type OdooSyncEntity =
  | "products"
  | "inventory"
  | "customers"
  | "reconciliation"
  | "all"

export interface OdooConnectionFormState {
  url: string
  db: string
  username: string
  password: string
  apiKey: string
  protocol: OdooProtocolVersion
  allowPrivateNetwork: boolean
  webhookSecret: string
}

/**
 * Decoupled state and API orchestration hook for the Odoo ERP Admin Pages.
 */
export const useOdooDashboard = () => {
  const { t } = useTranslation()
  const statusQuery = useOdooStatus()
  const configQuery = useOdooConfig()
  const optionsQuery = useOdooOptions()
  const productSettingsQuery =
    useOdooSectionSettings<OdooProductSyncSettings>("product")
  const inventorySettingsQuery =
    useOdooSectionSettings<OdooInventorySyncSettings>("inventory")
  const orderSettingsQuery =
    useOdooSectionSettings<OdooOrderSyncSettings>("orders")
  const reconciliationSettingsQuery =
    useOdooSectionSettings<OdooReconciliationSettings>("reconciliation")
  const mappingsQuery = useOdooMappings()
  const logsQuery = useOdooSyncLogs()
  const failuresQuery = useOdooFailures({ resolved: false })
  const conflictsQuery = useOdooConflicts({ status: "open" })
  const posQuery = useOdooPosTransactions()

  const saveConfigMutation = useSaveOdooConfig()
  const verifyConnectionMutation = useVerifyOdooConnection()
  const saveProductMutation =
    useSaveOdooSectionSettings<OdooProductSyncSettings>("product")
  const saveInventoryMutation =
    useSaveOdooSectionSettings<OdooInventorySyncSettings>("inventory")
  const saveOrderMutation =
    useSaveOdooSectionSettings<OdooOrderSyncSettings>("orders")
  const saveReconciliationMutation =
    useSaveOdooSectionSettings<OdooReconciliationSettings>("reconciliation")
  const triggerSyncMutation = useTriggerOdooSync()
  const resolveFailureMutation = useResolveOdooFailure()
  const resolveConflictMutation = useResolveOdooConflict()
  const barcodeMutation = useBarcodeLookup()

  const [connectionForm, setConnectionForm] = useState<OdooConnectionFormState>(
    {
      url: "",
      db: "",
      username: "",
      password: "",
      apiKey: "",
      protocol: "jsonrpc",
      allowPrivateNetwork: false,
      webhookSecret: "",
    }
  )

  const [barcodeInput, setBarcodeInput] = useState("")
  const [barcodeContext, setBarcodeContext] =
    useState<OdooBarcodeContext>("pos")

  useEffect(() => {
    const cfg = configQuery.data?.config
    if (cfg) {
      setConnectionForm((prev) => ({
        ...prev,
        url: cfg.url || "",
        db: cfg.db || "",
        username: cfg.username || "",
        protocol: cfg.protocol || "jsonrpc",
        allowPrivateNetwork: Boolean(cfg.allowPrivateNetwork),
      }))
    }
  }, [configQuery.data])

  const notify = (msg: string, tone: "success" | "error" = "success") => {
    if (tone === "error") {
      toast.error(msg)
    } else {
      toast.success(msg)
    }
  }

  const handleSaveConnection = async (
    overrideValues?: Partial<OdooConnectionFormState>
  ) => {
    try {
      const merged = { ...connectionForm, ...overrideValues }
      const {
        url,
        db,
        username,
        protocol,
        allowPrivateNetwork,
        password,
        apiKey,
        webhookSecret,
      } = merged

      await saveConfigMutation.mutateAsync({
        url,
        db,
        username,
        protocol,
        allowPrivateNetwork,
        ...(password ? { password } : {}),
        ...(apiKey ? { apiKey } : {}),
        ...(webhookSecret ? { webhookSecret } : {}),
      })
      setConnectionForm((prev) => ({
        ...prev,
        ...overrideValues,
        password: "",
        apiKey: "",
        webhookSecret: "",
      }))
      notify(t("messages.connectionSaved"))
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.connectionSaveError"),
        "error"
      )
    }
  }

  const handleVerifyConnection = async () => {
    try {
      const {
        url,
        db,
        username,
        protocol,
        allowPrivateNetwork,
        password,
        apiKey,
      } = connectionForm

      const res = await verifyConnectionMutation.mutateAsync({
        url,
        db,
        username,
        protocol,
        allowPrivateNetwork,
        ...(password ? { password } : {}),
        ...(apiKey ? { apiKey } : {}),
      })
      notify(res.message, res.ok ? "success" : "error")
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : t("messages.connectionVerifyError"),
        "error"
      )
    }
  }

  const handleSync = async (
    entity: OdooSyncEntity,
    direction?: OdooSyncDirection
  ) => {
    try {
      const res = await triggerSyncMutation.mutateAsync({ entity, direction })
      const msg =
        "message" in res
          ? res.message
          : t("messages.reconciliationComplete", {
              checked: res.checked,
              drifted: res.drifted,
              fixed: res.fixed,
            })
      notify(msg, res.ok ? "success" : "error")
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.syncError"),
        "error"
      )
    }
  }

  return {
    statusQuery,
    configQuery,
    optionsQuery,
    productSettingsQuery,
    inventorySettingsQuery,
    orderSettingsQuery,
    reconciliationSettingsQuery,
    mappingsQuery,
    logsQuery,
    failuresQuery,
    conflictsQuery,
    posQuery,
    saveConfigMutation,
    verifyConnectionMutation,
    saveProductMutation,
    saveInventoryMutation,
    saveOrderMutation,
    saveReconciliationMutation,
    triggerSyncMutation,
    resolveFailureMutation,
    resolveConflictMutation,
    barcodeMutation,
    connectionForm,
    setConnectionForm,
    barcodeInput,
    setBarcodeInput,
    barcodeContext,
    setBarcodeContext,
    handleSaveConnection,
    handleVerifyConnection,
    handleSync,
  }
}

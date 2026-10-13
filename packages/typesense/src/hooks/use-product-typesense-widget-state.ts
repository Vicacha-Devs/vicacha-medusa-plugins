import { useCallback, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type {
  DocumentInspectResult,
  UseProductTypesenseWidgetStateProps,
} from "../types"
import { typesenseAdminSdk } from "../sdk/client"
import { typesenseQueryKeys } from "../sdk/query-keys"
import {
  useDeleteTypesenseDocument,
  useSyncTypesenseDocument,
  useTypesenseDocumentInspector,
} from "./use-typesense-admin"

export function useProductTypesenseWidgetState({
  productId,
  entity = "products",
  client = typesenseAdminSdk,
}: UseProductTypesenseWidgetStateProps) {
  const { t } = useTranslation()
  const [showJson, setShowJson] = useState(false)
  const docQueryKey = typesenseQueryKeys.document(entity, productId || "")

  const {
    data,
    isLoading: loading,
    refetch: inspectProductDocument,
  } = useTypesenseDocumentInspector(entity, productId, {
    client,
    queryKey: docQueryKey,
  })

  const syncMutation = useSyncTypesenseDocument({
    client,
    queryKey: docQueryKey,
  })

  const deleteMutation = useDeleteTypesenseDocument({
    client,
    queryKey: docQueryKey,
  })

  const handleSyncProduct = useCallback(async () => {
    if (!productId) return
    try {
      await syncMutation.mutateAsync({ entity, id: productId })
      toast.success(t("widget.syncSuccess"))
    } catch {
      toast.error(t("widget.syncError"))
    }
  }, [productId, entity, syncMutation, t])

  const handleRemoveFromIndex = useCallback(async () => {
    if (!productId) return
    try {
      await deleteMutation.mutateAsync({ entity, id: productId })
      toast.success(t("widget.messages.removedSuccess"))
    } catch (error: any) {
      toast.error(error?.message || t("widget.messages.removeError"))
    }
  }, [productId, entity, deleteMutation, t])

  const inspectResult = (data ?? null) as DocumentInspectResult | null

  return {
    data: inspectResult,
    indexed: Boolean(inspectResult?.indexed),
    doc: (inspectResult?.document as Record<string, any> | null) ?? null,
    loading,
    syncing: syncMutation.isPending || deleteMutation.isPending,
    showJson,
    setShowJson,
    showPayload: showJson,
    setShowPayload: setShowJson,
    inspectProductDocument,
    fetchInspection: inspectProductDocument,
    handleSyncProduct,
    handleSyncNow: handleSyncProduct,
    handleRemoveFromIndex,
  }
}

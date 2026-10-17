import { toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useOdooMappings, useSyncOrderToOdoo } from "../../hooks"

export interface OrderOdooData {
  id?: string
  display_id?: number
  metadata?: Record<string, unknown> | null
}

/**
 * Decoupled hook for the Order Details Odoo ERP status widget.
 */
export const useOrderOdooStatus = (data?: OrderOdooData) => {
  const { t } = useTranslation()
  const orderId = data?.id ?? ""
  const mappingsQuery = useOdooMappings(
    orderId ? { entity_type: "order", medusa_id: orderId } : undefined,
    { enabled: Boolean(orderId) }
  )
  const syncOrderMutation = useSyncOrderToOdoo()
  const [feedback, setFeedback] = useState<string | null>(null)

  const mapping = mappingsQuery.data?.mappings?.[0]
  const odooOrderId = data?.metadata?.odoo_order_id ?? mapping?.odoo_id ?? null
  const odooInvoiceId =
    data?.metadata?.odoo_invoice_id ??
    (mapping?.metadata as Record<string, unknown> | undefined)
      ?.odooInvoiceId ??
    null

  const handleSyncOrder = async () => {
    if (!orderId) return
    try {
      const res = await syncOrderMutation.mutateAsync({ orderId })
      setFeedback(res.message)
      toast.success(res.message)
      void mappingsQuery.refetch()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.syncOrderError")
      setFeedback(msg)
      toast.error(msg)
    }
  }

  return {
    odooOrderId,
    odooInvoiceId,
    isSyncing: syncOrderMutation.isPending,
    feedback,
    handleSyncOrder,
  }
}

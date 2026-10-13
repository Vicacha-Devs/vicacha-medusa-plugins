import { useCallback, useState } from "react"
import type {
  MpnLogRecord,
  MpnTemplateRecord,
  UseOrderNotificationsWidgetStateProps,
} from "../types"
import { notificationsAdminSdk } from "../sdk/client"
import { notificationsQueryKeys } from "../sdk/query-keys"
import { useMpnOrderLogs, useSendMpnNotification } from "./use-mpn-dispatch"
import { useMpnTemplates } from "./use-mpn-templates"

export function useOrderNotificationsWidgetState({
  order,
  client = notificationsAdminSdk,
  t = (key: string) => key,
}: UseOrderNotificationsWidgetStateProps) {
  const orderId: string | undefined = order?.id
  const [selectedChannel, setSelectedChannel] = useState<string>("email")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    "system_email_order_placed"
  )
  const [attachInvoicePdf, setAttachInvoicePdf] = useState<boolean>(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const orderLogsQueryKey = notificationsQueryKeys.orderLogs(orderId || "")

  const { data: logsData, refetch: refetchOrderLogs } = useMpnOrderLogs(
    orderId,
    {
      client,
      queryKey: orderLogsQueryKey,
    }
  )

  const { data: templatesData } = useMpnTemplates(undefined, {
    client,
    enabled: Boolean(orderId),
  })

  const logs: MpnLogRecord[] = logsData?.logs || []
  const templates: MpnTemplateRecord[] = templatesData?.templates || []

  const sendMutation = useSendMpnNotification({
    client,
    queryKey: orderLogsQueryKey,
  })

  const handleSendOrderNotification = useCallback(async () => {
    if (!orderId) return
    setStatusMessage(null)
    try {
      const recipient =
        selectedChannel === "email"
          ? order?.email || "customer@example.com"
          : selectedChannel === "whatsapp" || selectedChannel === "sms"
            ? order?.shipping_address?.phone ||
              order?.billing_address?.phone ||
              "+14155552671"
            : order?.metadata?.telegram_chat_id || "-1001234567890"

      await sendMutation.mutateAsync({
        channel: selectedChannel,
        recipient,
        template_id: selectedTemplateId,
        order_id: orderId,
        context_type: "order",
        data: order,
        attach_invoice_pdf: attachInvoicePdf,
      })

      setStatusMessage(
        t("widget.dispatchedSuccess", { channel: selectedChannel })
      )
    } catch (err: any) {
      setStatusMessage(err?.message || t("widget.dispatchFailed"))
    }
  }, [
    orderId,
    order,
    selectedChannel,
    selectedTemplateId,
    attachInvoicePdf,
    sendMutation,
    t,
  ])

  return {
    orderId,
    logs,
    templates,
    selectedChannel,
    setSelectedChannel,
    selectedTemplateId,
    setSelectedTemplateId,
    attachInvoicePdf,
    setAttachInvoicePdf,
    sending: sendMutation.isPending,
    statusMessage,
    setStatusMessage,
    loadOrderActivity: refetchOrderLogs,
    handleSendOrderNotification,
  }
}

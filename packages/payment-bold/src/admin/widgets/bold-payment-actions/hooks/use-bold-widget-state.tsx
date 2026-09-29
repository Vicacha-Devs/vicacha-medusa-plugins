import { AdminOrder } from "@medusajs/framework/types"
import { toast } from "@medusajs/ui"
import { usePaymentProviders } from "@vicacha-devs/medusa-shared-admin/admin"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { EBoldPaymentProvider } from "../../../../types"
import { getActiveBoldProviders } from "../../../../lib"
import {
  useCreateBoldLink,
  useCreateBoldQr,
  usePushToBoldTerminal,
  useBoldPaymentStatusStream,
} from "../../../../hooks"

export const useBoldWidgetState = (order: AdminOrder) => {
  const { t } = useTranslation()

  const [terminalSerial, setTerminalSerial] = useState("")
  const [terminalModel, setTerminalModel] = useState("SMART_POS")
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // 1. Providers
  const { providers = [], isLoading: isLoadingProviders } = usePaymentProviders()
  const activeBoldProviders = getActiveBoldProviders(providers)

  const isTerminalEnabled = activeBoldProviders.includes(EBoldPaymentProvider.TERMINAL)
  const isLinkEnabled = activeBoldProviders.includes(EBoldPaymentProvider.LINK)
  const isQrEnabled = activeBoldProviders.includes(EBoldPaymentProvider.ONLINE)

  // 2. Mutations
  const { mutateAsync: createLink, isPending: isCreatingLink } = useCreateBoldLink()
  const { mutateAsync: createQr, isPending: isCreatingQr } = useCreateBoldQr()
  const { mutateAsync: pushToTerminal, isPending: isPushingToPos } = usePushToBoldTerminal()

  const reference = `ORD_${order.display_id || order.id}_${Date.now()}`.slice(0, 60)


  // 3. SSE Stream
  useBoldPaymentStatusStream({
    sessionId: activeSessionId,
    enabled: !!activeSessionId,
    onSuccess: () => {
      toast(t("bold.admin.widget.toast.payment_approved"), {
        description: t("bold.admin.widget.status.approved_msg"),
      })
    },
    onError: () => {
      toast(t("bold.admin.widget.toast.payment_rejected"), {
        description: t("bold.admin.widget.status.rejected_msg"),
      })
    },
  })

  // 4. Status Check
  const paymentCollection = order.payment_collections?.[0]
  const paymentCollectionId = paymentCollection?.id

  const deriveStatus = () => {
    if (!paymentCollection) return false
    const collectionStatus = (paymentCollection.status || "").toLowerCase()
    if (["captured", "authorized", "completed"].includes(collectionStatus)) return true
    const sessions = paymentCollection.payment_sessions || []
    if (sessions.some((s) => ["captured", "authorized"].includes(s.status || ""))) return true
    return (paymentCollection.payments || []).length > 0
  }

  const isApproved = deriveStatus()

  // 5. Handlers
  const handlePushToPos = async () => {
    if (!paymentCollectionId || !terminalSerial) {
      toast(t("bold.admin.widget.toast.error"), {
        description: !terminalSerial
          ? t("bold.admin.widget.terminal_placeholder")
          : t("bold.admin.widget.status.rejected_msg"),
      })
      return
    }

    try {
      const res = await pushToTerminal({
        amount: order.total,
        currency: order.currency_code,
        terminalModel: terminalModel,
        terminalSerial: terminalSerial,
        paymentCollectionId,
        reference,
        userEmail: order.email || "guest@noemail.local", // TODO: get a better placeholder
      })
      if (res?.session_id) setActiveSessionId(res.session_id)
      toast(t("bold.admin.widget.toast.terminal_sent"), {
        description: t("bold.admin.widget.status.waiting_terminal"),
      })
    } catch (err: any) {
      toast(t("bold.admin.widget.toast.payment_rejected"), { description: err.message })
    }
  }

  const handleCreateRemotePayment = async (mode: "link" | "qr") => {
    if (!paymentCollectionId) {
      toast(t("bold.admin.widget.toast.error"), {
        description: t("bold.admin.widget.status.rejected_msg"),
      })
      return
    }

    try {
      if (mode === "link") {
        const result = await createLink({
          amount: order.total,
          currency: order.currency_code,
          reference,
          description: `Order ${order.display_id || order.id}`,
          email: order.email || "guest@noemail.local",
          paymentCollectionId,
        })

        const generatedUrl =
          result.paymentSession?.data?.url ||
          result.paymentSession?.data?.payment_url ||
          null

        setPaymentLink(generatedUrl)
        if (result.paymentSession?.id) setActiveSessionId(result.paymentSession.id)
        toast(t("bold.admin.widget.toast.link_generated"), {
          description: t("bold.admin.widget.status.waiting_link"),
        })
      } else {
        const result = await createQr({
          amount: order.total,
          currency_code: order.currency_code,
          paymentCollectionId,
        })
        setPaymentLink(result.qr_payload)
        if (result.session_id) setActiveSessionId(result.session_id)
        toast(t("bold.admin.widget.toast.qr_generated"), {
          description: t("bold.admin.widget.status.waiting_qr"),
        })
      }
    } catch (err: any) {
      toast(t("bold.admin.widget.toast.payment_rejected"), { description: err.message })
    }
  }

  return {
    state: {
      terminalSerial,
      terminalModel,
      paymentLink,
      isApproved,
      isLoadingProviders,
      isTerminalEnabled,
      isLinkEnabled,
      isQrEnabled,
      isCreatingLink,
      isCreatingQr,
      isPushingToPos,
      hasBoldProviders: activeBoldProviders.length > 0,
    },
    actions: {
      setTerminalSerial,
      setTerminalModel,
      handlePushToPos,
      handleCreateRemotePayment,
    },
  }
}

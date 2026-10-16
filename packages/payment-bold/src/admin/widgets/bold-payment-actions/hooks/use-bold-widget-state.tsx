import { AdminOrder } from "@medusajs/framework/types"
import { toast } from "@medusajs/ui"
import { usePaymentProviders } from "@vicacha-devs/medusa-shared-admin/admin"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { EBoldPaymentProvider } from "../../../../types"
import { getActiveBoldProviders } from "../../../../lib"
import {
  useCreateBoldLink,
  useCreateBoldQr,
  usePushToBoldTerminal,
  useBoldPaymentStatusStream,
} from "../../../../hooks"
import { getBoldOrderBalanceInfo } from "./bold-order-balance"

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

  // 2. Balance & Status Check (Supports unpaid and partially paid orders)
  const {
    paymentCollectionId,
    isPartiallyPaid,
    payableAmount,
    belongsToBold,
    isApproved,
  } = useMemo(() => getBoldOrderBalanceInfo(order), [order])

  // 3. SSE Stream
  useBoldPaymentStatusStream({
    sessionId: activeSessionId,
    enabled: !!activeSessionId && !isApproved,
    onSuccess: () => {
      setActiveSessionId(null)
      toast(t("bold.admin.widget.toast.payment_approved"), {
        description: t("bold.admin.widget.status.approved_msg"),
      })
    },
    onError: () => {
      setActiveSessionId(null)
      toast(t("bold.admin.widget.toast.payment_rejected"), {
        description: t("bold.admin.widget.status.rejected_msg"),
      })
    },
  })

  // 4. Mutations
  const { mutateAsync: createLink, isPending: isCreatingLink } = useCreateBoldLink()
  const { mutateAsync: createQr, isPending: isCreatingQr } = useCreateBoldQr()
  const { mutateAsync: pushToTerminal, isPending: isPushingToPos } = usePushToBoldTerminal()

  const reference = `ORD_${order.display_id || order.id}_${Date.now()}`.slice(0, 60)

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
        amount: payableAmount,
        currency: order.currency_code,
        terminalModel,
        terminalSerial,
        paymentCollectionId,
        reference,
        userEmail: order.email || "guest@noemail.local",
      })
      if (res?.paymentSession?.id) setActiveSessionId(res.paymentSession.id)
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
          amount: payableAmount,
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
          amount: payableAmount,
          currency_code: order.currency_code,
          paymentCollectionId,
        })
        setPaymentLink(result.qr_payload)
        if (result?.paymentSession?.id) setActiveSessionId(result.paymentSession.id)
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
      isPartiallyPaid,
      payableAmount,
      isLoadingProviders,
      isTerminalEnabled,
      isLinkEnabled,
      isQrEnabled,
      isCreatingLink,
      isCreatingQr,
      isPushingToPos,
      hasBoldProviders: activeBoldProviders.length > 0 && belongsToBold,
    },
    actions: {
      setTerminalSerial,
      setTerminalModel,
      handlePushToPos,
      handleCreateRemotePayment,
    },
  }
}

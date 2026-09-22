import { ActionMenu } from "@medusajs/dashboard/components"
import { EllipsisHorizontal, PencilSquare, XCircle } from "@medusajs/icons"
import { toast, usePrompt } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { QueryQuote } from "../../../../../types"
import { EQuoteStatus } from "../../../../../types"
import { useRejectQuote, useSendQuote } from "../../../../hooks/api"
import { SendQuoteDrawer } from "./send-quote-drawer"

const MANAGEABLE_STATUSES = [
  EQuoteStatus.PendingMerchant,
  EQuoteStatus.CustomerRejected,
  EQuoteStatus.MerchantRejected,
]

export const QuoteActionsMenu = ({ quote }: { quote: QueryQuote }) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false)

  const { mutateAsync: sendQuote, isPending: isSending } = useSendQuote(quote.id)
  const { mutateAsync: rejectQuote, isPending: isRejecting } = useRejectQuote(quote.id)

  const canSend = [
    EQuoteStatus.PendingMerchant, 
    EQuoteStatus.CustomerRejected]
  .includes(
    quote.status as EQuoteStatus
  )
  const canReject = [
    EQuoteStatus.PendingMerchant,
    EQuoteStatus.PendingCustomer,
  ].includes(quote.status as EQuoteStatus)
  const canManage = MANAGEABLE_STATUSES.includes(quote.status as unknown as EQuoteStatus)

  const handleSendConfirm = async (expiresAt: string | null) => {
    try {
      await sendQuote(
        { expires_at: expiresAt },
        {
          onSuccess: () => {
            setSendDrawerOpen(false)
            toast.success(t("quotes.toasts.sent"))
          },
          onError: (err) => toast.error(err.message),
        }
      )
    } catch {}
  }

  const handleReject = async () => {
    const confirmed = await prompt({
      title: t("quotes.prompts.reject.title"),
      description: t("quotes.prompts.reject.description"),
      confirmText: t("actions.reject"),
      cancelText: t("actions.cancel"),
    })
    if (!confirmed) return
    try {
      await rejectQuote(undefined, {
        onSuccess: () => toast.success(t("quotes.toasts.rejected")),
        onError: (err) => toast.error(err.message),
      })
    } catch {}
  }

  const primaryActions = []
  if (canManage) {
    primaryActions.push({
      label: t("quotes.summary.manage", "Manage"),
      onClick: () => navigate(`/b2b/quotes/${quote.id}/manage`),
      icon: <PencilSquare />,
    })
  }
  if (canSend) {
    primaryActions.push({
      label: t("quotes.detail.sendQuote"),
      onClick: () => setSendDrawerOpen(true),
      disabled: isSending,
      icon: <EllipsisHorizontal />,
    })
  }

  const dangerActions = []
  if (canReject) {
    dangerActions.push({
      label: t("quotes.detail.rejectQuote"),
      onClick: handleReject,
      disabled: isRejecting,
      icon: <XCircle />,
    })
  }

  const groups = []
  if (primaryActions.length) groups.push({ actions: primaryActions })
  if (dangerActions.length) groups.push({ actions: dangerActions })

  if (!groups.length) return null

  return (
    <>
      <ActionMenu groups={groups} />
      <SendQuoteDrawer
        open={sendDrawerOpen}
        onClose={() => setSendDrawerOpen(false)}
        onConfirm={handleSendConfirm}
        isPending={isSending}
      />
    </>
  )
}

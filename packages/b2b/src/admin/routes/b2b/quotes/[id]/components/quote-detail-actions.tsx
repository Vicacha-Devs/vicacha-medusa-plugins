import { Button } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface QuoteDetailActionsProps {
  canSend: boolean
  canReject: boolean
  isAccepted: boolean
  draftOrderId?: string
  isSending: boolean
  isRejecting: boolean
  onViewOrder: () => void
  onReject: () => void
  onOpenSendDrawer: () => void
}

export const QuoteDetailActions = ({
  canSend,
  canReject,
  isAccepted,
  draftOrderId,
  isSending,
  isRejecting,
  onViewOrder,
  onReject,
  onOpenSendDrawer,
}: QuoteDetailActionsProps) => {
  const { t } = useTranslation()

  if (!canSend && !canReject && !isAccepted) {
    return null
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {isAccepted && draftOrderId && (
        <Button size="small" variant="secondary" onClick={onViewOrder}>
          {t("quotes.detail.viewOrder")}
        </Button>
      )}
      {canReject && (
        <Button
          size="small"
          variant="secondary"
          isLoading={isRejecting}
          onClick={onReject}
        >
          {t("quotes.detail.rejectQuote")}
        </Button>
      )}
      {canSend && (
        <Button size="small" isLoading={isSending} onClick={onOpenSendDrawer}>
          {t("quotes.detail.sendQuote")}
        </Button>
      )}
    </div>
  )
}

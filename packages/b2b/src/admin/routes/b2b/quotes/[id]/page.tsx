import { LayoutComposer } from "@medusajs/dashboard/components"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { Button, Text, toast, usePrompt } from "@medusajs/ui"
import { useOrderPreview } from "@medusajs/dashboard/hooks"
import { detailPageDefaultEntries, OrderSummarySection, TwoColumnPageSkeleton } from "@vicacha-devs/medusa-shared-admin/admin"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useQuote, useRejectQuote, useSendQuote } from "../../../../hooks/api"
import { EQuoteStatus } from "../../../../../types"
import { QuoteGeneralSection } from "./components/quote-general-section"
import { QuoteMessagesSection } from "./components/quote-messages-section"
import { QuoteCustomerSection } from "./components/quote-customer-section"
import { QuoteOrderSection } from "./components/quote-order-section"
import { QuoteCompanySection } from "./components/quote-company-section"
import { SendQuoteDrawer } from "../components/send-quote-drawer"

const CUSTOMER_FIELDS =
  "*customer,*customer.employee,*customer.employee.company"

const QuoteDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false)

  const { quote, isPending, isError, error } = useQuote(id!, {
    fields: CUSTOMER_FIELDS,
  })
  const { mutateAsync: sendQuote, isPending: isSending } = useSendQuote(id!)
  const { mutateAsync: rejectQuote, isPending: isRejecting } = useRejectQuote(id!)

  const draftOrderId = (quote as any)?.draft_order_id
  const draftOrderCurrencyCode = (quote as any)?.draft_order?.currency_code

  const {
    order: orderPreview,
    isPending: isPreviewPending,
  } = useOrderPreview(
    draftOrderId!,
    {
      fields: [
        "currency_code",
        "total",
        "discount_total",
        "summary",
        "*shipping_methods",
        "*items",
        "*items.variant",
        "*items.variant.product",
        "*items.actions",
        "*items.detail",
      ].join(","),
    },
    { enabled: !!draftOrderId }
  ) as any

  // Ensure currency_code is always present — the preview endpoint may omit it,
  // so fall back to what the quote already fetched from draft_order.currency_code.
  const order = orderPreview
    ? { ...orderPreview, currency_code: orderPreview.currency_code ?? draftOrderCurrencyCode }
    : orderPreview

  if (isPending || !quote) {
    return <TwoColumnPageSkeleton mainSections={3} sidebarSections={2} />
  }

  if (isError) throw error

  const canSend = [EQuoteStatus.PendingMerchant, EQuoteStatus.CustomerRejected].includes(
    quote.status as EQuoteStatus
  )
  const canReject = [
    EQuoteStatus.PendingMerchant,
    EQuoteStatus.PendingCustomer,
  ].includes(quote.status as EQuoteStatus)
  const isAccepted = quote.status === EQuoteStatus.Accepted

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

  return (
    <div className="flex flex-col gap-4">
      {(canSend || canReject || isAccepted) && (
        <div className="flex items-center justify-end gap-2">
          {isAccepted && draftOrderId && (
            <Button
              size="small"
              variant="secondary"
              onClick={() => navigate(`/orders/${draftOrderId}`)}
            >
              {t("quotes.detail.viewOrder")}
            </Button>
          )}
          {canReject && (
            <Button
              size="small"
              variant="secondary"
              isLoading={isRejecting}
              onClick={handleReject}
            >
              {t("quotes.detail.rejectQuote")}
            </Button>
          )}
          {canSend && (
            <Button size="small" isLoading={isSending} onClick={() => setSendDrawerOpen(true)}>
              {t("quotes.detail.sendQuote")}
            </Button>
          )}
        </div>
      )}

      <LayoutComposer
        widgetsZonePrefix="b2b.quote.details"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        data={quote as any}
        sections={{
          main: (
            <>
              <LayoutComposer.Entry id="QuoteGeneralSection">
                <QuoteGeneralSection quote={quote} />
              </LayoutComposer.Entry>
              {order && !isPreviewPending && (
                <LayoutComposer.Entry id="QuoteOrderSummarySection">
                  <OrderSummarySection order={order as any} plugins={[]} readOnly />
                </LayoutComposer.Entry>
              )}
              <LayoutComposer.Entry id="QuoteMessagesSection">
                <QuoteMessagesSection quote={quote} preview={order} />
              </LayoutComposer.Entry>
              {isAccepted && (
                <LayoutComposer.Entry id="QuoteAcceptedMessage">
                  <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle px-6 py-4">
                    <Text size="small">{t("quotes.detail.acceptedMessage")}</Text>
                  </div>
                </LayoutComposer.Entry>
              )}
              {detailPageDefaultEntries(quote)}
            </>
          ),
          side: (
            <>
              <LayoutComposer.Entry id="QuoteCustomerSection">
                <QuoteCustomerSection quote={quote} />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="QuoteCompanySection">
                <QuoteCompanySection quote={quote} />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="QuoteOrderSection">
                <QuoteOrderSection quote={quote} />
              </LayoutComposer.Entry>
            </>
          ),
        }}
      />

      <SendQuoteDrawer
        open={sendDrawerOpen}
        onClose={() => setSendDrawerOpen(false)}
        onConfirm={handleSendConfirm}
        isPending={isSending}
      />
    </div>
  )
}

const Breadcrumb = ({ id }: { id?: string }) => {
  const { t } = useTranslation()
  const { quote } = useQuote(id ?? "", undefined, { enabled: !!id })
  const displayId = (quote as any)?.draft_order?.display_id
  
  return displayId != null ? `#${displayId}` : id ?? t("quote.title")
}

export const handle = {
  breadcrumb: (match: any) => <Breadcrumb id={match?.params?.id} />,
}

export default QuoteDetail

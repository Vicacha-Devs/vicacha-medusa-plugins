import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, CurrencyInput, Badge, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { useBoldRefund } from "../../hooks/use-bold-refund"

const BoldRefundActionsWidget = ({ data: order }: { data: any }) => {
  const { t } = useTranslation()
  const [refundAmount, setRefundAmount] = useState<number | undefined>(undefined)
  const { mutateAsync: refundPayment, isPending: loading } = useBoldRefund()

  const boldPayment = order?.payment_collections
    ?.flatMap((pc: any) => pc.payments || [])
    ?.find((p: any) => p.provider_id?.startsWith("pp_bold") && p.captured_at)

  if (!boldPayment) {
    return null
  }

  const currencyCode = (
    order?.currency_code ||
    boldPayment?.currency_code ||
    "COP"
  ).toUpperCase()

  const capturedAmount = boldPayment.amount || 0
  const refundedAmount = boldPayment.refunded_amount || 0
  const maxRefundable = capturedAmount - refundedAmount

  if (maxRefundable <= 0) {
    return (
      <Container className="p-4 rounded-lg border bg-card space-y-2">
        <div className="flex items-center justify-between">
          <Heading level="h2" className="text-base font-semibold">
            {t("bold.admin.refund.title")}
          </Heading>
          <Badge color="grey">{t("bold.admin.refund.fully_refunded")}</Badge>
        </div>
        <p className="text-xs text-ui-fg-subtle">
          {t("bold.admin.refund.fully_refunded_desc", {
            amount: capturedAmount.toLocaleString(),
            currency: currencyCode,
          })}
        </p>
      </Container>
    )
  }

  const handleRefund = async () => {
    const numericAmount = Number(refundAmount)

    if (!numericAmount || numericAmount <= 0 || numericAmount > maxRefundable) {
      toast.error(t("bold.admin.refund.invalid_amount_title"), {
        description: t("bold.admin.refund.invalid_amount_desc", {
          max: maxRefundable.toLocaleString(),
          currency: currencyCode,
        }),
      })
      return
    }

    try {
      await refundPayment({
        payment_id: boldPayment.id,
        amount: numericAmount,
      })

      toast.success(t("bold.admin.refund.success_title"), {
        description: t("bold.admin.refund.success_desc", {
          amount: numericAmount.toLocaleString(),
          currency: currencyCode,
        }),
      })

      setRefundAmount(undefined)
      window.location.reload()
    } catch (err: any) {
      toast.error(t("bold.admin.refund.error_title"), {
        description: err.message,
      })
    }
  }

  return (
    <Container className="p-4 rounded-lg border bg-card space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <Heading level="h2" className="text-base font-semibold">
          {t("bold.admin.refund.title")}
        </Heading>
        <Badge color="green">{t("bold.admin.refund.captured")}</Badge>
      </div>

      <div className="flex flex-col gap-y-1.5 text-xs text-ui-fg-subtle">
        <div className="flex items-center justify-between">
          <span>{t("bold.admin.refund.captured_total")}:</span>
          <strong className="text-ui-fg-base font-mono">
            ${capturedAmount.toLocaleString()} {currencyCode}
          </strong>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("bold.admin.refund.remaining")}:</span>
          <strong className="text-ui-fg-base font-mono">
            ${maxRefundable.toLocaleString()} {currencyCode}
          </strong>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <CurrencyInput
          size="small"
          symbol="$"
          code={currencyCode}
          value={refundAmount}
          onValueChange={(val) => setRefundAmount(val ? Number(val) : undefined)}
          placeholder="0"
          disabled={loading}
        />

        <div className="flex justify-end">
          <Button
            size="small"
            variant="secondary"
            isLoading={loading}
            onClick={handleRefund}
            disabled={loading || !refundAmount}
          >
            {t("bold.admin.refund.action")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side",
})

export default BoldRefundActionsWidget

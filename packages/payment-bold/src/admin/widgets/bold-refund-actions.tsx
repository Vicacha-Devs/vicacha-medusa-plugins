// plugins/packages/payment-bold/src/admin/widgets/bold-refund-actions.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Badge, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { useBoldRefund } from "../../hooks/use-bold-refund"

const BoldRefundActionsWidget = ({ data: order }: { data: any }) => {
  const { t } = useTranslation()
  const [refundAmount, setRefundAmount] = useState<string>("")
  const { mutateAsync: refundPayment, isPending: loading } = useBoldRefund()

  const boldPayment = order?.payment_collections
    ?.flatMap((pc: any) => pc.payments || [])
    ?.find((p: any) => p.provider_id?.startsWith("pp_bold") && p.captured_at)

  if (!boldPayment) {
    return null
  }

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
        }),
      })

      setRefundAmount("")
      window.location.reload()
    } catch (err: any) {
      toast.error(t("bold.admin.refund.error_title"), {
        description: err.message,
      })
    }
  }

  const currencyCode = (
    order?.currency_code ||
    boldPayment?.currency_code
  ).toUpperCase()

  return (
    <Container className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between border-b pb-3">
        <Heading level="h2" className="text-base font-semibold">
          {t("bold.admin.refund.title")}
        </Heading>
        <Badge color="green">{t("bold.admin.refund.captured")}</Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-ui-fg-subtle">
        <span>
          {t("bold.admin.refund.captured_total")}:{" "}
          <strong className="text-ui-fg-base">
            ${capturedAmount.toLocaleString()} {currencyCode}
          </strong>
        </span>
        <span>
          {t("bold.admin.refund.remaining")}:{" "}
          <strong className="text-ui-fg-base">
            ${maxRefundable.toLocaleString()} {currencyCode}
          </strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          size="small"
          type="number"
          placeholder={t("bold.admin.refund.placeholder", { currency: currencyCode })}
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          disabled={loading}
        />
        <Button
          size="small"
          variant="secondary"
          isLoading={loading}
          onClick={handleRefund}
        >
          {t("bold.admin.refund.action")}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side",
})

export default BoldRefundActionsWidget

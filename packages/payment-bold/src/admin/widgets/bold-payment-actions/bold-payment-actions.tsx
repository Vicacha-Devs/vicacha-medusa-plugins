import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Container, Heading, toast, Text, Badge } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { useBoldWidgetState } from "./hooks/use-bold-widget-state"
import { BoldTerminalSection } from "./components/bold-terminal-section"
import { BoldPaymentTabs } from "./components/bold-payment-tabs"

export const BoldPaymentActionsWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const { t } = useTranslation()
  const { state, actions } = useBoldWidgetState(order)
  const [activeRemoteTab, setActiveRemoteTab] = useState<"link" | "qr">("link")

  useEffect(() => {
    if (!state.isLinkEnabled && state.isQrEnabled) {
      setActiveRemoteTab("qr")
    } else if (state.isLinkEnabled) {
      setActiveRemoteTab("link")
    }
  }, [state.isLinkEnabled, state.isQrEnabled])

  if (state.isLoadingProviders || !state.hasBoldProviders) {
    return null
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t("bold.admin.widget.toast.copied"))
  }

  return (
    <Container className="p-4 space-y-4">
      {/* Widget Header */}
      <div className="flex items-start justify-between gap-x-2 pb-3 border-b border-ui-border-base">
        <div className="space-y-0.5 min-w-0 flex-1">
          <Heading level="h2" className="text-sm font-semibold text-ui-fg-base truncate">
            {t("bold.admin.widget.title")}
          </Heading>
          <Text className="text-xs text-ui-fg-subtle line-clamp-2">
            {t("bold.admin.widget.description")}
          </Text>
        </div>

        <Badge
          color={state.isApproved ? "green" : "orange"}
          size="small"
          className="whitespace-nowrap shrink-0"
        >
          {state.isApproved
            ? t("bold.admin.widget.approved")
            : state.isPartiallyPaid
            ? t("bold.admin.widget.partially_paid", {
                defaultValue: "Partially Paid",
              })
            : t("bold.admin.widget.processing")}
        </Badge>
      </div>

      {state.isPartiallyPaid && !state.isApproved && (
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-ui-bg-subtle border border-ui-border-base text-xs">
          <span className="text-ui-fg-subtle">
            {t("bold.admin.widget.remaining_balance", {
              defaultValue: "Remaining Balance",
            })}
            :
          </span>
          <strong className="text-ui-fg-base font-mono">
            ${state.payableAmount.toLocaleString()}{" "}
            {(order.currency_code || "COP").toUpperCase()}
          </strong>
        </div>
      )}

      <div className="space-y-4">
        {/* 1. REMOTE PAYMENTS (Tabs for Link vs QR) */}
        {(state.isLinkEnabled || state.isQrEnabled) && (
          <BoldPaymentTabs
            activeTab={activeRemoteTab}
            onTabChange={setActiveRemoteTab}
            state={state}
            actions={actions}
            onCopy={handleCopy}
          />
        )}

        {/* 2. PHYSICAL POS TERMINAL (Permanently visible outside tabs) */}
        {state.isTerminalEnabled && (
          <BoldTerminalSection
            terminalSerial={state.terminalSerial}
            terminalModel={state.terminalModel}
            isApproved={state.isApproved}
            isPushingToPos={state.isPushingToPos}
            onSerialChange={actions.setTerminalSerial}
            onModelChange={actions.setTerminalModel}
            onSubmit={actions.handlePushToPos}
          />
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side",
})

export default BoldPaymentActionsWidget

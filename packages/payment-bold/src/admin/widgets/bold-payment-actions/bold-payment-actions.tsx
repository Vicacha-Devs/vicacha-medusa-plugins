import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Container, Heading, Button, StatusBadge, toast, Input, Text } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

import { CopyIcon, QrCodeIcon } from "../../components/icons"
import { useBoldWidgetState } from "./hooks/use-bold-widget-state"
import { BoldTerminalSection } from "./components/bold-terminal-section"

export const BoldPaymentActionsWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const { t } = useTranslation()
  const { state, actions } = useBoldWidgetState(order)
  const [activeTab, setActiveTab] = useState<"link" | "qr">("link")

  useEffect(() => {
    if (!state.isLinkEnabled && state.isQrEnabled) setActiveTab("qr")
    else if (state.isLinkEnabled) setActiveTab("link")
  }, [state.isLinkEnabled, state.isQrEnabled])

  if (state.isLoadingProviders || !state.hasBoldProviders) {
    return null
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast(t("bold.admin.widget.toast.copied"))
  }

  const hasMultipleRemoteTabs = state.isLinkEnabled && state.isQrEnabled
  const isGeneratingRemote = state.isCreatingLink || state.isCreatingQr

  return (
    <Container className="p-4 space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-ui-border-base">
        <div>
          <Heading level="h2" className="text-sm font-semibold text-ui-fg-base">
            {t("bold.admin.widget.title")}
          </Heading>
          <Text className="text-xs text-ui-fg-subtle">
            {t("bold.admin.widget.description")}
          </Text>
        </div>
        <StatusBadge color={state.isApproved ? "green" : "orange"}>
          {state.isApproved
            ? t("bold.admin.widget.approved").toUpperCase()
            : t("bold.admin.widget.processing").toUpperCase()}
        </StatusBadge>
      </div>

      <div className="space-y-4">
        {/* Remote Payments Section */}
        {(state.isLinkEnabled || state.isQrEnabled) && (
          <div className="border border-ui-border-base rounded-lg p-3 space-y-3 bg-ui-bg-subtle/40">
            {hasMultipleRemoteTabs ? (
              <div className="flex bg-ui-bg-component p-1 rounded-md border border-ui-border-base gap-x-1">
                {state.isLinkEnabled && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("link")}
                    className={`flex-1 flex items-center justify-center gap-x-1.5 text-xs font-medium py-1.5 rounded-md transition-all ${
                      activeTab === "link"
                        ? "bg-ui-bg-base text-ui-fg-base shadow-xs"
                        : "text-ui-fg-subtle hover:text-ui-fg-base"
                    }`}
                  >
                    <ArrowUpRightOnBox className="text-ui-fg-subtle" />
                    <span>{t("bold.admin.widget.link_btn")}</span>
                  </button>
                )}
                {state.isQrEnabled && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("qr")}
                    className={`flex-1 flex items-center justify-center gap-x-1.5 text-xs font-medium py-1.5 rounded-md transition-all ${
                      activeTab === "qr"
                        ? "bg-ui-bg-base text-ui-fg-base shadow-xs"
                        : "text-ui-fg-subtle hover:text-ui-fg-base"
                    }`}
                  >
                    <QrCodeIcon />
                    <span>{t("bold.admin.widget.qr_btn")}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-x-2 font-medium text-xs text-ui-fg-base">
                {state.isLinkEnabled ? <ArrowUpRightOnBox /> : <QrCodeIcon />}
                <span>
                  {state.isLinkEnabled
                    ? t("bold.admin.widget.link_btn")
                    : t("bold.admin.widget.qr_btn")}
                </span>
              </div>
            )}

            {/* Link Mode */}
            {(activeTab === "link" || (!hasMultipleRemoteTabs && state.isLinkEnabled)) && (
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="small"
                  className="w-full flex items-center justify-center gap-x-1.5"
                  isLoading={state.isCreatingLink}
                  onClick={() => actions.handleCreateRemotePayment("link")}
                  disabled={state.isApproved || isGeneratingRemote}
                >
                  <ArrowUpRightOnBox />
                  <span>
                    {state.isApproved
                      ? t("bold.admin.widget.approved")
                      : t("bold.admin.widget.link_btn")}
                  </span>
                </Button>

                {state.paymentLink && (
                  <div className="pt-2 space-y-1">
                    <Text className="text-xs text-ui-fg-subtle">
                      {t("bold.admin.widget.generated_link")}
                    </Text>
                    <div className="flex items-center gap-x-1.5">
                      <Input value={state.paymentLink} readOnly size="small" className="text-xs" />
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => handleCopy(state.paymentLink!)}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QR Mode */}
            {(activeTab === "qr" || (!hasMultipleRemoteTabs && state.isQrEnabled)) && (
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="small"
                  className="w-full flex items-center justify-center gap-x-1.5"
                  isLoading={state.isCreatingQr}
                  onClick={() => actions.handleCreateRemotePayment("qr")}
                  disabled={state.isApproved || isGeneratingRemote}
                >
                  <QrCodeIcon />
                  <span>
                    {state.isApproved
                      ? t("bold.admin.widget.approved")
                      : t("bold.admin.widget.qr_btn")}
                  </span>
                </Button>

                {state.paymentLink && (
                  <div className="p-3 border border-ui-border-base bg-ui-bg-base rounded-md flex flex-col items-center justify-center space-y-2 text-center">
                    <QrCodeIcon />
                    <Text className="text-xs text-ui-fg-subtle font-medium">
                      {t("bold.admin.widget.scan_instruction")}
                    </Text>
                    <div className="flex items-center gap-x-1.5 w-full pt-1">
                      <Input value={state.paymentLink} readOnly size="small" className="text-xs" />
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => handleCopy(state.paymentLink!)}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Extracted POS Datáfono Section */}
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

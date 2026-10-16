import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Tabs } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { QrCodeIcon } from "../../../components/icons"
import { BoldRemotePaymentPanel } from "./bold-remote-payment-panel"

interface BoldPaymentTabsProps {
  activeTab: "link" | "qr"
  onTabChange: (tab: "link" | "qr") => void
  state: {
    paymentLink: string | null
    isApproved: boolean
    isLinkEnabled: boolean
    isQrEnabled: boolean
    isCreatingLink: boolean
    isCreatingQr: boolean
  }
  actions: {
    handleCreateRemotePayment: (mode: "link" | "qr") => void
  }
  onCopy: (text: string) => void
}

export const BoldPaymentTabs = ({
  activeTab,
  onTabChange,
  state,
  actions,
  onCopy,
}: BoldPaymentTabsProps) => {
  const { t } = useTranslation()

  const hasMultipleTabs = state.isLinkEnabled && state.isQrEnabled
  const isGeneratingRemote = state.isCreatingLink || state.isCreatingQr
  const singleMode = state.isLinkEnabled ? "link" : "qr"

  return (
    <div className="border border-ui-border-base rounded-lg p-3 space-y-3 bg-ui-bg-subtle/40">
      {hasMultipleTabs ? (
        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as "link" | "qr")}
          className="w-full space-y-3"
        >
          <Tabs.List className="w-full grid grid-cols-2 gap-1 p-1 bg-ui-bg-subtle rounded-md border border-ui-border-base">
            {state.isLinkEnabled && (
              <Tabs.Trigger
                value="link"
                className="flex items-center justify-center gap-x-1.5 text-xs font-medium py-1.5 rounded-md"
              >
                <ArrowUpRightOnBox className="w-3.5 h-3.5 text-ui-fg-subtle" />
                <span>{t("bold.admin.widget.link_btn")}</span>
              </Tabs.Trigger>
            )}

            {state.isQrEnabled && (
              <Tabs.Trigger
                value="qr"
                className="flex items-center justify-center gap-x-1.5 text-xs font-medium py-1.5 rounded-md"
              >
                <QrCodeIcon className="w-3.5 h-3.5 text-ui-fg-subtle" />
                <span>{t("bold.admin.widget.qr_btn")}</span>
              </Tabs.Trigger>
            )}
          </Tabs.List>

          {state.isLinkEnabled && (
            <Tabs.Content value="link">
              <BoldRemotePaymentPanel
                mode="link"
                isApproved={state.isApproved}
                isLoading={state.isCreatingLink}
                isDisabled={isGeneratingRemote}
                paymentLink={state.paymentLink}
                showPayload={activeTab === "link"}
                onGenerate={() => actions.handleCreateRemotePayment("link")}
                onCopy={onCopy}
              />
            </Tabs.Content>
          )}

          {state.isQrEnabled && (
            <Tabs.Content value="qr">
              <BoldRemotePaymentPanel
                mode="qr"
                isApproved={state.isApproved}
                isLoading={state.isCreatingQr}
                isDisabled={isGeneratingRemote}
                paymentLink={state.paymentLink}
                showPayload={activeTab === "qr"}
                onGenerate={() => actions.handleCreateRemotePayment("qr")}
                onCopy={onCopy}
              />
            </Tabs.Content>
          )}
        </Tabs>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-x-2 font-medium text-xs text-ui-fg-base pb-1">
            {state.isLinkEnabled ? (
              <ArrowUpRightOnBox className="w-4 h-4" />
            ) : (
              <QrCodeIcon className="w-4 h-4" />
            )}
            <span>
              {state.isLinkEnabled
                ? t("bold.admin.widget.link_btn")
                : t("bold.admin.widget.qr_btn")}
            </span>
          </div>

          <BoldRemotePaymentPanel
            mode={singleMode}
            isApproved={state.isApproved}
            isLoading={isGeneratingRemote}
            isDisabled={isGeneratingRemote}
            paymentLink={state.paymentLink}
            showPayload={Boolean(state.paymentLink)}
            onGenerate={() => actions.handleCreateRemotePayment(singleMode)}
            onCopy={onCopy}
          />
        </div>
      )}
    </div>
  )
}

import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Button, Input, Tabs, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { CopyIcon, QrCodeIcon } from "../../../components/icons"

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

          {/* Link Tab Panel */}
          {state.isLinkEnabled && (
            <Tabs.Content value="link" className="space-y-2 pt-1">
              <Button
                variant="secondary"
                size="small"
                className="w-full flex items-center justify-center gap-x-1.5"
                isLoading={state.isCreatingLink}
                onClick={() => actions.handleCreateRemotePayment("link")}
                disabled={state.isApproved || isGeneratingRemote}
              >
                <ArrowUpRightOnBox className="w-4 h-4" />
                <span>
                  {state.isApproved
                    ? t("bold.admin.widget.approved")
                    : t("bold.admin.widget.link_btn")}
                </span>
              </Button>

              {state.paymentLink && activeTab === "link" && (
                <div className="pt-2 space-y-1">
                  <Text className="text-xs text-ui-fg-subtle">
                    {t("bold.admin.widget.generated_link")}
                  </Text>
                  <div className="flex items-center gap-x-1.5">
                    <Input
                      value={state.paymentLink}
                      readOnly
                      size="small"
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => onCopy(state.paymentLink!)}
                    >
                      <CopyIcon />
                    </Button>
                  </div>
                </div>
              )}
            </Tabs.Content>
          )}

          {/* QR Tab Panel */}
          {state.isQrEnabled && (
            <Tabs.Content value="qr" className="space-y-2 pt-1">
              <Button
                variant="secondary"
                size="small"
                className="w-full flex items-center justify-center gap-x-1.5"
                isLoading={state.isCreatingQr}
                onClick={() => actions.handleCreateRemotePayment("qr")}
                disabled={state.isApproved || isGeneratingRemote}
              >
                <QrCodeIcon className="w-4 h-4" />
                <span>
                  {state.isApproved
                    ? t("bold.admin.widget.approved")
                    : t("bold.admin.widget.qr_btn")}
                </span>
              </Button>

              {state.paymentLink && activeTab === "qr" && (
                <div className="p-3 border border-ui-border-base bg-ui-bg-base rounded-md flex flex-col items-center justify-center space-y-2 text-center">
                  <QrCodeIcon className="w-8 h-8 text-ui-fg-subtle" />
                  <Text className="text-xs text-ui-fg-subtle font-medium">
                    {t("bold.admin.widget.scan_instruction")}
                  </Text>
                  <div className="flex items-center gap-x-1.5 w-full pt-1">
                    <Input
                      value={state.paymentLink}
                      readOnly
                      size="small"
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => onCopy(state.paymentLink!)}
                    >
                      <CopyIcon />
                    </Button>
                  </div>
                </div>
              )}
            </Tabs.Content>
          )}
        </Tabs>
      ) : (
        /* Single Remote Option View (No Tab Bar Required) */
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

          <Button
            variant="secondary"
            size="small"
            className="w-full flex items-center justify-center gap-x-1.5"
            isLoading={isGeneratingRemote}
            onClick={() =>
              actions.handleCreateRemotePayment(state.isLinkEnabled ? "link" : "qr")
            }
            disabled={state.isApproved || isGeneratingRemote}
          >
            {state.isLinkEnabled ? <ArrowUpRightOnBox /> : <QrCodeIcon />}
            <span>
              {state.isApproved
                ? t("bold.admin.widget.approved")
                : state.isLinkEnabled
                ? t("bold.admin.widget.link_btn")
                : t("bold.admin.widget.qr_btn")}
            </span>
          </Button>

          {state.paymentLink && (
            <div className="pt-2 space-y-1">
              <Text className="text-xs text-ui-fg-subtle">
                {t("bold.admin.widget.generated_link")}
              </Text>
              <div className="flex items-center gap-x-1.5">
                <Input
                  value={state.paymentLink}
                  readOnly
                  size="small"
                  className="text-xs font-mono"
                />
                <Button
                  variant="transparent"
                  size="small"
                  onClick={() => onCopy(state.paymentLink!)}
                >
                  <CopyIcon />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

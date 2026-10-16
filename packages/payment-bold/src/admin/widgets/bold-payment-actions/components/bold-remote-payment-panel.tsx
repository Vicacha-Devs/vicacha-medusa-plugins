import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Button, Input, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { CopyIcon, QrCodeIcon } from "../../../components/icons"

interface BoldRemotePaymentPanelProps {
  mode: "link" | "qr"
  isApproved: boolean
  isLoading: boolean
  isDisabled: boolean
  paymentLink: string | null
  showPayload: boolean
  onGenerate: () => void
  onCopy: (text: string) => void
}

export const BoldRemotePaymentPanel = ({
  mode,
  isApproved,
  isLoading,
  isDisabled,
  paymentLink,
  showPayload,
  onGenerate,
  onCopy,
}: BoldRemotePaymentPanelProps) => {
  const { t } = useTranslation()

  const isLink = mode === "link"

  return (
    <div className="space-y-2 pt-1">
      <Button
        variant="secondary"
        size="small"
        className="w-full flex items-center justify-center gap-x-1.5"
        isLoading={isLoading}
        onClick={onGenerate}
        disabled={isApproved || isDisabled}
      >
        {isLink ? (
          <ArrowUpRightOnBox className="w-4 h-4" />
        ) : (
          <QrCodeIcon className="w-4 h-4" />
        )}
        <span>
          {isApproved
            ? t("bold.admin.widget.approved")
            : isLink
            ? t("bold.admin.widget.link_btn")
            : t("bold.admin.widget.qr_btn")}
        </span>
      </Button>

      {paymentLink && showPayload && (
        isLink ? (
          <div className="pt-2 space-y-1">
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.widget.generated_link")}
            </Text>
            <div className="flex items-center gap-x-1.5">
              <Input
                value={paymentLink}
                readOnly
                size="small"
                className="text-xs font-mono"
              />
              <Button
                variant="transparent"
                size="small"
                onClick={() => onCopy(paymentLink)}
              >
                <CopyIcon />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 border border-ui-border-base bg-ui-bg-base rounded-md flex flex-col items-center justify-center space-y-2 text-center">
            <QrCodeIcon className="w-8 h-8 text-ui-fg-subtle" />
            <Text className="text-xs text-ui-fg-subtle font-medium">
              {t("bold.admin.widget.scan_instruction")}
            </Text>
            <div className="flex items-center gap-x-1.5 w-full pt-1">
              <Input
                value={paymentLink}
                readOnly
                size="small"
                className="text-xs font-mono"
              />
              <Button
                variant="transparent"
                size="small"
                onClick={() => onCopy(paymentLink)}
              >
                <CopyIcon />
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

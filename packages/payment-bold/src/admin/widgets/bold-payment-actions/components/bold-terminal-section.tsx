import { Button, Input, Select } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { SmartphoneIcon } from "../../../components/icons"

interface BoldTerminalSectionProps {
  terminalSerial: string
  terminalModel: string
  isApproved: boolean
  isPushingToPos: boolean
  onSerialChange: (val: string) => void
  onModelChange: (val: string) => void
  onSubmit: () => void
}

export const BoldTerminalSection = ({
  terminalSerial,
  terminalModel,
  isApproved,
  isPushingToPos,
  onSerialChange,
  onModelChange,
  onSubmit,
}: BoldTerminalSectionProps) => {
  const { t } = useTranslation()

  return (
    <div className="border border-ui-border-base rounded-lg p-3 space-y-3 bg-ui-bg-subtle/40">
      <div className="flex items-center gap-x-2 font-medium text-xs text-ui-fg-base">
        <SmartphoneIcon />
        <span>{t("bold.admin.widget.terminal_btn")}</span>
      </div>
      <div className="space-y-2">
        <Select
          value={terminalModel}
          onValueChange={onModelChange}
          disabled={isApproved || isPushingToPos}
        >
          <Select.Trigger>
            <Select.Value placeholder="Select Model" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="SMART_POS">Smart POS</Select.Item>
            <Select.Item value="NEO">Bold Neo</Select.Item>
          </Select.Content>
        </Select>

        <Input
          size="small"
          placeholder={t("bold.admin.widget.terminal_placeholder")}
          value={terminalSerial}
          onChange={(e) => onSerialChange(e.target.value)}
          disabled={isApproved || isPushingToPos}
        />

        <Button
          variant="secondary"
          size="small"
          className="w-full"
          isLoading={isPushingToPos}
          onClick={onSubmit}
          disabled={isApproved || isPushingToPos}
        >
          {isApproved
            ? t("bold.admin.widget.approved")
            : t("bold.admin.widget.send_to_terminal")}
        </Button>
      </div>
    </div>
  )
}
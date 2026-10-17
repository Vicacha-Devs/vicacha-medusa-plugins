import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Label,
  Select,
  Text,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

export interface ChannelsSideSectionProps {
  smsDriverInput: string
  isPending: boolean
  onSmsDriverChange: (driver: string) => void
  onSaveSms: () => void
}

export const ChannelsSideSection: React.FC<ChannelsSideSectionProps> = ({
  smsDriverInput,
  isPending,
  onSmsDriverChange,
  onSaveSms,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("channels.smsTitle")}</Heading>
          <Text className="text-ui-fg-subtle text-xs mt-1">
            {t("channels.smsSubtitle")}
          </Text>
        </div>
        <Badge size="2xsmall" color="blue">
          {smsDriverInput}
        </Badge>
      </div>

      <SectionRow title={t("channels.smsDriverLabel")} value={smsDriverInput} />

      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div className="flex flex-col gap-y-2">
          <Label size="small">{t("channels.smsDriverLabel")}</Label>
          <Select
            size="small"
            value={smsDriverInput}
            onValueChange={onSmsDriverChange}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="twilio">
                {t("channels.driverTwilio")}
              </Select.Item>
              <Select.Item value="signalhouse">
                {t("channels.driverSignalHouse")}
              </Select.Item>
              <Select.Item value="msg91">
                {t("channels.driverMsg91")}
              </Select.Item>
              <Select.Item value="smsapi">
                {t("channels.driverSmsApi")}
              </Select.Item>
              <Select.Item value="dummy">
                {t("channels.driverDummy")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button
            size="small"
            variant="primary"
            isLoading={isPending}
            onClick={onSaveSms}
          >
            {t("channels.saveSmsButton")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

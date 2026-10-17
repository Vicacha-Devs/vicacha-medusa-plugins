import { Button, Container, Heading, Text, Toaster } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import type { StatusBannerState } from "./constants"

export interface NotificationHeaderBarProps {
  statusBanner?: StatusBannerState | null
  onRefresh: () => void
}

export const NotificationHeaderBar: React.FC<NotificationHeaderBarProps> = ({
  onRefresh,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h1">{t("header.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {t("header.subtitle")}
          </Text>
        </div>

        <div className="flex items-center gap-x-2">
          <Button size="small" variant="secondary" onClick={onRefresh}>
            {t("header.refresh")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

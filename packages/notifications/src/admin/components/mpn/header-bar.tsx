import { Badge, Button, Container, Heading, Select, Text } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { SUPPORTED_UI_LOCALES, type StatusBannerState } from "./constants"

export interface NotificationHeaderBarProps {
  statusBanner: StatusBannerState | null
  onRefresh: () => void
}

export const NotificationHeaderBar: React.FC<NotificationHeaderBarProps> = ({
  statusBanner,
  onRefresh,
}) => {
  const { t, i18n } = useTranslation()

  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").split(
    /[-_]/
  )[0]

  return (
    <Container className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading level="h1">{t("header.title")}</Heading>
          <Text className="text-ui-fg-subtle mt-1">{t("header.subtitle")}</Text>
        </div>

        <div className="flex items-center gap-x-2">
          <div className="w-40">
            <Select
              value={currentLang}
              onValueChange={(lng) => void i18n.changeLanguage(lng)}
            >
              <Select.Trigger aria-label={t("header.languageLabel")}>
                <Select.Value placeholder={t("header.languageLabel")} />
              </Select.Trigger>
              <Select.Content>
                {SUPPORTED_UI_LOCALES.map((loc) => (
                  <Select.Item key={loc.code} value={loc.code}>
                    {loc.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <Button variant="secondary" onClick={onRefresh}>
            {t("header.refresh")}
          </Button>
        </div>
      </div>

      {statusBanner && (
        <div className="mt-4 rounded-md border p-3">
          <Badge color={statusBanner.type === "success" ? "green" : "red"}>
            {statusBanner.type === "success"
              ? t("header.successBadge")
              : t("header.errorBadge")}
          </Badge>
          <Text className="ml-2 inline">{statusBanner.text}</Text>
        </div>
      )}
    </Container>
  )
}

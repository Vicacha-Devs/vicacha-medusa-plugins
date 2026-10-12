import { Badge, Button, Container, Heading, Select, Text } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import { SUPPORTED_UI_LOCALES, type TypesenseNodeInfo } from "./types"

export interface TypesenseHeaderBarProps {
  healthy: boolean
  nodeInfo: TypesenseNodeInfo | null
  loading: boolean
  syncingAll: boolean
  onRefresh: () => void
  onRebuildAll: () => void
}

export const TypesenseHeaderBar: React.FC<TypesenseHeaderBarProps> = ({
  healthy,
  nodeInfo,
  loading,
  syncingAll,
  onRefresh,
  onRebuildAll,
}) => {
  const { t, i18n } = useTranslation()

  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").split(
    /[-_]/
  )[0]

  return (
    <Container className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div>
        <div className="flex items-center gap-x-3">
          <Heading level="h1">{t("header.title")}</Heading>
          <Badge color={healthy ? "green" : "red"}>
            {healthy ? t("header.healthy") : t("header.unreachable")}
          </Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {nodeInfo
            ? t("header.connectedSubtitle", {
                protocol: nodeInfo.protocol,
                host: nodeInfo.host,
                port: nodeInfo.port,
              })
            : t("header.defaultSubtitle")}
        </Text>
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

        <Button
          variant="secondary"
          size="small"
          onClick={onRefresh}
          disabled={loading}
        >
          {t("header.refresh")}
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={onRebuildAll}
          isLoading={syncingAll}
        >
          {t("header.rebuildAll")}
        </Button>
      </div>
    </Container>
  )
}

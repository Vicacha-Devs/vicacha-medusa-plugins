import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Toaster,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import type { TypesenseNodeInfo } from "./types"

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
  const { t } = useTranslation()

  return (
    <>
      <Toaster />
      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="flex items-center gap-x-3">
              <Heading className="font-sans font-medium h1-core">
                {t("header.title")}
              </Heading>
              <StatusBadge color={healthy ? "green" : "red"}>
                {healthy ? t("header.healthy") : t("header.unreachable")}
              </StatusBadge>
              {nodeInfo && (
                <Badge size="xsmall" color="grey">
                  {nodeInfo.protocol}://{nodeInfo.host}:{nodeInfo.port}
                </Badge>
              )}
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
        </div>
      </Container>
    </>
  )
}

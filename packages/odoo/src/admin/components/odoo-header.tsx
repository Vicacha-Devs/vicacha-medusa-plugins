import { ArrowPath } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Toaster,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  OdooProtocolVersion,
  OdooStatusOverview,
} from "../../modules/odoo/types"

export interface OdooHeaderProps {
  overview?: OdooStatusOverview
  protocolFallback: OdooProtocolVersion
  isSyncing: boolean
  onRefresh: () => void
  onSyncAll: () => void
}

export const OdooHeader = ({
  overview,
  protocolFallback,
  isSyncing,
  onRefresh,
  onSyncAll,
}: OdooHeaderProps) => {
  const { t } = useTranslation()

  const statusColor =
    overview?.status === "connected"
      ? "green"
      : overview?.status === "unconfigured"
        ? "orange"
        : "red"

  return (
    <>
      <Toaster />
      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Heading level="h1">{t("header.title")}</Heading>
              <StatusBadge color={statusColor}>
                {overview?.status ?? t("header.statusLoading")}
              </StatusBadge>
              <Badge size="2xsmall" color="blue">
                {t("header.protocolBadge", {
                  protocol: overview?.protocol ?? protocolFallback,
                })}
              </Badge>
              <Badge
                size="2xsmall"
                color={overview?.circuitState === "open" ? "red" : "grey"}
              >
                {t("header.circuitBadge", {
                  state: overview?.circuitState ?? "closed",
                })}
              </Badge>
            </div>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              {t("header.subtitle")}
            </Text>
          </div>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" size="small" onClick={onRefresh}>
              <ArrowPath />
              {t("header.refresh")}
            </Button>
            <Button
              variant="primary"
              size="small"
              isLoading={isSyncing}
              onClick={onSyncAll}
            >
              {t("header.syncAll")}
            </Button>
          </div>
        </div>
      </Container>
    </>
  )
}

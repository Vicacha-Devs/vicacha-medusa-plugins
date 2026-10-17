import { ActionMenu } from "@medusajs/dashboard/components"
import { Badge, Button, StatusBadge, Table, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { LiveSessionRecord } from "../../modules/social-commerce/types/index.js"
import {
  platformBadgeUiColor,
  statusBadgeUiColor,
} from "../utils/formatters.js"

export interface LiveTableProps {
  liveSessions: LiveSessionRecord[]
  onLiveTransition: (sessionId: string, action: "start" | "end") => void
}

export const LiveTable = ({
  liveSessions,
  onLiveTransition,
}: LiveTableProps) => {
  const { t } = useTranslation()

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>
            {t("liveTab.titlePlaceholder")}
          </Table.HeaderCell>
          <Table.HeaderCell>
            {t("accountsTab.columns.platform")}
          </Table.HeaderCell>
          <Table.HeaderCell>
            {t("accountsTab.columns.status")}
          </Table.HeaderCell>
          <Table.HeaderCell />
          <Table.HeaderCell />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {liveSessions.map((session) => (
          <Table.Row key={session.id}>
            <Table.Cell>
              <Text size="small" weight="plus">
                {session.title}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Badge
                size="2xsmall"
                color={platformBadgeUiColor(session.platform)}
              >
                {session.platform}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <StatusBadge color={statusBadgeUiColor(session.status)}>
                {t("liveTab.statusLabel", {
                  status: session.status.toUpperCase(),
                })}
              </StatusBadge>
            </Table.Cell>
            <Table.Cell>
              <Text size="small" className="text-ui-fg-subtle">
                {t("liveTab.statsLine", {
                  peakViewers: session.peak_viewer_count,
                  pinnedCount: (session.products ?? []).length,
                })}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <div className="flex items-center justify-end gap-x-2">
                {session.status === "scheduled" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => onLiveTransition(session.id, "start")}
                  >
                    {t("liveTab.goLiveButton")}
                  </Button>
                ) : null}
                {session.status === "live" ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="small"
                    onClick={() => onLiveTransition(session.id, "end")}
                  >
                    {t("liveTab.endStreamButton")}
                  </Button>
                ) : null}
                <ActionMenu
                  groups={[
                    {
                      actions: [
                        ...(session.status === "scheduled"
                          ? [
                              {
                                label: t("liveTab.goLiveButton"),
                                onClick: () =>
                                  onLiveTransition(session.id, "start"),
                              },
                            ]
                          : []),
                        ...(session.status === "live"
                          ? [
                              {
                                label: t("liveTab.endStreamButton"),
                                onClick: () =>
                                  onLiveTransition(session.id, "end"),
                              },
                            ]
                          : []),
                      ],
                    },
                  ]}
                />
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

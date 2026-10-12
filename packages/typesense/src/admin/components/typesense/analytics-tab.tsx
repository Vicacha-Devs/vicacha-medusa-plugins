import { Button, Heading, Table, Text } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import type { AnalyticsSummary } from "./types"

export interface AnalyticsTabProps {
  analytics: AnalyticsSummary | null
  onAddSynonymForQuery: (query: string) => void
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  analytics,
  onAddSynonymForQuery,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="border-ui-border-base rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.totalSearches")}
          </Text>
          <Heading level="h2">{analytics?.totalSearches ?? 0}</Heading>
        </div>
        <div className="border-ui-border-base rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.noHitRate")}
          </Text>
          <Heading level="h2">{analytics?.noHitRate ?? 0}%</Heading>
        </div>
        <div className="border-ui-border-base rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.clickThroughRate")}
          </Text>
          <Heading level="h2">{analytics?.clickThroughRate ?? 0}%</Heading>
        </div>
        <div className="border-ui-border-base rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.conversionRate")}
          </Text>
          <Heading level="h2">{analytics?.conversionRate ?? 0}%</Heading>
        </div>
        <div className="border-ui-border-base rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.avgLatency")}
          </Text>
          <Heading level="h2">{analytics?.averageLatencyMs ?? 0} ms</Heading>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Heading level="h2" className="mb-2">
            {t("analytics.popularQueriesTitle")}
          </Heading>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("analytics.colQuery")}</Table.HeaderCell>
                <Table.HeaderCell>{t("analytics.colSearches")}</Table.HeaderCell>
                <Table.HeaderCell>{t("analytics.colAvgHits")}</Table.HeaderCell>
                <Table.HeaderCell>{t("analytics.colClicks")}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(analytics?.popularQueries || []).map((pq) => (
                <Table.Row key={pq.query}>
                  <Table.Cell className="font-medium">{pq.query}</Table.Cell>
                  <Table.Cell>{pq.count}</Table.Cell>
                  <Table.Cell>{pq.avgResults}</Table.Cell>
                  <Table.Cell>{pq.clicks}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div>
          <Heading level="h2" className="mb-2">
            {t("analytics.zeroResultTitle")}
          </Heading>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  {t("analytics.colNoHitQuery")}
                </Table.HeaderCell>
                <Table.HeaderCell>{t("analytics.colCount")}</Table.HeaderCell>
                <Table.HeaderCell>{t("analytics.colAction")}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(analytics?.noHitQueries || []).map((nh) => (
                <Table.Row key={nh.query}>
                  <Table.Cell className="font-medium">{nh.query}</Table.Cell>
                  <Table.Cell>{nh.count}</Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => onAddSynonymForQuery(nh.query)}
                    >
                      {t("analytics.addSynonymButton")}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </div>
    </div>
  )
}

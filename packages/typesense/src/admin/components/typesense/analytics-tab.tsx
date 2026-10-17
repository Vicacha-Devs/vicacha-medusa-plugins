import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
} from "@medusajs/ui"
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
    <div className="flex flex-col gap-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Container className="p-5">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.totalSearches")}
          </Text>
          <Heading level="h2" className="mt-2">
            {analytics?.totalSearches ?? 0}
          </Heading>
        </Container>
        <Container className="p-5">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.noHitRate")}
          </Text>
          <Heading level="h2" className="mt-2">
            {analytics?.noHitRate ?? 0}%
          </Heading>
        </Container>
        <Container className="p-5">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.clickThroughRate")}
          </Text>
          <Heading level="h2" className="mt-2">
            {analytics?.clickThroughRate ?? 0}%
          </Heading>
        </Container>
        <Container className="p-5">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.conversionRate")}
          </Text>
          <Heading level="h2" className="mt-2">
            {analytics?.conversionRate ?? 0}%
          </Heading>
        </Container>
        <Container className="p-5">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("analytics.avgLatency")}
          </Text>
          <Heading level="h2" className="mt-2">
            {analytics?.averageLatencyMs ?? 0} ms
          </Heading>
        </Container>
      </div>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{t("tabs.analytics")}</Heading>
        </div>
        <SectionRow
          title={t("analytics.totalSearches")}
          value={String(analytics?.totalSearches ?? 0)}
        />
        <SectionRow
          title={t("analytics.noHitRate")}
          value={
            <Badge
              size="xsmall"
              color={(analytics?.noHitRate ?? 0) > 20 ? "orange" : "green"}
            >
              {analytics?.noHitRate ?? 0}%
            </Badge>
          }
        />
        <SectionRow
          title={t("analytics.avgLatency")}
          value={`${analytics?.averageLatencyMs ?? 0} ms`}
        />
      </Container>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Container className="divide-y p-0 overflow-hidden">
          <div className="px-6 py-4">
            <Heading level="h2">{t("analytics.popularQueriesTitle")}</Heading>
          </div>
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
        </Container>

        <Container className="divide-y p-0 overflow-hidden">
          <div className="px-6 py-4">
            <Heading level="h2">{t("analytics.zeroResultTitle")}</Heading>
          </div>
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
        </Container>
      </div>
    </div>
  )
}

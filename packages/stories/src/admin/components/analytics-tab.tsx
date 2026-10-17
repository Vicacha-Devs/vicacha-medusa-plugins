import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StoriesAnalyticsOverview } from "../../modules/story/types"

export interface AnalyticsTabProps {
  analytics?: StoriesAnalyticsOverview
}

export const AnalyticsFunnelSection = ({ analytics }: AnalyticsTabProps) => {
  const { t } = useTranslation()

  const totalImpressions = analytics?.total_impressions ?? 0
  const hotspotCtrPct =
    totalImpressions > 0
      ? Math.round(
          ((analytics?.total_hotspot_clicks ?? 0) / totalImpressions) * 1000
        ) / 10
      : 0

  const funnelSteps = [
    {
      label: t("analyticsTab.stepImpressions"),
      value: totalImpressions,
      percent: 100,
    },
    {
      label: t("analyticsTab.stepCompletions"),
      value: analytics?.total_completions ?? 0,
      percent: analytics?.overall_completion_rate_pct ?? 0,
    },
    {
      label: t("analyticsTab.stepHotspotClicks"),
      value: analytics?.total_hotspot_clicks ?? 0,
      percent: hotspotCtrPct,
    },
    {
      label: t("analyticsTab.stepAddToCarts"),
      value: analytics?.total_cart_conversions ?? 0,
      percent: analytics?.overall_conversion_rate_pct ?? 0,
    },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("analyticsTab.funnelTitle")}</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {t("analyticsTab.funnelSubtitle")}
          </Text>
        </div>
        <StatusBadge
          color={
            (analytics?.overall_conversion_rate_pct ?? 0) > 0 ? "green" : "grey"
          }
        >
          {t("header.conversionBadge", {
            rate: analytics?.overall_conversion_rate_pct ?? 0,
          })}
        </StatusBadge>
      </div>

      {funnelSteps.map((step) => (
        <SectionRow
          key={step.label}
          title={step.label}
          value={
            <div className="flex items-center gap-x-2">
              <Text size="small" weight="plus">
                {step.value}
              </Text>
              <Badge size="xsmall" color="grey">
                {t("analyticsTab.percentOfImpressions", {
                  percent: step.percent,
                })}
              </Badge>
            </div>
          }
        />
      ))}
    </Container>
  )
}

export const AnalyticsRingBreakdownSection = ({
  analytics,
}: AnalyticsTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("analyticsTab.ringBreakdownTitle")}</Heading>
        <Badge size="xsmall" color="purple">
          {(analytics?.by_group ?? []).length}
        </Badge>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("analyticsTab.colHighlightRing")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colSlides")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colImpressions")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colCompletionRate")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colHotspotClicks")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colAddToCartRate")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colStickerVotes")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(analytics?.by_group ?? []).map((grp) => (
            <Table.Row key={grp.group_id}>
              <Table.Cell className="font-medium">{grp.group_title}</Table.Cell>
              <Table.Cell>{grp.slides_count}</Table.Cell>
              <Table.Cell>{grp.impressions}</Table.Cell>
              <Table.Cell>
                <StatusBadge color={grp.completion_rate_pct >= 50 ? "green" : "grey"}>
                  {grp.completion_rate_pct}% ({grp.completions})
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{grp.hotspot_clicks}</Table.Cell>
              <Table.Cell>
                <StatusBadge color={grp.conversion_rate_pct > 0 ? "green" : "grey"}>
                  {grp.conversion_rate_pct}% ({grp.cart_conversions})
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>{grp.sticker_interactions}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const AnalyticsTopSlidesSection = ({ analytics }: AnalyticsTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("analyticsTab.topSlidesTitle")}</Heading>
        <Badge size="xsmall" color="blue">
          {(analytics?.top_slides ?? []).length}
        </Badge>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("analyticsTab.colSlideTitle")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colHighlightRing")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colImpressions")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colCompletions")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colHotspotClicks")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colAddToCarts")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(analytics?.top_slides ?? []).map((slide) => (
            <Table.Row key={slide.id}>
              <Table.Cell className="font-medium">{slide.title}</Table.Cell>
              <Table.Cell>
                <Badge size="xsmall" color="grey">
                  {slide.group_title ?? t("analyticsTab.unassigned")}
                </Badge>
              </Table.Cell>
              <Table.Cell>{slide.impressions}</Table.Cell>
              <Table.Cell>{slide.completions}</Table.Cell>
              <Table.Cell>{slide.hotspot_clicks}</Table.Cell>
              <Table.Cell>{slide.cart_conversions}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const AnalyticsTab = ({ analytics }: AnalyticsTabProps) => {
  return (
    <div className="flex flex-col gap-y-6">
      <AnalyticsFunnelSection analytics={analytics} />
      <AnalyticsRingBreakdownSection analytics={analytics} />
      <AnalyticsTopSlidesSection analytics={analytics} />
    </div>
  )
}

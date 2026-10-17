import { SectionRow } from "@medusajs/dashboard/components"
import { ArrowPath } from "@medusajs/icons"
import { Badge, Button, Container, Heading, StatusBadge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StoriesAnalyticsOverview } from "../../modules/story/types"

export interface StudioHeaderProps {
  groupsCount: number
  slidesCount: number
  analytics?: StoriesAnalyticsOverview
  onRefresh: () => void
}

export const StudioHeader = ({
  groupsCount,
  slidesCount,
  analytics,
  onRefresh,
}: StudioHeaderProps) => {
  const { t } = useTranslation()
  const conversionRate = analytics?.overall_conversion_rate_pct ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Heading level="h1">{t("header.title")}</Heading>
            <Badge size="xsmall" color="purple">
              {t("header.ringsBadge", { count: groupsCount })}
            </Badge>
            <Badge size="xsmall" color="blue">
              {t("header.slidesBadge", { count: slidesCount })}
            </Badge>
            <StatusBadge color={conversionRate > 0 ? "green" : "grey"}>
              {t("header.conversionBadge", { rate: conversionRate })}
            </StatusBadge>
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
        </div>
      </div>
      <SectionRow
        title={t("analyticsTab.stepImpressions")}
        value={String(analytics?.total_impressions ?? 0)}
      />
      <SectionRow
        title={t("analyticsTab.stepAddToCarts")}
        value={String(analytics?.total_cart_conversions ?? 0)}
      />
    </Container>
  )
}

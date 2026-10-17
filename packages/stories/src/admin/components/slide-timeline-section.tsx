import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Switch,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StorySlideDTO } from "../../modules/story/types"

export interface CanvasTimelineSectionProps {
  slides: StorySlideDTO[]
  selectedSlide: StorySlideDTO | null
  onSelectSlide: (slideId: string) => void
  onToggleSlideActive: (id: string, isActive: boolean) => void
  onDeleteSlide: (id: string) => void
}

export const CanvasTimelineSection = ({
  slides,
  selectedSlide,
  onSelectSlide,
  onToggleSlideActive,
  onDeleteSlide,
}: CanvasTimelineSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("canvasTab.timelineTitle", { count: slides.length })}
        </Heading>
        <Badge size="xsmall" color="blue">
          {slides.length}
        </Badge>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("analyticsTab.colSlideTitle")}</Table.HeaderCell>
            <Table.HeaderCell>{t("canvasTab.activeBadge")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colHotspotClicks")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colImpressions")}</Table.HeaderCell>
            <Table.HeaderCell className="text-right" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {slides.map((s) => {
            const isSelected = selectedSlide?.id === s.id
            return (
              <Table.Row
                key={s.id}
                className={isSelected ? "bg-ui-bg-subtle" : "cursor-pointer"}
                onClick={() => onSelectSlide(s.id)}
              >
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <Text weight="plus">{s.title}</Text>
                    <Badge size="xsmall" color="blue">
                      {t("canvasTab.hotspotsCountBadge", {
                        count: s.hotspots?.length ?? 0,
                      })}
                    </Badge>
                    <Badge size="xsmall" color="purple">
                      {t("canvasTab.stickersCountBadge", {
                        count: s.stickers?.length ?? 0,
                      })}
                    </Badge>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge color={s.is_active ? "green" : "grey"}>
                    {s.is_active
                      ? t("canvasTab.activeBadge")
                      : t("canvasTab.pausedBadge")}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>{s.clicks_count}</Table.Cell>
                <Table.Cell>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("canvasTab.slideMetrics", {
                      views: s.views_count,
                      clicks: s.clicks_count,
                      carts: s.cart_conversions_count,
                    })}
                  </Text>
                </Table.Cell>
                <Table.Cell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-2">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={(checked) =>
                        onToggleSlideActive(s.id, checked)
                      }
                    />
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => onDeleteSlide(s.id)}
                    >
                      {t("canvasTab.deleteButton")}
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </Container>
  )
}

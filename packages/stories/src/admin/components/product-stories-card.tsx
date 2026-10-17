import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  Toaster,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StorySlideDTO } from "../../modules/story/types"

export interface ProductStoriesCardProps {
  productTitle?: string
  taggedSlides: StorySlideDTO[]
  isCreating: boolean
  onQuickCreateProductStory: () => Promise<void>
}

export const ProductStoriesCard = ({
  productTitle,
  taggedSlides,
  isCreating,
  onQuickCreateProductStory,
}: ProductStoriesCardProps) => {
  const { t, i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <Container className="divide-y p-0" dir={isRtl ? "rtl" : "ltr"}>
      <Toaster />
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("widget.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("widget.subtitle", {
              product: productTitle || t("widget.thisProductFallback"),
            })}
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          isLoading={isCreating}
          onClick={() => void onQuickCreateProductStory()}
        >
          {t("widget.createButton")}
        </Button>
      </div>

      <SectionRow
        title={t("analyticsTab.colSlides")}
        value={
          <Badge size="xsmall" color="blue">
            {taggedSlides.length}
          </Badge>
        }
      />

      {taggedSlides.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("widget.emptyState")}
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("analyticsTab.colSlideTitle")}</Table.HeaderCell>
              <Table.HeaderCell>{t("analyticsTab.colImpressions")}</Table.HeaderCell>
              <Table.HeaderCell>{t("analyticsTab.colHotspotClicks")}</Table.HeaderCell>
              <Table.HeaderCell>{t("analyticsTab.colAddToCarts")}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                {t("widget.activeBadge")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {taggedSlides.map((slide) => (
              <Table.Row key={slide.id}>
                <Table.Cell>
                  <div className="flex items-center gap-x-3">
                    <div className="h-9 w-6 overflow-hidden rounded bg-ui-bg-subtle shrink-0">
                      <img
                        src={slide.thumbnail_url || slide.media_url}
                        alt={slide.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Text size="small" weight="plus">
                      {slide.title}
                    </Text>
                  </div>
                </Table.Cell>
                <Table.Cell>{slide.views_count}</Table.Cell>
                <Table.Cell>{slide.clicks_count}</Table.Cell>
                <Table.Cell>{slide.cart_conversions_count}</Table.Cell>
                <Table.Cell className="text-right">
                  <StatusBadge color={slide.is_active ? "green" : "grey"}>
                    {slide.is_active
                      ? t("widget.activeBadge")
                      : t("widget.pausedBadge")}
                  </StatusBadge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StorySlideDTO } from "../../modules/story/types"

export interface StickerActiveListSectionProps {
  selectedSlide: StorySlideDTO | null
  onRemoveSticker?: (stickerId: string) => void
}

export const StickerActiveListSection = ({
  selectedSlide,
  onRemoveSticker,
}: StickerActiveListSectionProps) => {
  const { t } = useTranslation()
  const stickers = selectedSlide?.stickers ?? []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("stickersTab.activeTitle")}</Heading>
        <Badge size="xsmall" color="purple">
          {stickers.length}
        </Badge>
      </div>

      <SectionRow
        title={t("analyticsTab.colStickerVotes")}
        value={String(
          stickers.reduce((acc, s) => acc + (s.total_interactions ?? 0), 0)
        )}
      />

      {stickers.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("stickersTab.emptyState")}
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("stickersTab.promptField")}</Table.HeaderCell>
              <Table.HeaderCell>{t("analyticsTab.colStickerVotes")}</Table.HeaderCell>
              <Table.HeaderCell className="text-right" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {stickers.map((stk) => (
              <Table.Row key={stk.id}>
                <Table.Cell>
                  <div className="flex flex-col gap-y-1 py-1">
                    <Text weight="plus">{stk.prompt}</Text>
                    {stk.options && (
                      <div className="flex flex-wrap gap-1.5">
                        {stk.options.map((opt) => (
                          <Badge key={opt.id} size="xsmall" color="blue">
                            {t("stickersTab.optionVotesBadge", {
                              label: opt.label,
                              votes: opt.votes,
                            })}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {stk.coupon_code && (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {t("stickersTab.couponCodeLabel", {
                          code: stk.coupon_code,
                        })}
                      </Text>
                    )}
                    {stk.countdown_until && (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {t("stickersTab.endsLabel", {
                          date: stk.countdown_until,
                        })}
                      </Text>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="xsmall" color="purple">
                    {t("stickersTab.interactionsBadge", {
                      type: stk.type,
                      count: stk.total_interactions,
                    })}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-right">
                  {onRemoveSticker && (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => onRemoveSticker(stk.id)}
                    >
                      {t("stickersTab.removeButton")}
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

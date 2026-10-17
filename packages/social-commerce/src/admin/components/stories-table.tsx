import { Badge, Table, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { SocialMediaPostRecord } from "../../modules/social-commerce/types/index.js"
import { platformBadgeUiColor } from "../utils/formatters.js"

export interface StoriesTableProps {
  stories: SocialMediaPostRecord[]
}

export const StoriesTable = ({ stories }: StoriesTableProps) => {
  const { t } = useTranslation()

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>
            {t("accountsTab.columns.platform")}
          </Table.HeaderCell>
          <Table.HeaderCell>
            {t("storiesTab.titlePlaceholder")}
          </Table.HeaderCell>
          <Table.HeaderCell>{t("storiesTab.durationAria")}</Table.HeaderCell>
          <Table.HeaderCell>
            {t("accountsTab.columns.expiresAt")}
          </Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {stories.map((story) => (
          <Table.Row key={story.id}>
            <Table.Cell>
              <Badge
                size="2xsmall"
                color={platformBadgeUiColor(story.platform)}
              >
                {story.platform}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text size="small" weight="plus">
                {story.caption ?? t("storiesTab.untitledStory")}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="small" className="text-ui-fg-subtle">
                {t("storiesTab.durationMeta", {
                  platform: story.platform.toUpperCase(),
                  seconds: story.duration ?? 15,
                })}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="small" className="text-ui-fg-subtle">
                {t("storiesTab.expiresLabel", {
                  date: story.expires_at
                    ? String(story.expires_at)
                    : t("storiesTab.neverExpires"),
                })}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

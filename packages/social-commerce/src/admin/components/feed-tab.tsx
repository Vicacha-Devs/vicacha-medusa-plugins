import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { SocialMediaPostRecord } from "../../modules/social-commerce/types/index.js"
import { platformBadgeUiColor, sanitizeClientUrl } from "../utils/formatters.js"

export interface FeedTabProps {
  posts: SocialMediaPostRecord[]
}

export const FeedTab = ({ posts }: FeedTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("tabs.feed", { count: posts.length })}</Heading>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <Container key={post.id} className="flex flex-col gap-y-3 p-4">
            <div className="flex items-center justify-between">
              <Badge
                size="2xsmall"
                color={platformBadgeUiColor(post.platform)}
              >
                {post.platform} • {post.media_type}
              </Badge>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t("feedTab.taggedProducts", {
                  count: (post.tagged_products ?? []).length,
                })}
              </Text>
            </div>

            <Heading level="h3">
              {post.caption ?? post.platform_post_id}
            </Heading>

            {post.permalink ? (
              <a
                href={sanitizeClientUrl(post.permalink)}
                target="_blank"
                rel="noopener noreferrer"
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
              >
                {t("feedTab.viewOriginalPost")}
              </a>
            ) : null}
          </Container>
        ))}
      </div>
    </Container>
  )
}


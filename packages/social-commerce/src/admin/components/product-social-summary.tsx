import { useEffect } from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Container,
  Heading,
  Skeleton,
  StatusBadge,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  CatalogSyncItemRecord,
  SocialMediaPostRecord,
} from "../../modules/social-commerce/types/index.js"
import {
  platformBadgeUiColor,
  statusBadgeUiColor,
} from "../utils/formatters.js"

export interface ProductSocialSummaryProps {
  title?: string
  taggedPosts: SocialMediaPostRecord[]
  catalogStatus: CatalogSyncItemRecord[]
  loading: boolean
  errorMessage?: string | null
}

export const ProductSocialSummary = ({
  title,
  taggedPosts,
  catalogStatus,
  loading,
  errorMessage,
}: ProductSocialSummaryProps) => {
  const { t, i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage)
    }
  }, [errorMessage])

  return (
    <Container className="divide-y p-0" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{title ?? t("widget.title")}</Heading>
      </div>

      {loading ? (
        <div className="flex flex-col gap-y-2 px-6 py-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
      ) : (
        <>
          <SectionRow
            title={t("widget.taggedHeading", { count: taggedPosts.length })}
            value={
              taggedPosts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {taggedPosts.map((post) => (
                    <Badge
                      key={post.id}
                      size="2xsmall"
                      color={platformBadgeUiColor(post.platform)}
                    >
                      {post.platform}: {post.caption ?? post.media_type}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Text size="small" className="text-ui-fg-subtle">
                  {t("widget.none")}
                </Text>
              )
            }
          />

          <SectionRow
            title={t("widget.catalogStatusHeading")}
            value={
              catalogStatus.length === 0 ? (
                <Text size="small" className="text-ui-fg-subtle">
                  {t("widget.notSyncedYet")}
                </Text>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {catalogStatus.map((c) => (
                    <StatusBadge
                      key={c.id}
                      color={statusBadgeUiColor(c.sync_status)}
                    >
                      {c.platform}: {c.sync_status}
                    </StatusBadge>
                  ))}
                </div>
              )
            }
          />
        </>
      )}
    </Container>
  )
}


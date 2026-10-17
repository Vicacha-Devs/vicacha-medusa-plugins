import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  CatalogSyncItemRecord,
  SocialMediaPostRecord,
} from "../../modules/social-commerce/types/index.js"

/**
 * Decoupled data-fetching hook for the Product Detail Social Commerce Widget.
 */
export const useProductSocialStatus = (productId: string | undefined) => {
  const { t } = useTranslation()
  const [taggedPosts, setTaggedPosts] = useState<SocialMediaPostRecord[]>([])
  const [catalogStatus, setCatalogStatus] = useState<CatalogSyncItemRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return

    let isMounted = true
    const fetchWidgetData = async () => {
      setLoading(true)
      setErrorMessage(null)
      try {
        const [feedRes, catRes] = await Promise.all([
          fetch(
            `/store/social/feed?product_id=${encodeURIComponent(productId)}`,
            { credentials: "include" }
          ),
          fetch(
            `/admin/social/catalog?medusa_product_id=${encodeURIComponent(productId)}`,
            { credentials: "include" }
          ),
        ])

        if (isMounted && feedRes.ok) {
          const feedJson = (await feedRes.json()) as {
            posts?: SocialMediaPostRecord[]
          }
          setTaggedPosts(feedJson.posts ?? [])
        }
        if (isMounted && catRes.ok) {
          const catJson = (await catRes.json()) as {
            items?: CatalogSyncItemRecord[]
          }
          setCatalogStatus(catJson.items ?? [])
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : t("messages.loadWidgetError")
          )
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchWidgetData()
    return () => {
      isMounted = false
    }
  }, [productId, t])

  return {
    taggedPosts,
    catalogStatus,
    loading,
    errorMessage,
  }
}


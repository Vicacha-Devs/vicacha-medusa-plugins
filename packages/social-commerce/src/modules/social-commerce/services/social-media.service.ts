import { randomUUID } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"
import { sanitizeHttpUrl } from "../utils/security"
import type {
  CreateLocalStoryInput,
  MediaType,
  PostStatus,
  SocialAccountRecord,
  SocialMediaPostRecord,
  SocialPlatform,
  SocialPlatformProvider,
  SocialProductTagRecord,
  SyncAccountMediaOptions,
  TagProductInput,
} from "../types/index"
import type { SocialCommerceRepository } from "./social-commerce.repository"
import type { SocialAccountService } from "./social-account.service"

/**
 * Handles multi-network Media & Ephemeral Stories synchronization, local stories,
 * and product/variant timestamp & hotspot tagging.
 */
export class SocialMediaService {
  private readonly repo: SocialCommerceRepository
  private readonly accountService: SocialAccountService
  private readonly resolveProvider: (platform: SocialPlatform) => SocialPlatformProvider

  constructor(
    repo: SocialCommerceRepository,
    accountService: SocialAccountService,
    resolveProvider: (platform: SocialPlatform) => SocialPlatformProvider
  ) {
    this.repo = repo
    this.accountService = accountService
    this.resolveProvider = resolveProvider
  }

  /**
   * Upserts a normalized provider post/story into `SocialMediaPost`.
   */
  async upsertFetchedPost(
    account: SocialAccountRecord,
    item: Awaited<ReturnType<SocialPlatformProvider["fetchMediaPosts"]>>["posts"][number]
  ): Promise<{ post: SocialMediaPostRecord; created: boolean }> {
    const existing = await this.repo.listPosts({
      platform: account.platform,
      platform_post_id: item.platform_post_id,
    })

    if (existing.length > 0) {
      const updated = await this.repo.updatePost(existing[0].id, {
        caption: item.caption,
        media_url: item.media_url,
        thumbnail_url: item.thumbnail_url,
        permalink: item.permalink,
        duration: item.duration,
        view_count: item.view_count,
        views_count: item.view_count,
        like_count: item.like_count,
        likes_count: item.like_count,
        comment_count: item.comment_count,
        comments_count: item.comment_count,
        share_count: item.share_count,
        shares_count: item.share_count,
        expires_at: item.expires_at,
        synced_at: new Date(),
        metadata: {
          ...(existing[0].metadata ?? {}),
          ...(item.metadata ?? {}),
        },
      })
      return { post: updated, created: false }
    }

    const created = await this.repo.createPost({
      social_account_id: account.id,
      account_id: account.id,
      platform: account.platform,
      platform_post_id: item.platform_post_id,
      external_id: item.platform_post_id,
      media_type: item.media_type,
      caption: item.caption,
      media_url: item.media_url,
      thumbnail_url: item.thumbnail_url,
      permalink: item.permalink,
      duration: item.duration,
      view_count: item.view_count,
      views_count: item.view_count,
      like_count: item.like_count,
      likes_count: item.like_count,
      comment_count: item.comment_count,
      comments_count: item.comment_count,
      share_count: item.share_count,
      shares_count: item.share_count,
      published_at: item.published_at,
      expires_at: item.expires_at,
      is_shoppable: false,
      is_featured: false,
      sort_order: 0,
      author_name:
        item.author_name ?? account.display_name ?? account.platform_username,
      author_avatar_url: item.author_avatar_url ?? account.avatar_url,
      cta_text: null,
      cta_url: null,
      status: "active",
      synced_at: new Date(),
      metadata: item.metadata,
    })

    return { post: created, created: true }
  }

  /**
   * Syncs both permanent feed media (`video`, `reel`, `image`, `carousel`) and
   * 24h ephemeral stories (`story`) from a connected social account into `SocialMediaPost`.
   * Supports multi-page cursor pagination when `options.fetchAllPages` is enabled.
   */
  async syncAccountMedia(
    accountId: string,
    options?: SyncAccountMediaOptions
  ): Promise<{
    account_id: string
    platform: SocialPlatform
    synced_posts: number
    synced_stories: number
    synced_count: number
    created_count: number
    updated_count: number
    synced: number
    created: number
    updated: number
    posts: SocialMediaPostRecord[]
  }> {
    const { account, accessToken } =
      await this.accountService.getDecryptedAccountWithToken(accountId)
    const provider = this.resolveProvider(account.platform)

    const fetchedFeed: Awaited<ReturnType<typeof provider.fetchMediaPosts>>["posts"] =
      []
    const maxPages = options?.fetchAllPages
      ? Math.max(1, options?.maxPages ?? 10)
      : 1
    let currentCursor: string | undefined = options?.cursor
    let pageCount = 0

    while (pageCount < maxPages) {
      const pageResult = await provider.fetchMediaPosts(accessToken, {
        limit: options?.limit ?? 25,
        cursor: currentCursor,
        platformUserId: account.platform_user_id,
      })
      fetchedFeed.push(...pageResult.posts)
      pageCount += 1

      if (
        !options?.fetchAllPages ||
        !pageResult.nextCursor ||
        pageResult.posts.length === 0
      ) {
        break
      }
      currentCursor = pageResult.nextCursor
    }

    const includeStories = options?.includeStories !== false
    const fetchedStories =
      includeStories && typeof provider.fetchStories === "function"
        ? await provider.fetchStories(accessToken, {
            platformUserId: account.platform_user_id,
          })
        : []

    const combined = [...fetchedFeed, ...fetchedStories]
    const savedPosts: SocialMediaPostRecord[] = []
    let syncedPostsCount = 0
    let syncedStoriesCount = 0
    let createdCount = 0
    let updatedCount = 0

    for (const item of combined) {
      const { post, created } = await this.upsertFetchedPost(account, item)
      savedPosts.push(post)
      if (created) {
        createdCount += 1
      } else {
        updatedCount += 1
      }

      if (item.media_type === "story") {
        syncedStoriesCount += 1
      } else {
        syncedPostsCount += 1
      }
    }

    await this.repo.updateAccount(account.id, {
      last_synced_at: new Date(),
    })

    const totalSynced = syncedPostsCount + syncedStoriesCount
    return {
      account_id: account.id,
      platform: account.platform,
      synced_posts: syncedPostsCount,
      synced_stories: syncedStoriesCount,
      synced_count: totalSynced,
      created_count: createdCount,
      updated_count: updatedCount,
      synced: totalSynced,
      created: createdCount,
      updated: updatedCount,
      posts: savedPosts,
    }
  }

  /**
   * Syncs media & stories across all active connected social accounts.
   */
  async syncAllAccountsMedia(options?: {
    platform?: SocialPlatform
    includeStories?: boolean
  }): Promise<{
    accounts_synced: number
    total_posts: number
    total_stories: number
    errors: Array<{ account_id: string; error: string }>
  }> {
    const filters: Record<string, unknown> = { status: "active" }
    if (options?.platform) {
      filters.platform = options.platform
    }

    const accounts = await this.repo.listAccounts(filters)
    let accountsSynced = 0
    let totalPosts = 0
    let totalStories = 0
    const errors: Array<{ account_id: string; error: string }> = []

    for (const acc of accounts) {
      if (acc.platform === "local") continue
      try {
        const res = await this.syncAccountMedia(acc.id, {
          includeStories: options?.includeStories,
        })
        accountsSynced += 1
        totalPosts += res.synced_posts
        totalStories += res.synced_stories
      } catch (err) {
        errors.push({
          account_id: acc.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return {
      accounts_synced: accountsSynced,
      total_posts: totalPosts,
      total_stories: totalStories,
      errors,
    }
  }

  /**
   * Creates a manual on-site ephemeral story (`platform: "local"`, `media_type: "story"`),
   * providing a full superset of `@bambiste/medusa-stories` with optional product hotspot tags.
   */
  async publishLocalStory(
    input: CreateLocalStoryInput
  ): Promise<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }> {
    const safeMediaUrl = sanitizeHttpUrl(input.media_url)
    if (!safeMediaUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A valid http/https media_url is required to create a story."
      )
    }

    const safeThumb = input.thumbnail_url ? sanitizeHttpUrl(input.thumbnail_url) : null
    const safeCtaUrl = input.cta_url ? sanitizeHttpUrl(input.cta_url) : null
    const safeAvatarUrl = input.author_avatar_url
      ? sanitizeHttpUrl(input.author_avatar_url)
      : null

    let expiresAt: Date | null = null
    if (input.expires_at !== undefined) {
      expiresAt = input.expires_at ? new Date(input.expires_at) : null
    } else {
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000)
    }

    const post = await this.repo.createPost({
      social_account_id: null,
      platform: "local",
      platform_post_id: `local_story_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      media_type: "story",
      caption: input.caption ?? null,
      media_url: safeMediaUrl,
      thumbnail_url: safeThumb,
      permalink: null,
      duration: input.duration ?? 5,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      published_at: new Date(),
      expires_at: expiresAt,
      is_shoppable: Boolean(input.product_tags && input.product_tags.length > 0),
      is_featured: Boolean(input.is_featured),
      sort_order: typeof input.sort_order === "number" ? input.sort_order : 0,
      author_name: input.author_name?.trim() || "Store Highlights",
      author_avatar_url: safeAvatarUrl,
      cta_text: input.cta_text?.trim() || null,
      cta_url: safeCtaUrl,
      status: input.status ?? "active",
      metadata: input.metadata ?? null,
    })

    let taggedProducts: SocialProductTagRecord[] = []
    if (Array.isArray(input.product_tags) && input.product_tags.length > 0) {
      taggedProducts = await this.tagProductsOnPost(post.id, input.product_tags, true)
    }

    const refreshed = (await this.repo.retrievePost(post.id)) ?? post
    return {
      ...refreshed,
      tagged_products: taggedProducts,
    }
  }

  /**
   * Lists unified media posts (videos, reels, stories, images, carousels) with tagged products.
   */
  async listMediaPosts(filters?: {
    platform?: SocialPlatform
    media_type?: MediaType
    status?: PostStatus
    is_shoppable?: boolean
    is_featured?: boolean
    include_expired?: boolean
    limit?: number
    offset?: number
  }): Promise<{
    posts: Array<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }>
    count: number
  }> {
    const queryFilters: Record<string, unknown> = {}
    if (filters?.platform) queryFilters.platform = filters.platform
    if (filters?.media_type) queryFilters.media_type = filters.media_type
    if (filters?.status) queryFilters.status = filters.status
    if (filters?.is_shoppable !== undefined) {
      queryFilters.is_shoppable = filters.is_shoppable
    }
    if (filters?.is_featured !== undefined) {
      queryFilters.is_featured = filters.is_featured
    }

    const allPosts = await this.repo.listPosts(queryFilters)
    const nowMs = Date.now()

    const filtered = allPosts.filter((p) => {
      if (!filters?.include_expired && p.expires_at) {
        const exp = new Date(p.expires_at).getTime()
        if (exp <= nowMs) return false
      }
      return true
    })

    filtered.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0
      return timeB - timeA
    })

    const offset = Math.max(0, filters?.offset ?? 0)
    const limit = Math.max(1, Math.min(100, filters?.limit ?? 24))
    const page = filtered.slice(offset, offset + limit)

    const enriched = await Promise.all(
      page.map(async (post) => {
        const tags = await this.repo.listTags({ social_media_post_id: post.id })
        return {
          ...post,
          tagged_products: tags,
        }
      })
    )

    return {
      posts: enriched,
      count: filtered.length,
    }
  }

  /**
   * Lists currently active, non-expired stories (`media_type === "story"`, `status === "active"`)
   * across Instagram, Facebook, TikTok, and local Admin stories.
   */
  async listActiveStories(
    filters?: {
      platform?: SocialPlatform
      is_featured?: boolean
      limit?: number
    },
    nowMs: number = Date.now()
  ): Promise<
    Array<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }>
  > {
    const queryFilters: Record<string, unknown> = {
      media_type: "story",
      status: "active",
    }
    if (filters?.platform) queryFilters.platform = filters.platform
    if (filters?.is_featured !== undefined) {
      queryFilters.is_featured = filters.is_featured
    }

    const stories = await this.repo.listPosts(queryFilters)
    const active = stories.filter((s) => {
      if (!s.expires_at) return true
      return new Date(s.expires_at).getTime() > nowMs
    })

    active.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0
      return timeB - timeA
    })

    const limit = filters?.limit ? Math.max(1, Math.min(100, filters.limit)) : 50
    const sliced = active.slice(0, limit)

    return Promise.all(
      sliced.map(async (story) => {
        const tags = await this.repo.listTags({ social_media_post_id: story.id })
        return {
          ...story,
          tagged_products: tags,
        }
      })
    )
  }

  /**
   * Retrieves a single `SocialMediaPost` with its tagged products.
   */
  async getMediaPostWithTags(
    postId: string
  ): Promise<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }> {
    const post = await this.repo.retrievePost(postId)
    if (!post) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }
    const tags = await this.repo.listTags({ social_media_post_id: post.id })
    return {
      ...post,
      tagged_products: tags,
    }
  }

  /**
   * Updates a `SocialMediaPost` or local story (`caption`, `status`, `is_featured`, `sort_order`, `expires_at`, etc.).
   */
  async modifyMediaPost(
    postId: string,
    patch: Partial<
      Pick<
        SocialMediaPostRecord,
        | "caption"
        | "media_url"
        | "thumbnail_url"
        | "status"
        | "is_featured"
        | "sort_order"
        | "expires_at"
        | "author_name"
        | "author_avatar_url"
        | "cta_text"
        | "cta_url"
        | "metadata"
      >
    >
  ): Promise<SocialMediaPostRecord> {
    const existing = await this.repo.retrievePost(postId)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }
    return this.repo.updatePost(postId, patch)
  }

  /**
   * Deletes a `SocialMediaPost` and its associated `SocialProductTag` rows.
   */
  async purgeMediaPost(postId: string): Promise<{ id: string; deleted: boolean }> {
    const existing = await this.repo.retrievePost(postId)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }

    const tags = await this.repo.listTags({ social_media_post_id: postId })
    for (const tag of tags) {
      await this.repo.deleteTag(tag.id)
    }
    await this.repo.deletePost(postId)
    return { id: postId, deleted: true }
  }

  /**
   * Tags Medusa products/variants onto a `SocialMediaPost` with optional video
   * timestamps (`timestamp_seconds`) or image/story coordinates (`position_x`, `position_y`).
   */
  async tagProductsOnPost(
    postId: string,
    tags: TagProductInput[],
    replaceExisting: boolean = false
  ): Promise<SocialProductTagRecord[]> {
    const post = await this.repo.retrievePost(postId)
    if (!post) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }

    if (!Array.isArray(tags)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "tags must be an array of product tag definitions."
      )
    }

    for (const tag of tags) {
      if (!tag.product_id?.trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Each product tag requires a non-empty product_id."
        )
      }
      const ts = tag.timestamp_seconds ?? tag.video_timestamp
      const posX = tag.position_x ?? tag.coordinates?.x
      const posY = tag.position_y ?? tag.coordinates?.y
      if (ts !== undefined && ts !== null && (!Number.isFinite(ts) || ts < 0)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "timestamp_seconds must be a non-negative number."
        )
      }
      if (
        posX !== undefined &&
        posX !== null &&
        (!Number.isFinite(posX) || posX < 0 || posX > 100)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "position_x must be a percentage between 0 and 100."
        )
      }
      if (
        posY !== undefined &&
        posY !== null &&
        (!Number.isFinite(posY) || posY < 0 || posY > 100)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "position_y must be a percentage between 0 and 100."
        )
      }
    }

    if (replaceExisting) {
      const existingTags = await this.repo.listTags({ social_media_post_id: postId })
      for (const existing of existingTags) {
        await this.repo.deleteTag(existing.id)
      }
    }

    for (const tag of tags) {
      const ts = tag.timestamp_seconds ?? tag.video_timestamp ?? null
      const posX = tag.position_x ?? tag.coordinates?.x ?? null
      const posY = tag.position_y ?? tag.coordinates?.y ?? null
      const coordinates =
        tag.coordinates ??
        (typeof posX === "number" && typeof posY === "number"
          ? { x: posX, y: posY }
          : null)

      await this.repo.createTag({
        social_media_post_id: postId,
        post_id: postId,
        product_id: tag.product_id.trim(),
        variant_id: tag.variant_id?.trim() || null,
        timestamp_seconds: typeof ts === "number" ? ts : null,
        video_timestamp: typeof ts === "number" ? ts : null,
        position_x: typeof posX === "number" ? posX : null,
        position_y: typeof posY === "number" ? posY : null,
        coordinates,
        label: tag.label?.trim() || null,
        is_featured: Boolean(tag.is_featured),
        metadata: tag.metadata ?? null,
      })
    }

    const allTags = await this.repo.listTags({ social_media_post_id: postId })
    await this.repo.updatePost(postId, {
      is_shoppable: allTags.length > 0,
    })

    return allTags
  }

  /**
   * Lists all posts and stories where a given Medusa `product_id` is tagged.
   */
  async listPostsForProduct(productId: string): Promise<
    Array<{
      post: SocialMediaPostRecord
      tag: SocialProductTagRecord
    }>
  > {
    if (!productId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required."
      )
    }
    const tags = await this.repo.listTags({ product_id: productId.trim() })
    const results: Array<{ post: SocialMediaPostRecord; tag: SocialProductTagRecord }> = []

    for (const tag of tags) {
      const post = await this.repo.retrievePost(tag.social_media_post_id)
      if (post) {
        results.push({ post, tag })
      }
    }
    return results
  }
}

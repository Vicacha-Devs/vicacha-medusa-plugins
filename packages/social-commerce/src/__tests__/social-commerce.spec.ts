import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  accountConnectedWorkflow,
  adminI18n,
  CatalogFeedService,
  computeHmacSha256Hex,
  createPkceChallenge,
  createSignedOAuthState,
  createSocialCommerceHooks,
  createSocialCommerceSDK,
  CreateLocalStorySchema,
  decryptToken,
  encryptToken,
  escapeCsvField,
  escapeXml,
  initialAccountSyncStep,
  InventoryReservationService,
  MedusaError,
  MetaGraphProvider,
  MetaProvider,
  parseWithMedusaError,
  ReserveLiveStockSchema,
  resolveSocialCommerceService,
  sanitizeHttpUrl,
  SOCIAL_COMMERCE_LEGACY_MODULE,
  SocialCommerceService,
  SUPPORTED_UI_LOCALES,
  TagProductsOnPostSchema,
  TikTokProvider,
  verifySignedOAuthState,
  verifyWebhookHmacSha256,
} from "../index.js"
import { POST as connectPost } from "../api/admin/social/connect/route.js"
import { GET as oauthCallbackGet } from "../api/social/oauth/callback/route.js"
import { GET as storeStoriesGet } from "../api/store/social/stories/route.js"
import { GET as storeFeedGet } from "../api/store/social/feed/route.js"
import { GET as storeCatalogFeedGet } from "../api/store/social/catalog-feed/route.js"
import { POST as webhookPost } from "../api/webhooks/social/[platform]/route.js"
import { POST as tiktokWebhookPost } from "../api/webhooks/tiktok/route.js"
import type { HttpRequest, HttpResponse } from "../api/middlewares.js"
import { config as socialRouteConfig } from "../admin/routes/social-commerce/page.js"
import { config as socialWidgetConfig } from "../admin/widgets/product-social-widget.js"

const TEST_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

const createMockFetch = (): typeof fetch => {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()

    // TikTok OAuth token exchange / refresh
    if (url.includes("open.tiktokapis.com/v2/oauth/token")) {
      return new Response(
        JSON.stringify({
          data: {
            access_token: "tt_access_token_123",
            refresh_token: "tt_refresh_token_456",
            open_id: "tt_open_id_789",
            scope: "user.info.basic,video.list",
            expires_in: 86400,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // TikTok user profile
    if (url.includes("open.tiktokapis.com/v2/user/info")) {
      return new Response(
        JSON.stringify({
          data: {
            user: {
              open_id: "tt_open_id_789",
              username: "medusa_tiktok_shop",
              display_name: "Medusa TikTok Shop",
              avatar_url: "https://cdn.example.com/tt-avatar.jpg",
              follower_count: 42500,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // TikTok video list
    if (url.includes("open.tiktokapis.com/v2/video/list")) {
      return new Response(
        JSON.stringify({
          data: {
            videos: [
              {
                id: "tt_vid_001",
                title: "Summer Drop Lookbook #tiktokmademebuyit",
                video_description: "Shop our linen collection now",
                cover_image_url: "https://cdn.example.com/tt-cover-1.jpg",
                share_url:
                  "https://www.tiktok.com/@medusa_tiktok_shop/video/tt_vid_001",
                embed_link: "https://www.tiktok.com/embed/v2/tt_vid_001",
                duration: 28,
                create_time: 1728000000,
                view_count: 15000,
                like_count: 2300,
                comment_count: 140,
                share_count: 85,
              },
            ],
            cursor: 0,
            has_more: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // TikTok Shop catalog batch upload
    if (url.includes("open.tiktokapis.com/v2/shop/catalog")) {
      return new Response(
        JSON.stringify({
          data: {
            synced_ids: ["var_01"],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Meta OAuth token exchange
    if (
      url.includes("graph.facebook.com") &&
      url.includes("/oauth/access_token")
    ) {
      return new Response(
        JSON.stringify({
          access_token: "meta_long_lived_token_abc",
          token_type: "bearer",
          expires_in: 5184000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Meta Pages discovery
    if (url.includes("/me/accounts")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "fb_page_101",
              name: "Medusa Flagship Store",
              access_token: "fb_page_token_xyz",
              fan_count: 18900,
              picture: {
                data: { url: "https://cdn.example.com/fb-page.jpg" },
              },
              instagram_business_account: {
                id: "ig_biz_202",
                username: "medusa.official",
                profile_picture_url: "https://cdn.example.com/ig-profile.jpg",
                followers_count: 68400,
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Instagram Stories endpoint
    if (url.includes("/ig_biz_202/stories")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "ig_story_901",
              caption: "24h Flash Drop Story!",
              media_type: "STORY",
              media_url: "https://cdn.example.com/ig-story-901.mp4",
              thumbnail_url: "https://cdn.example.com/ig-story-901-thumb.jpg",
              permalink:
                "https://www.instagram.com/stories/medusa.official/901/",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Instagram Media feed (Reels, Images, Carousels)
    if (url.includes("/ig_biz_202/media")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "ig_reel_501",
              caption: "Behind the scenes of our new sneaker drop",
              media_type: "REELS",
              media_product_type: "REELS",
              media_url: "https://cdn.example.com/ig-reel-501.mp4",
              thumbnail_url: "https://cdn.example.com/ig-reel-501.jpg",
              permalink: "https://www.instagram.com/reel/ig_reel_501/",
              timestamp: new Date().toISOString(),
              like_count: 940,
              comments_count: 62,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Meta Catalog items_batch
    if (url.includes("/items_batch")) {
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : {}
      const requests = Array.isArray(parsedBody.requests)
        ? parsedBody.requests
        : []
      return new Response(
        JSON.stringify({
          handles: requests.map(
            (r: { data?: { id?: string } }, idx: number) =>
              `meta_handle_${r.data?.id ?? idx}`
          ),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }) as typeof fetch
}

describe("medusa-plugin-social-commerce", () => {
  describe("1. Security & Cryptography Utilities (MedusaError Enforcement)", () => {
    it("encrypts and decrypts OAuth tokens using AES-256-GCM and rejects tampered ciphertext with MedusaError", () => {
      const plaintext = "secret_oauth_refresh_token_999"
      const encrypted = encryptToken(plaintext, TEST_ENCRYPTION_KEY)
      assert.ok(encrypted.startsWith("v1:"))
      assert.notEqual(encrypted, plaintext)

      const decrypted = decryptToken(encrypted, TEST_ENCRYPTION_KEY)
      assert.equal(decrypted, plaintext)

      assert.throws(
        () => decryptToken(`${encrypted}tampered`, TEST_ENCRYPTION_KEY),
        (err: unknown) =>
          err instanceof MedusaError &&
          err.type === MedusaError.Types.INVALID_DATA
      )
    })

    it("generates RFC 7636 PKCE S256 verifier/challenge pairs and signs/verifies OAuth state tokens", () => {
      const pkce = createPkceChallenge()
      assert.equal(pkce.codeMethod, "S256")
      assert.ok(pkce.codeVerifier.length >= 43)
      assert.ok(pkce.codeChallenge.length >= 40)

      const stateToken = createSignedOAuthState(
        {
          platform: "tiktok",
          merchantId: "merch_01",
          codeVerifier: pkce.codeVerifier,
          nonce: "nonce_xyz",
          issuedAt: Date.now(),
        },
        TEST_ENCRYPTION_KEY
      )

      const verified = verifySignedOAuthState(stateToken, TEST_ENCRYPTION_KEY)
      assert.equal(verified.platform, "tiktok")
      assert.equal(verified.merchantId, "merch_01")
      assert.equal(verified.codeVerifier, pkce.codeVerifier)

      // Expired state token must throw MedusaError
      const expiredToken = createSignedOAuthState(
        {
          platform: "instagram",
          merchantId: "merch_01",
          nonce: "expired_nonce",
          issuedAt: Date.now() - 20 * 60 * 1000,
        },
        TEST_ENCRYPTION_KEY
      )
      assert.throws(
        () => verifySignedOAuthState(expiredToken, TEST_ENCRYPTION_KEY),
        (err: unknown) =>
          err instanceof MedusaError &&
          err.type === MedusaError.Types.UNAUTHORIZED
      )
    })

    it("verifies webhook HMAC-SHA256 signatures in constant time and sanitizes XML/CSV/URLs", () => {
      const payload = JSON.stringify({ event: "live.started", id: "123" })
      const secret = "webhook_secret_key"
      const signature = computeHmacSha256Hex(payload, secret)

      assert.equal(
        verifyWebhookHmacSha256(payload, `sha256=${signature}`, secret),
        true
      )
      assert.equal(
        verifyWebhookHmacSha256(payload, "sha256=deadbeef", secret),
        false
      )

      assert.equal(
        escapeXml('<script>"alert"</script>'),
        "&lt;script&gt;&quot;alert&quot;&lt;/script&gt;"
      )
      assert.equal(
        escapeCsvField("=cmd|' /C calc'!A0"),
        "\"'=cmd|' /C calc'!A0\""
      )
      assert.equal(
        sanitizeHttpUrl("https://shop.example.com/checkout"),
        "https://shop.example.com/checkout"
      )
      assert.equal(sanitizeHttpUrl("javascript:alert(1)"), null)
    })
  })

  describe("2. Dedicated API Validators (src/api/validators.ts)", () => {
    it("validates payloads and throws MedusaError.Types.INVALID_DATA on invalid input", () => {
      const validStory = parseWithMedusaError(CreateLocalStorySchema, {
        caption: "Flash Sale Story",
        media_url: "https://cdn.example.com/story.mp4",
        duration: 15,
      })
      assert.equal(validStory.caption, "Flash Sale Story")

      assert.throws(
        () =>
          parseWithMedusaError(TagProductsOnPostSchema, {
            tags: [
              {
                product_id: "",
                position_x: 150,
              },
            ],
          }),
        (err: unknown) =>
          err instanceof MedusaError &&
          err.type === MedusaError.Types.INVALID_DATA
      )

      assert.throws(
        () =>
          parseWithMedusaError(ReserveLiveStockSchema, {
            session_id: "ls_1",
            product_id: "prod_1",
            variant_id: "var_1",
            quantity: -5,
          }),
        (err: unknown) =>
          err instanceof MedusaError &&
          err.type === MedusaError.Types.INVALID_DATA
      )
    })
  })

  describe("3. Multi-Platform OAuth, Media Sync & Ephemeral 24h Stories", () => {
    it("connects TikTok & Instagram accounts, redacts tokens, syncs videos/reels/stories, and creates local 24h stories", async () => {
      const mockFetch = createMockFetch()
      const service = new SocialCommerceService(
        {},
        {
          encryption_key: TEST_ENCRYPTION_KEY,
          storefront_url: "https://store.example.com",
          tiktok: {
            client_key: "tt_key",
            client_secret: "tt_secret",
            redirect_uri: "https://api.example.com/social/oauth/callback",
          },
          meta: {
            app_id: "meta_app_id",
            app_secret: "meta_app_secret",
            redirect_uri: "https://api.example.com/social/oauth/callback",
            catalog_id: "meta_cat_01",
          },
        }
      )

      await service.registerProvider(
        "tiktok",
        new TikTokProvider({
          clientKey: "tt_key",
          clientSecret: "tt_secret",
          redirectUri: "https://api.example.com/social/oauth/callback",
          fetchImpl: mockFetch,
        })
      )
      await service.registerProvider(
        "instagram",
        new MetaGraphProvider("instagram", {
          appId: "meta_app_id",
          appSecret: "meta_app_secret",
          redirectUri: "https://api.example.com/social/oauth/callback",
          catalogId: "meta_cat_01",
          fetchImpl: mockFetch,
        })
      )

      // 1. Initiate OAuth for TikTok & Instagram
      const ttInit = await service.buildOAuthConnectUrl({
        platform: "tiktok",
      })
      assert.ok(ttInit.url.includes("tiktok.com"))

      const ttAccount = await service.exchangeOAuthCallback({
        code: "tt_auth_code",
        state: ttInit.state,
      })
      assert.equal(ttAccount.platform, "tiktok")
      assert.equal(ttAccount.platform_username, "medusa_tiktok_shop")
      assert.equal(
        "access_token" in ttAccount,
        false,
        "Public DTO must never expose access_token"
      )

      const igInit = await service.buildOAuthConnectUrl({
        platform: "instagram",
      })
      const igAccount = await service.exchangeOAuthCallback({
        code: "ig_auth_code",
        state: igInit.state,
      })
      assert.equal(igAccount.platform, "instagram")
      assert.equal(igAccount.platform_username, "medusa.official")

      // 2. Sync media from connected accounts (TikTok Videos + Instagram Reels & Stories)
      const syncResult = await service.syncAllAccountsMedia()
      assert.equal(syncResult.accounts_synced, 2)
      assert.equal(syncResult.total_posts, 2)
      assert.equal(syncResult.total_stories, 1)

      // 3. Publish a Local 24-Hour Ephemeral Story (superset of @bambiste/medusa-stories)
      const localStory = await service.publishLocalStory({
        caption: "24h VIP Flash Access",
        media_url: "https://cdn.example.com/local-story.mp4",
        cta_url: "https://store.example.com/collections/vip",
        duration: 15,
        is_featured: true,
        product_tags: [
          {
            product_id: "prod_hoodie_01",
            variant_id: "var_hoodie_m",
            position_x: 45.5,
            position_y: 62.0,
            timestamp_seconds: 4,
            label: "Oversized Hoodie ($89)",
          },
        ],
      })
      assert.equal(localStory.platform, "local")
      assert.equal(localStory.media_type, "story")
      assert.ok(localStory.expires_at)
      assert.equal(localStory.tagged_products.length, 1)

      // 4. List active stories across Instagram + Local
      const activeStories = await service.listActiveStories()
      assert.equal(activeStories.length, 2)

      // 5. Tag product hotspot on synced TikTok video
      const ttPostsRes = await service.listMediaPosts({ platform: "tiktok" })
      assert.equal(ttPostsRes.posts.length, 1)
      const ttPost = ttPostsRes.posts[0]

      const tags = await service.tagProductsOnPost(ttPost.id, [
        {
          product_id: "prod_linen_shirt",
          variant_id: "var_linen_l",
          position_x: 50,
          position_y: 70,
          timestamp_seconds: 12,
        },
      ])
      assert.equal(tags.length, 1)
      assert.equal(tags[0].product_id, "prod_linen_shirt")
    })
  })

  describe("4. Live Selling & Atomic Flash-Sale Stock Reservations", () => {
    it("prevents overselling under concurrent reservations and releases/completes stock accurately", async () => {
      const mockFetch = createMockFetch()
      const service = new SocialCommerceService(
        {},
        {
          encryption_key: TEST_ENCRYPTION_KEY,
          reservation_ttl_seconds: 300,
        }
      )
      await service.registerProvider(
        "tiktok",
        new TikTokProvider({
          clientKey: "tt_key",
          clientSecret: "tt_secret",
          redirectUri: "https://api.example.com/social/oauth/callback",
          fetchImpl: mockFetch,
        })
      )

      const init = await service.buildOAuthConnectUrl({ platform: "tiktok" })
      const account = await service.exchangeOAuthCallback({
        code: "tt_code",
        state: init.state,
      })

      const session = await service.scheduleLiveSession({
        social_account_id: account.id,
        platform: "tiktok",
        title: "Friday Night Live Drop",
        stream_url: "https://live.example.com/stream-1",
      })
      assert.equal(session.status, "scheduled")

      const pinned = await service.pinProductsToLiveSession(session.id, [
        {
          product_id: "prod_sneaker_limited",
          variant_id: "var_sneaker_42",
          live_price: 120,
          currency_code: "USD",
          live_stock: 5,
          is_pinned: true,
        },
      ])
      assert.equal(pinned.length, 1)

      const started = await service.startLiveSession(session.id)
      assert.equal(started.status, "live")

      // Fire 4 concurrent reservation requests of quantity 2 against live_stock = 5
      // At most 2 reservations (total 4 units) can succeed; the remaining 2 must fail with CONFLICT
      const attempts = await Promise.allSettled([
        service.reserveLiveProductStock({
          session_id: session.id,
          product_id: "prod_sneaker_limited",
          variant_id: "var_sneaker_42",
          cart_id: "cart_01",
          quantity: 2,
        }),
        service.reserveLiveProductStock({
          session_id: session.id,
          product_id: "prod_sneaker_limited",
          variant_id: "var_sneaker_42",
          cart_id: "cart_02",
          quantity: 2,
        }),
        service.reserveLiveProductStock({
          session_id: session.id,
          product_id: "prod_sneaker_limited",
          variant_id: "var_sneaker_42",
          cart_id: "cart_03",
          quantity: 2,
        }),
        service.reserveLiveProductStock({
          session_id: session.id,
          product_id: "prod_sneaker_limited",
          variant_id: "var_sneaker_42",
          cart_id: "cart_04",
          quantity: 2,
        }),
      ])

      const fulfilled = attempts.filter(
        (a): a is PromiseFulfilledResult<Awaited<ReturnType<typeof service.reserveLiveProductStock>>> =>
          a.status === "fulfilled"
      )
      const rejected = attempts.filter((a) => a.status === "rejected")
      assert.equal(fulfilled.length, 2)
      assert.equal(rejected.length, 2)

      // Confirm first reservation via order placement
      const confirmed = await service.confirmLiveProductReservation(
        fulfilled[0].value.id
      )
      assert.equal(confirmed.confirmed, true)
      assert.equal(confirmed.quantity, 2)

      const ended = await service.endLiveSession(session.id)
      assert.equal(ended.session.status, "ended")
    })

    it("supports Redis Lua atomic reservation path when a Redis client is injected", async () => {
      const mockRedisEvalCalls: Array<{
        keys: string[]
        args: Array<string | number>
      }> = []

      const reservationSvc = new InventoryReservationService({
        defaultTtlSeconds: 600,
        redisClient: {
          async eval(
            _script: string,
            numKeys: number,
            ...rest: Array<string | number>
          ) {
            const keys = rest.slice(0, numKeys).map(String)
            const args = rest.slice(numKeys)
            mockRedisEvalCalls.push({ keys, args })
            return 1
          },
          async get() {
            return "2"
          },
          async set() {
            return "OK"
          },
          async del() {
            return 1
          },
          async sadd() {
            return 1
          },
          async smembers() {
            return []
          },
          async srem() {
            return 1
          },
        },
      })

      assert.equal(reservationSvc.mode, "redis")
      const res = await reservationSvc.reserveStock({
        session_id: "ls_redis_01",
        product_id: "prod_redis_01",
        variant_id: "var_redis_01",
        cart_id: "cart_redis_01",
        quantity: 2,
      })
      assert.equal(res.quantity, 2)
      assert.equal(mockRedisEvalCalls.length, 1)
    })
  })

  describe("5. Outbound Catalog Feed (XML / CSV / JSON) & Checkout Handoff", () => {
    it("generates Meta RSS 2.0 XML, TikTok CSV, and Social Checkout Handoff deep links with UTM attribution", async () => {
      const feedService = new CatalogFeedService({
        storefrontUrl: "https://store.example.com",
        brandName: "Medusa Home",
      })

      const sampleProducts = [
        {
          id: "var_01",
          item_group_id: "prod_01",
          title: "Artisan Ceramic Mug & Coaster",
          description: "Handcrafted stoneware mug",
          link: "https://store.example.com/products/artisan-ceramic-mug",
          image_link: "https://cdn.example.com/mug.jpg",
          price: 34.5,
          currency_code: "USD",
          availability: "in stock" as const,
          inventory_quantity: 25,
          brand: "Medusa Home",
        },
      ]

      const xmlFeed = feedService.generateFeed(sampleProducts, {
        format: "xml",
      })
      assert.ok(xmlFeed.contentType.includes("application/xml"))
      assert.ok(xmlFeed.body.includes("<g:id>var_01</g:id>"))
      assert.ok(xmlFeed.body.includes("Artisan Ceramic Mug &amp; Coaster"))

      const csvFeed = feedService.generateFeed(sampleProducts, {
        format: "csv",
      })
      assert.ok(csvFeed.contentType.includes("text/csv"))
      assert.ok(csvFeed.body.includes("id,item_group_id,title,description"))

      const handoff = feedService.buildCheckoutHandoff({
        products_param: "var_01:2,var_02:1",
        coupon: "TIKTOK15",
        source_platform: "tiktok",
        source_post_id: "post_77",
      })
      assert.equal(handoff.items.length, 2)
      assert.equal(handoff.attribution.source_platform, "tiktok")
      assert.ok(handoff.checkout_url.includes("coupon=TIKTOK15"))
      assert.ok(handoff.checkout_url.includes("utm_source=tiktok"))
    })

    it("emits rich Google/Meta Merchant tags (gtin, mpn, additional_image_link, color, size, material, custom_options) and runs beforeFeedItem hook", async () => {
      const feedService = new CatalogFeedService({
        storefrontUrl: "https://store.example.com",
        brandName: "Medusa Apparel",
        defaultCurrency: "EUR",
      })

      const rawMedusaProducts = [
        {
          id: "prod_hoodie",
          handle: "heavyweight-hoodie",
          title: "Heavyweight Organic Cotton Hoodie",
          description: "<p>Ultra-soft 500gsm organic cotton hoodie.</p>",
          status: "published",
          thumbnail: "https://cdn.example.com/hoodie-main.jpg",
          images: [
            { url: "https://cdn.example.com/hoodie-main.jpg" },
            { url: "https://cdn.example.com/hoodie-side.jpg" },
            { url: "https://cdn.example.com/hoodie-back.jpg" },
          ],
          categories: [{ name: "Apparel & Accessories > Hoodies" }],
          options: [
            { id: "opt_size", title: "Size" },
            { id: "opt_color", title: "Color" },
            { id: "opt_fit", title: "Fit" },
          ],
          variants: [
            {
              id: "var_hoodie_m_blk",
              title: "M / Obsidian Black",
              sku: "HD-ORG-M-BLK",
              ean: "4006381333931",
              inventory_quantity: 12,
              manage_inventory: true,
              calculated_price: {
                calculated_amount: 79,
                original_amount: 99,
                currency_code: "eur",
              },
              options: [
                { option_id: "opt_size", value: "M" },
                { option_id: "opt_color", value: "Obsidian Black" },
                { option_id: "opt_fit", value: "Relaxed" },
              ],
            },
            {
              id: "var_hoodie_skip",
              title: "S / Discontinued",
              sku: "HD-SKIP",
              inventory_quantity: 0,
              manage_inventory: true,
              allow_backorder: true,
              prices: [{ amount: 89, currency_code: "eur" }],
              options: [{ option_id: "opt_size", value: "S" }],
            },
          ],
        },
      ]

      const mapped = feedService.mapMedusaProductsToFeedItems(rawMedusaProducts, {
        currencyCode: "EUR",
        countryCode: "DE",
        beforeFeedItem: (item) => {
          if (item.id === "var_hoodie_skip") return null
          return {
            ...item,
            material: "100% Organic Cotton",
            gender: "unisex",
            age_group: "adult",
          }
        },
      })

      assert.equal(mapped.length, 1)
      assert.equal(mapped[0].id, "var_hoodie_m_blk")
      assert.equal(mapped[0].gtin, "4006381333931")
      assert.equal(mapped[0].mpn, "HD-ORG-M-BLK")
      assert.equal(mapped[0].price, 99)
      assert.equal(mapped[0].sale_price, 79)
      assert.equal(mapped[0].size, "M")
      assert.equal(mapped[0].color, "Obsidian Black")
      assert.equal(mapped[0].material, "100% Organic Cotton")
      assert.ok(mapped[0].link.includes("size=M"))
      assert.ok(mapped[0].link.includes("color=Obsidian+Black"))

      const xml = feedService.generateFeed(mapped, {
        format: "xml",
        currencyCode: "EUR",
        countryCode: "DE",
      })
      assert.ok(xml.body.includes("<g:gtin>4006381333931</g:gtin>"))
      assert.ok(xml.body.includes("<g:mpn>HD-ORG-M-BLK</g:mpn>"))
      assert.ok(
        xml.body.includes(
          "<g:additional_image_link>https://cdn.example.com/hoodie-side.jpg</g:additional_image_link>"
        )
      )
      assert.ok(xml.body.includes("<g:color>Obsidian Black</g:color>"))
      assert.ok(xml.body.includes("<g:size>M</g:size>"))
      assert.ok(xml.body.includes("<g:material>100% Organic Cotton</g:material>"))
      assert.ok(xml.body.includes("<g:fit>Relaxed</g:fit>"))
      assert.ok(xml.body.includes("<g:price>99.00 EUR</g:price>"))
      assert.ok(xml.body.includes("<g:sale_price>79.00 EUR</g:sale_price>"))

      const csv = feedService.generateFeed(mapped, { format: "csv" })
      assert.ok(csv.body.includes("4006381333931"))
      assert.ok(csv.body.includes("HD-ORG-M-BLK"))
    })

    it("enforces optional feed_token and resolves country_code / region currency on GET /store/social/catalog-feed", async () => {
      const protectedService = new SocialCommerceService(
        {},
        {
          encryption_key: TEST_ENCRYPTION_KEY,
          storefront_url: "https://store.example.com",
          feed_token: "secret-merchant-token-123",
        }
      )

      const mockScope = {
        resolve(key: string) {
          if (key === "social_commerce") return protectedService
          if (key === "region") {
            return {
              async listRegions() {
                return [
                  {
                    id: "reg_eu",
                    currency_code: "eur",
                    countries: [{ iso_2: "de" }, { iso_2: "dk" }],
                  },
                ]
              },
            }
          }
          if (key === "product") {
            return {
              async listProducts() {
                return [
                  {
                    id: "prod_dk_1",
                    handle: "nordic-lamp",
                    title: "Nordic Table Lamp",
                    description: "Minimalist brass table lamp",
                    status: "published",
                    thumbnail: "https://cdn.example.com/lamp.jpg",
                    variants: [
                      {
                        id: "var_dk_1",
                        title: "Brass",
                        sku: "LAMP-BRASS-01",
                        prices: [{ amount: 145, currency_code: "eur", region_id: "reg_eu" }],
                      },
                    ],
                  },
                ]
              },
            }
          }
          return null
        },
      }

      const makeRes = () => {
        const state: {
          statusCode: number
          body: unknown
          headers: Record<string, string>
        } = { statusCode: 200, body: null, headers: {} }
        const res: HttpResponse = {
          status(code: number) {
            state.statusCode = code
            return res
          },
          json(payload: unknown) {
            state.body = payload
          },
          send(payload: string) {
            state.body = payload
          },
          setHeader(name: string, value: string) {
            state.headers[name] = value
          },
        }
        return { res, state }
      }

      // 1. Missing token -> 401 Unauthorized
      const { res: unauthRes, state: unauthState } = makeRes()
      await storeCatalogFeedGet(
        {
          scope: mockScope,
          query: { format: "xml" },
        } as unknown as HttpRequest,
        unauthRes
      )
      assert.equal(unauthState.statusCode, 401)

      // 2. Valid token + country_code=DE -> 200 OK with EUR currency & mapped Medusa product
      const { res: okRes, state: okState } = makeRes()
      await storeCatalogFeedGet(
        {
          scope: mockScope,
          query: {
            format: "xml",
            country_code: "DE",
            token: "secret-merchant-token-123",
          },
        } as unknown as HttpRequest,
        okRes
      )
      assert.equal(okState.statusCode, 200)
      assert.equal(okState.headers["X-Content-Type-Options"], "nosniff")
      assert.equal(okState.headers["Cache-Control"], "private, no-store")
      assert.ok(String(okState.body).includes("<g:id>var_dk_1</g:id>"))
      assert.ok(String(okState.body).includes("<g:price>145.00 EUR</g:price>"))
      assert.ok(String(okState.body).includes("<g:mpn>LAMP-BRASS-01</g:mpn>"))
    })
  })

  describe("6. API Routes, Webhook Signature Enforcement & Isomorphic SDK/Hooks", () => {
    it("serves store stories/feed/catalog routes and enforces HMAC verification on webhook routes", async () => {
      const service = new SocialCommerceService(
        {},
        {
          encryption_key: TEST_ENCRYPTION_KEY,
          storefront_url: "https://store.example.com",
          meta: {
            app_id: "meta_app",
            app_secret: "meta_secret",
            redirect_uri: "https://api.example.com/social/oauth/callback",
            webhook_secret: "meta_webhook_secret",
          },
          tiktok: {
            client_key: "tt_key",
            client_secret: "tt_secret",
            redirect_uri: "https://api.example.com/social/oauth/callback",
          },
        }
      )

      await service.publishLocalStory({
        caption: "Homepage Hero Story",
        media_url: "https://cdn.example.com/hero.mp4",
        is_featured: true,
      })

      const createMockRes = () => {
        const state: {
          statusCode: number
          body: unknown
          headers: Record<string, string>
        } = {
          statusCode: 200,
          body: null,
          headers: {},
        }
        const res: HttpResponse = {
          status(code: number) {
            state.statusCode = code
            return res
          },
          json(payload: unknown) {
            state.body = payload
          },
          send(payload: string) {
            state.body = payload
          },
          setHeader(name: string, value: string) {
            state.headers[name] = value
          },
        }
        return { res, state }
      }

      const scope = {
        resolve(key: string) {
          if (key === "social_commerce") return service
          return null
        },
      }

      // 1. Test POST /admin/social/connect
      const { res: connectRes, state: connectState } = createMockRes()
      await connectPost(
        {
          scope,
          validatedBody: { platform: "tiktok" },
        } as unknown as HttpRequest,
        connectRes
      )
      assert.equal(connectState.statusCode, 200)

      // 2. Test GET /store/social/stories
      const { res: storiesRes, state: storiesState } = createMockRes()
      await storeStoriesGet(
        {
          scope,
          query: { featured_only: "true" },
        } as unknown as HttpRequest,
        storiesRes
      )
      assert.equal(storiesState.statusCode, 200)
      assert.equal((storiesState.body as { count: number }).count, 1)

      // 3. Test GET /store/social/feed
      const { res: feedRes, state: feedState } = createMockRes()
      await storeFeedGet(
        {
          scope,
          query: { limit: "10" },
        } as unknown as HttpRequest,
        feedRes
      )
      assert.equal(feedState.statusCode, 200)
      assert.equal((feedState.body as { count: number }).count, 1)

      // 4. Test GET /store/social/catalog-feed?format=xml
      const { res: catRes, state: catState } = createMockRes()
      await storeCatalogFeedGet(
        {
          scope,
          query: { format: "xml" },
        } as unknown as HttpRequest,
        catRes
      )
      assert.equal(catState.statusCode, 200)
      assert.ok(String(catState.body).includes('<rss version="2.0"'))

      // 5. Test POST /webhooks/social/instagram with invalid signature -> 401
      const webhookPayload = { event: "comment.created", post_id: "1" }
      const { res: badWebRes, state: badWebState } = createMockRes()
      await webhookPost(
        {
          scope,
          params: { platform: "instagram" },
          headers: { "x-hub-signature-256": "sha256=invalid" },
          body: webhookPayload,
        } as unknown as HttpRequest,
        badWebRes
      )
      assert.equal(badWebState.statusCode, 401)

      // 6. Test POST /webhooks/social/instagram with valid HMAC signature -> 200
      const validSig = computeHmacSha256Hex(
        JSON.stringify(webhookPayload),
        "meta_webhook_secret"
      )
      const { res: okWebRes, state: okWebState } = createMockRes()
      await webhookPost(
        {
          scope,
          params: { platform: "instagram" },
          headers: { "x-hub-signature-256": `sha256=${validSig}` },
          body: webhookPayload,
        } as unknown as HttpRequest,
        okWebRes
      )
      assert.equal(okWebState.statusCode, 200)

      // 7. Test SDK & Hooks Descriptors
      const sdk = createSocialCommerceSDK({
        baseUrl: "https://api.example.com",
        publishableApiKey: "pk_test_123",
        fetchImpl: createMockFetch(),
      })
      const hooks = createSocialCommerceHooks(sdk)
      const storiesQuery = hooks.useSocialStoriesQuery({
        platform: "instagram",
      })
      assert.deepEqual(storiesQuery.queryKey, [
        "social-commerce",
        "store",
        "stories",
        { platform: "instagram" },
      ])
    })
  })

  describe("7. Admin UI Localization (10 Locales Key Parity)", () => {
    it("exports all 10 locales (ar, de, en, es, fr, it, nl, pl, pt, tr) with 100% key parity with en.json", () => {
      const bundles = adminI18n
      const locales = SUPPORTED_UI_LOCALES.map((l) => l.code)

      assert.equal(locales.length, 10)

      const flattenKeys = (
        obj: Record<string, unknown>,
        prefix = ""
      ): string[] =>
        Object.entries(obj).flatMap(([k, v]) => {
          const nextKey = prefix ? `${prefix}.${k}` : k
          if (v && typeof v === "object" && !Array.isArray(v)) {
            return flattenKeys(v as Record<string, unknown>, nextKey)
          }
          return [nextKey]
        })

      const enKeys = flattenKeys(
        bundles.en.translation as unknown as Record<string, unknown>
      ).sort()
      assert.ok(enKeys.length >= 60)

      for (const localeCode of locales) {
        const entry = bundles[localeCode]
        assert.ok(entry, `Missing locale bundle for ${localeCode}`)
        assert.ok(
          entry["social-commerce"],
          `Missing "social-commerce" namespace for ${localeCode}`
        )
        const localeKeys = flattenKeys(
          entry.translation as unknown as Record<string, unknown>
        ).sort()
        assert.deepEqual(
          localeKeys,
          enKeys,
          `Locale "${localeCode}" keys do not match "en"`
        )
      }

      assert.equal(socialRouteConfig.label, "nav.label")
      assert.equal(socialRouteConfig.translationNs, "social-commerce")
      assert.equal(socialWidgetConfig.zone, "product.details.after")
    })

    it("exports LayoutComposer multi-route pages, RouteDrawer @create modals, and @medusajs/ui components", async () => {
      const overviewPage = await import(
        "../admin/routes/social-commerce/page.js"
      )
      const accountsPage = await import(
        "../admin/routes/social-commerce/accounts/page.js"
      )
      const feedPage = await import(
        "../admin/routes/social-commerce/feed/page.js"
      )
      const storiesPage = await import(
        "../admin/routes/social-commerce/stories/page.js"
      )
      const storiesCreatePage = await import(
        "../admin/routes/social-commerce/stories/@create/page.js"
      )
      const livePage = await import(
        "../admin/routes/social-commerce/live/page.js"
      )
      const liveCreatePage = await import(
        "../admin/routes/social-commerce/live/@create/page.js"
      )
      const catalogPage = await import(
        "../admin/routes/social-commerce/catalog/page.js"
      )
      const components = await import("../admin/components/index.js")

      for (const routeMod of [
        overviewPage,
        accountsPage,
        feedPage,
        storiesPage,
        livePage,
        catalogPage,
      ]) {
        assert.equal(typeof routeMod.default, "function")
        assert.equal(routeMod.config.label, "nav.label")
        assert.equal(routeMod.config.translationNs, "social-commerce")
        assert.ok(routeMod.config.icon)
        assert.equal(typeof routeMod.handle?.breadcrumb, "function")
      }

      assert.equal(typeof storiesCreatePage.default, "function")
      assert.equal(typeof liveCreatePage.default, "function")
      assert.equal(typeof components.AccountsTab, "function")
      assert.equal(typeof components.CatalogTab, "function")
      assert.equal(typeof components.DashboardHeader, "function")
      assert.equal(typeof components.DashboardTabs, "function")
      assert.equal(typeof components.FeedTab, "function")
      assert.equal(typeof components.LiveTab, "function")
      assert.equal(typeof components.ProductSocialSummary, "function")
      assert.equal(typeof components.StoriesTab, "function")
      assert.equal(typeof components.StatCard, "function")
      assert.equal(typeof components.NavigationCard, "function")
    })
  })

  describe("8. @bambiste/medusa-social-commerce Parity & Enhanced Capabilities", () => {
    it("aligns canonical and @bambiste alias properties across accounts, posts, tags, live sessions, live products, and catalog items, and resolves SocialCommerce legacy module key", async () => {
      assert.equal(MetaProvider, MetaGraphProvider)
      assert.equal(SOCIAL_COMMERCE_LEGACY_MODULE, "SocialCommerce")

      const service = new SocialCommerceService(
        {},
        { encryption_key: TEST_ENCRYPTION_KEY }
      )
      await service.registerProvider(
        "tiktok",
        new TikTokProvider({
          clientKey: "tt_key",
          clientSecret: "tt_secret",
          redirectUri: "https://api.example.com/social/oauth/callback",
          shopId: "shop_99",
          fetchImpl: createMockFetch(),
        })
      )

      // Legacy "SocialCommerce" container resolution fallback
      const legacyContainer = {
        resolve<T = unknown>(key: string): T {
          if (key === "SocialCommerce") return service as unknown as T
          throw new Error(`Module ${key} not registered`)
        },
      }
      assert.equal(resolveSocialCommerceService(legacyContainer), service)

      const init = await service.buildOAuthConnectUrl({ platform: "tiktok" })
      const account = await service.exchangeOAuthCallback({
        code: "tt_code",
        state: init.state,
      })

      assert.equal(account.platform_user_id, "tt_open_id_789")
      assert.equal(account.external_id, "tt_open_id_789")
      assert.equal(account.platform_username, "medusa_tiktok_shop")
      assert.equal(account.username, "medusa_tiktok_shop")
      assert.equal(account.is_active, true)
      assert.equal("encrypted_access_token" in account, false)
      assert.equal("encrypted_refresh_token" in account, false)

      const syncRes = await service.syncAccountMedia(account.id)
      assert.equal(syncRes.synced_count, 1)
      assert.equal(syncRes.created_count, 1)
      assert.equal(syncRes.updated_count, 0)
      const post = syncRes.posts[0]
      assert.equal(post.account_id, account.id)
      assert.equal(post.external_id, "tt_vid_001")
      assert.equal(post.views_count, 15000)
      assert.equal(post.likes_count, 2300)
      assert.equal(post.comments_count, 140)
      assert.equal(post.shares_count, 85)
      assert.ok(post.synced_at)

      // Tag using @bambiste alias inputs (video_timestamp, coordinates)
      const tags = await service.tagProductsOnPost(post.id, [
        {
          product_id: "prod_alias_1",
          variant_id: "var_alias_1",
          video_timestamp: 18,
          coordinates: { x: 25, y: 75 },
        },
      ])
      assert.equal(tags[0].post_id, post.id)
      assert.equal(tags[0].timestamp_seconds, 18)
      assert.equal(tags[0].video_timestamp, 18)
      assert.equal(tags[0].position_x, 25)
      assert.equal(tags[0].position_y, 75)
      assert.deepEqual(tags[0].coordinates, { x: 25, y: 75 })

      // LiveSession & LiveProduct using @bambiste alias inputs
      const liveSession = await service.scheduleLiveSession({
        account_id: account.id,
        external_id: "room_alias_01",
        title: "Alias Live Drop",
      })
      assert.equal(liveSession.account_id, account.id)
      assert.equal(liveSession.external_id, "room_alias_01")
      assert.equal(liveSession.platform_live_id, "room_alias_01")

      const liveProds = await service.pinProductsToLiveSession(liveSession.id, [
        {
          product_id: "prod_live_alias",
          variant_id: "var_live_alias",
          special_price: 49,
          allocated_stock: 10,
          is_pinned: true,
        },
      ])
      assert.equal(liveProds[0].live_price, 49)
      assert.equal(liveProds[0].special_price, 49)
      assert.equal(liveProds[0].live_stock, 10)
      assert.equal(liveProds[0].allocated_stock, 10)
      assert.equal(liveProds[0].is_pinned, true)
    })

    it("retries provider HTTP calls on 429/5xx, detects TikTok HTTP 200 body errors, revokes tokens on disconnect, and fetches single video & live info", async () => {
      let videoQueryAttempts = 0
      let liveInfoAttempts = 0
      let revokedTokens: string[] = []

      const customFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString()

        if (url.includes("/v2/video/query/")) {
          videoQueryAttempts += 1
          if (videoQueryAttempts === 1) {
            return new Response("Too Many Requests", {
              status: 429,
              headers: { "Retry-After": "0" },
            })
          }
          return new Response(
            JSON.stringify({
              data: {
                videos: [
                  {
                    id: "tt_single_vid_99",
                    title: "Single Queried Video",
                    video_description: "Fetched via /v2/video/query/",
                    cover_image_url: "https://cdn.example.com/v99.jpg",
                    share_url: "https://www.tiktok.com/@shop/video/tt_single_vid_99",
                    duration: 19,
                    create_time: 1729000000,
                    view_count: 880,
                    like_count: 110,
                    comment_count: 9,
                    share_count: 4,
                  },
                ],
              },
              error: { code: "ok", message: "" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }

        if (url.includes("/v2/live/info/")) {
          liveInfoAttempts += 1
          if (liveInfoAttempts === 1) {
            return new Response("Service Unavailable", { status: 503 })
          }
          return new Response(
            JSON.stringify({
              data: {
                room_id: "room_live_777",
                title: "TikTok Live Flash Sale",
                status: "live",
                viewer_count: 340,
                peak_viewer_count: 520,
                stream_url: "https://live.tiktok.com/room_live_777",
              },
              error: { code: "ok" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }

        if (url.includes("/v2/oauth/revoke/")) {
          const bodyStr = String(init?.body ?? "")
          const params = new URLSearchParams(bodyStr)
          revokedTokens.push(params.get("token") ?? "")
          return new Response(JSON.stringify({ data: {}, error: { code: "ok" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        }

        return createMockFetch()(input, init)
      }) as typeof fetch

      const provider = new TikTokProvider({
        clientKey: "tt_key",
        clientSecret: "tt_secret",
        redirectUri: "https://api.example.com/social/oauth/callback",
        fetchImpl: customFetch,
      })

      // 1. Test getVideo with 429 retry
      const video = await provider.getVideo("tok_test_1", "tt_single_vid_99")
      assert.equal(videoQueryAttempts, 2)
      assert.ok(video)
      assert.equal(video.platform_post_id, "tt_single_vid_99")
      assert.equal(video.view_count, 880)

      // 2. Test getLiveSession with 503 retry
      const liveInfo = await provider.getLiveSession("tok_test_1", "room_live_777")
      assert.equal(liveInfoAttempts, 2)
      assert.ok(liveInfo)
      assert.equal(liveInfo.platform_live_id, "room_live_777")
      assert.equal(liveInfo.viewer_count, 340)
      assert.equal(liveInfo.peak_viewer_count, 520)

      // 3. Test TikTok HTTP 200 body-level error detection
      const errorProvider = new TikTokProvider({
        clientKey: "tt_key",
        clientSecret: "tt_secret",
        redirectUri: "https://api.example.com/social/oauth/callback",
        fetchImpl: (async () =>
          new Response(
            JSON.stringify({
              data: {},
              error: {
                code: "access_token_invalid",
                message: "The access token is invalid or expired.",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )) as typeof fetch,
      })
      await assert.rejects(
        () => errorProvider.fetchMediaPosts("bad_tok"),
        (err: unknown) =>
          err instanceof MedusaError &&
          err.message.includes("access_token_invalid")
      )

      // 4. Test disconnectAccount calling provider.revokeToken
      const service = new SocialCommerceService(
        {},
        { encryption_key: TEST_ENCRYPTION_KEY }
      )
      await service.registerProvider("tiktok", provider)
      const init = await service.buildOAuthConnectUrl({ platform: "tiktok" })
      const acc = await service.exchangeOAuthCallback({
        code: "tt_code",
        state: init.state,
      })

      await service.disconnectAccount(acc.id)
      assert.deepEqual(revokedTokens, ["tt_access_token_123"])
    })

    it("auto-refreshes expiring tokens (< 5 minutes remaining) and follows multi-page cursor pagination in syncAccountMedia", async () => {
      let refreshCount = 0
      let videoListCursors: Array<string | null> = []

      const paginatedFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString()

        if (url.includes("open.tiktokapis.com/v2/oauth/token")) {
          const bodyStr = String(init?.body ?? "")
          if (bodyStr.includes("grant_type=refresh_token")) {
            refreshCount += 1
            return new Response(
              JSON.stringify({
                data: {
                  access_token: "tt_refreshed_access_token_999",
                  refresh_token: "tt_refreshed_refresh_token_999",
                  open_id: "tt_open_id_789",
                  scope: "user.info.basic,video.list",
                  expires_in: 86400,
                },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            )
          }
          // Initial token expires in 120 seconds (< 5 minutes) to trigger auto-refresh
          return new Response(
            JSON.stringify({
              data: {
                access_token: "tt_short_lived_token",
                refresh_token: "tt_initial_refresh_token",
                open_id: "tt_open_id_789",
                scope: "user.info.basic,video.list",
                expires_in: 120,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }

        if (url.includes("open.tiktokapis.com/v2/video/list")) {
          const parsedBody = JSON.parse(String(init?.body ?? "{}")) as {
            cursor?: number
          }
          const cursorVal =
            parsedBody.cursor !== undefined ? String(parsedBody.cursor) : null
          videoListCursors.push(cursorVal)

          if (!cursorVal || cursorVal === "0") {
            return new Response(
              JSON.stringify({
                data: {
                  videos: [
                    {
                      id: "tt_page_1_vid",
                      title: "Page 1 Video",
                      share_url: "https://www.tiktok.com/@shop/video/1",
                      create_time: 1728000001,
                    },
                  ],
                  cursor: 200,
                  has_more: true,
                },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            )
          }

          return new Response(
            JSON.stringify({
              data: {
                videos: [
                  {
                    id: "tt_page_2_vid",
                    title: "Page 2 Video",
                    share_url: "https://www.tiktok.com/@shop/video/2",
                    create_time: 1728000002,
                  },
                ],
                cursor: 0,
                has_more: false,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }

        return createMockFetch()(input, init)
      }) as typeof fetch

      const service = new SocialCommerceService(
        {},
        { encryption_key: TEST_ENCRYPTION_KEY }
      )
      await service.registerProvider(
        "tiktok",
        new TikTokProvider({
          clientKey: "tt_key",
          clientSecret: "tt_secret",
          redirectUri: "https://api.example.com/social/oauth/callback",
          fetchImpl: paginatedFetch,
        })
      )

      const init = await service.buildOAuthConnectUrl({ platform: "tiktok" })
      const account = await service.exchangeOAuthCallback({
        code: "tt_code",
        state: init.state,
      })

      const syncRes = await service.syncAccountMedia(account.id, {
        fetchAllPages: true,
        maxPages: 5,
      })

      assert.equal(refreshCount, 1)
      assert.deepEqual(videoListCursors, ["0", "200"])
      assert.equal(syncRes.synced_posts, 2)
      assert.equal(syncRes.created_count, 2)
    })

    it("ingests real TikTok webhook events (user.video.publish and live.room.status_update) and releases reservations when live ends", async () => {
      const webhookFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString()

        if (url.includes("/v2/video/query/")) {
          return new Response(
            JSON.stringify({
              data: {
                videos: [
                  {
                    id: "tt_webhook_vid_01",
                    title: "Webhook Published Video",
                    video_description: "Auto-ingested from TikTok webhook",
                    cover_image_url: "https://cdn.example.com/wh-cover.jpg",
                    share_url: "https://www.tiktok.com/@shop/video/tt_webhook_vid_01",
                    duration: 15,
                    create_time: 1729100000,
                    view_count: 500,
                    like_count: 90,
                    comment_count: 12,
                    share_count: 6,
                  },
                ],
              },
              error: { code: "ok" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }

        if (url.includes("/v2/live/info/")) {
          return new Response(
            JSON.stringify({
              data: {
                room_id: "tt_room_555",
                title: "Webhook Live Room",
                status: "live",
                viewer_count: 410,
                peak_viewer_count: 600,
                stream_url: "https://live.tiktok.com/tt_room_555",
              },
              error: { code: "ok" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }

        return createMockFetch()(input, init)
      }) as typeof fetch

      const service = new SocialCommerceService(
        {},
        {
          encryption_key: TEST_ENCRYPTION_KEY,
          tiktok: {
            client_key: "tt_key",
            client_secret: "tt_webhook_secret",
            webhook_secret: "tt_webhook_secret",
          },
        }
      )
      await service.registerProvider(
        "tiktok",
        new TikTokProvider({
          clientKey: "tt_key",
          clientSecret: "tt_webhook_secret",
          redirectUri: "https://api.example.com/social/oauth/callback",
          fetchImpl: webhookFetch,
        })
      )

      const init = await service.buildOAuthConnectUrl({ platform: "tiktok" })
      const account = await service.exchangeOAuthCallback({
        code: "tt_code",
        state: init.state,
      })

      // 1. Test user.video.publish via POST /webhooks/tiktok
      const publishPayload = {
        event: "user.video.publish",
        data: {
          open_id: "tt_open_id_789",
          video_id: "tt_webhook_vid_01",
        },
      }
      const publishRaw = JSON.stringify(publishPayload)
      const publishSig = computeHmacSha256Hex(publishRaw, "tt_webhook_secret")

      let webhookRespStatus = 200
      let webhookRespBody: unknown = null
      const mockRes: HttpResponse = {
        status(c: number) {
          webhookRespStatus = c
          return mockRes
        },
        json(b: unknown) {
          webhookRespBody = b
        },
      }

      await tiktokWebhookPost(
        {
          scope: {
            resolve(k: string) {
              return k === "social_commerce" ? service : null
            },
          },
          headers: { "x-tiktok-signature": publishSig },
          rawBody: publishRaw,
          body: publishPayload,
        } as unknown as HttpRequest,
        mockRes
      )

      assert.equal(webhookRespStatus, 200)
      assert.equal(
        (webhookRespBody as { action: string }).action,
        "video_upserted"
      )
      const postsAfterWebhook = await service.listMediaPosts({
        platform: "tiktok",
      })
      assert.equal(postsAfterWebhook.count, 1)
      assert.equal(
        postsAfterWebhook.posts[0].platform_post_id,
        "tt_webhook_vid_01"
      )

      // 2. Schedule a LiveSession for room tt_room_555 with flash-sale stock
      const scheduled = await service.scheduleLiveSession({
        social_account_id: account.id,
        platform: "tiktok",
        platform_live_id: "tt_room_555",
        title: "Scheduled Drop",
      })
      await service.pinProductsToLiveSession(scheduled.id, [
        {
          product_id: "prod_wh_live",
          variant_id: "var_wh_live",
          live_price: 55,
          live_stock: 4,
        },
      ])

      // Trigger live.room.status_update -> status: "live"
      const liveStartResult = await service.handleIncomingWebhook("tiktok", {
        event: "live.room.status_update",
        data: {
          open_id: "tt_open_id_789",
          room_id: "tt_room_555",
          status: "live",
        },
      })
      assert.equal(liveStartResult.handled, true)
      assert.equal(liveStartResult.action, "live_session_started")
      assert.equal(liveStartResult.session?.status, "live")
      assert.equal(liveStartResult.session?.peak_viewer_count, 600)

      // Reserve 2 units during live session
      await service.reserveLiveProductStock({
        session_id: scheduled.id,
        product_id: "prod_wh_live",
        variant_id: "var_wh_live",
        cart_id: "cart_wh_01",
        quantity: 2,
      })

      // Trigger live.room.status_update -> status: "ended"
      const liveEndResult = await service.handleIncomingWebhook("tiktok", {
        event: "live.room.status_update",
        data: {
          open_id: "tt_open_id_789",
          room_id: "tt_room_555",
          status: "ended",
        },
      })
      assert.equal(liveEndResult.handled, true)
      assert.equal(liveEndResult.action, "live_session_ended")
      assert.equal(liveEndResult.session?.status, "ended")
      assert.equal(liveEndResult.released_reservations, 1)
    })

    it("renders safe HTML popup postMessage on OAuth callback (?popup=true) and enforces workflow scope validation & rollback compensation", async () => {
      const service = new SocialCommerceService(
        {},
        { encryption_key: TEST_ENCRYPTION_KEY }
      )
      await service.registerProvider(
        "tiktok",
        new TikTokProvider({
          clientKey: "tt_key",
          clientSecret: "tt_secret",
          redirectUri: "https://api.example.com/social/oauth/callback",
          fetchImpl: createMockFetch(),
        })
      )

      const init = await service.buildOAuthConnectUrl({ platform: "tiktok" })

      let htmlStatus = 200
      let htmlBody = ""
      const htmlHeaders: Record<string, string> = {}
      const popupRes: HttpResponse = {
        status(code: number) {
          htmlStatus = code
          return popupRes
        },
        json() {},
        send(body: string) {
          htmlBody = body
        },
        setHeader(k: string, v: string) {
          htmlHeaders[k] = v
        },
      }

      const scope = {
        resolve(key: string) {
          if (key === "social_commerce") return service
          return null
        },
      }

      await oauthCallbackGet(
        {
          scope,
          query: {
            code: "tt_code",
            state: init.state,
            popup: "true",
          },
          headers: { accept: "text/html" },
        } as unknown as HttpRequest,
        popupRes
      )

      assert.equal(htmlStatus, 200)
      assert.ok(htmlHeaders["Content-Type"]?.includes("text/html"))
      assert.ok(htmlBody.includes("tiktok-oauth-success"))
      assert.ok(htmlBody.includes("window.opener.postMessage(payload, window.location.origin)"))

      const accounts = await service.listAccounts({ platform: "tiktok" })
      const connectedAccount = accounts[0]
      assert.ok(connectedAccount.metadata?.connection_verified_at)

      // Test scope validation failure when a required scope is missing
      await assert.rejects(
        () =>
          accountConnectedWorkflow(scope as never).run({
            input: {
              account_id: connectedAccount.id,
              platform: "tiktok",
              required_scopes: ["user.info.basic", "live.room.manage"],
            },
          }),
        (err: unknown) =>
          err instanceof MedusaError &&
          err.message.includes("missing required OAuth scopes: live.room.manage")
      )

      // Test compensation function restoring previous metadata
      await (
        initialAccountSyncStep as unknown as {
          compensate?: (data: unknown, ctx: { container: unknown }) => Promise<void>
        }
      ).compensate?.(
        {
          accountId: connectedAccount.id,
          previousMetadata: { restored: true },
        },
        { container: scope }
      )
      const afterCompensate = await service.getAccount(connectedAccount.id)
      assert.deepEqual(afterCompensate.metadata, { restored: true })
    })
  })
})





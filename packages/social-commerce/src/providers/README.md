# Providers

Platform API adapters for TikTok / TikTok Shop and Meta Graph API (Instagram Professional & Facebook Pages).

```
providers/
└── README.md
```

---

## Location

The social network provider implementations live inside the `social_commerce` module under `src/modules/social-commerce/providers/` and are re-exported from the package root (`@vicacha-devs/medusa-plugin-social-commerce`):

```
src/modules/social-commerce/providers/
├── index.ts                Re-exports TikTokProvider & MetaGraphProvider
├── tiktok.provider.ts      TikTok OAuth 2.0 + PKCE S256, TikTok Display API v2, TikTok Shop Catalog & HMAC-SHA256 webhooks
└── meta-graph.provider.ts  Instagram & Facebook Graph API v21.0, Meta Commerce Manager items_batch & sha256= webhooks
```

---

## Provider Capabilities

| Provider | Class | Supported Features |
| --- | --- | --- |
| **TikTok & TikTok Shop** | `TikTokProvider` | Authorization URL builder (`code_challenge_method=S256`), token exchange & refresh (`open.tiktokapis.com/v2/oauth/token/`), user profile (`/v2/user/info/`), video list (`/v2/video/list/`), TikTok Shop catalog batch sync, and `x-tts-signature` / `x-tiktok-signature` webhook verification |
| **Instagram & Facebook (Meta)** | `MetaGraphProvider` | Facebook & Instagram OAuth v21.0, short-to-long-lived token exchange (`fb_exchange_token`), Instagram media/reels (`/me/media`), 24h stories (`/me/stories`), live videos (`/live_videos`), Meta Commerce Manager `items_batch` catalog sync, and `x-hub-signature-256` webhook verification |

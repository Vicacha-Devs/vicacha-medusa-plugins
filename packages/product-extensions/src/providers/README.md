# Providers

Directory reserved for external module providers in `@vicacha-devs/medusa-plugin-product-extensions`.

```
providers/
└── README.md
```

---

## Overview

`@vicacha-devs/medusa-plugin-product-extensions` parses and normalizes multi-provider video URLs (Medusa File Module MP4/WebM/HLS, YouTube, Vimeo, Mux, and Cloudflare Stream) directly via `src/modules/product-ext/utils/media-parser.ts` (`parseVideoProviderUrl` and `normalizeVideoList`) without requiring external provider registration.

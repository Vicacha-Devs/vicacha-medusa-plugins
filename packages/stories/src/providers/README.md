# Providers

Directory reserved for external module providers in `@vicacha-devs/medusa-plugin-stories`.

```
providers/
└── README.md
```

---

## Overview

`@vicacha-devs/medusa-plugin-stories` validates and renders 9:16 image and video URLs directly from Medusa's core File Module or any HTTPS CDN (`sanitizeSafeUrl` in `src/modules/story/utils/security.ts`), so no custom provider registration is required.

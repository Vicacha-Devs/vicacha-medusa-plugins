# Payment Providers (`src/providers`)

Medusa v2 Payment Module provider implementations for Bold.co (`@vicacha-devs/medusa-plugin-payment-bold/providers/payment-bold`).

```text
providers/
└── payment-bold/
    ├── index.ts                    # ModuleProvider(Modules.PAYMENT, { services: [...] })
    ├── core/
    │   └── bold-base.ts            # Abstract BoldBaseProvider (HTTP client, HMAC verification, terminals)
    ├── services/
    │   ├── bold-online.ts          # BoldOnlineProviderService (identifier: "bold-online")
    │   ├── bold-terminal.ts        # BoldTerminalProviderService (identifier: "bold-terminal")
    │   └── bold-link.ts            # BoldLinkProviderService (identifier: "bold-link")
    ├── types/
    │   └── index.ts                # BoldOptions, BoldWebhookPayload, BoldTerminal, BoldCreateLinkPayload
    └── __tests__/
        └── bold-provider.spec.ts   # Unit tests for integrity hash, POS push, payment links, and HMAC webhooks
```

---

## Registered Provider Services

1. **`BoldOnlineProviderService` (`bold-online`)**:
   - Generates Bold Checkout widget parameters (`orderId`, `amount`, `currency`, `apiKey`, and SHA-256 `integritySignature`) during `initiatePayment`.
2. **`BoldTerminalProviderService` (`bold-terminal`)**:
   - Dispatches physical Smart POS Dataphone payment requests (`POST /v1/payments/app-checkout`) with `terminal_model`, `terminal_serial`, `user_email`, and `reference`.
3. **`BoldLinkProviderService` (`bold-link`)**:
   - Generates remote payment links (`POST /online/link/v1`) and supports on-demand status polling (`GET /online/link/v1/:linkId`) in `getPaymentStatus` and `authorizePayment`.

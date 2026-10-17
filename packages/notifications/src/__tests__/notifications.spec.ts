import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { describe, it } from "node:test"
import {
  getNotificationTranslations,
  normalizeLocale,
} from "../modules/notifications/i18n"
import {
  resolveB2BNotificationContacts,
  resolveOrderDocumentAttachments,
} from "../modules/notifications/integrations/documents-and-b2b-resolver"
import { renderNotificationTemplate } from "../modules/notifications/renderer"
import {
  applyVariableMap,
  multiInterpolateObject,
  multiInterpolateString,
} from "../modules/notifications/utils/interpolation"
import {
  buildIdempotencyKey,
  calculateSmsSegments,
  ChannelRateLimiter,
  escapeHtml,
  extractOtpCode,
  isValidE164Phone,
  isValidTelegramRecipient,
  maskRecipientPii,
  normalizeE164Phone,
  redactSensitivePayload,
  sanitizeNotificationHtml,
  sanitizeTelegramHtml,
  toWhatsAppDigitsOnly,
  validateSafeExternalUrl,
  verifyWebhookHmacSignature,
} from "../modules/notifications/utils/security"
import {
  buildBlockTreeFromFlatBlocks,
  getSystemPresetById,
  SYSTEM_TEMPLATE_PRESETS,
} from "../modules/notifications/utils/system-presets"
import {
  getMockContextByType,
  transformOrderData,
  transformShipmentData,
} from "../modules/notifications/utils/transformers"
import {
  clearInMemorySandboxMessages,
  DummySandboxNotificationProviderService,
  getInMemorySandboxMessages,
} from "../providers/dummy-sandbox"
import { SmsNotificationProviderService } from "../providers/sms"
import { TelegramNotificationProviderService } from "../providers/telegram"
import { WhatsAppNotificationProviderService } from "../providers/whatsapp"

describe("medusa-plugin-notifications — Security & Phone/Channel Normalization", () => {
  it("1. normalizes E.164 phone numbers and strips leading + for Meta WhatsApp Graph API", () => {
    assert.equal(normalizeE164Phone("+1 (415) 555-2671"), "+14155552671")
    assert.equal(normalizeE164Phone("0049301234567"), "+49301234567")
    assert.equal(normalizeE164Phone("917567273055"), "+917567273055")
    assert.equal(normalizeE164Phone("invalid-phone"), null)
    assert.equal(isValidE164Phone("+14155552671"), true)
    assert.equal(toWhatsAppDigitsOnly("+91 756-727-3055"), "917567273055")
  })

  it("2. validates Telegram channel IDs (-100..., @channel, and direct numeric chat_id)", () => {
    assert.equal(isValidTelegramRecipient("-1001987654321"), true)
    assert.equal(isValidTelegramRecipient("@medusa_store_alerts"), true)
    assert.equal(isValidTelegramRecipient("987654321"), true)
    assert.equal(isValidTelegramRecipient("bad channel!"), false)
  })

  it("3. masks recipient PII and redacts secrets/tokens/base64 buffers in delivery logs", () => {
    assert.equal(maskRecipientPii("alex.rivera@example.com"), "a***a@example.com")
    assert.equal(maskRecipientPii("+14155552671"), "***-***-2671")
    assert.equal(maskRecipientPii("@public_channel"), "@public_channel")

    const redacted = redactSensitivePayload({
      to: "+14155552671",
      access_token: "EAABs123456",
      smtp_password: "super-secret-password",
      otp_code: "482910",
      attachments: [
        {
          filename: "invoice.pdf",
          content: "A".repeat(400),
        },
      ],
    }) as Record<string, any>

    assert.equal(redacted.to, "***-***-2671")
    assert.equal(redacted.access_token, "[REDACTED]")
    assert.equal(redacted.smtp_password, "[REDACTED]")
    assert.equal(redacted.otp_code, "[REDACTED]")
    assert.equal(redacted.attachments[0].content, "[REDACTED_BASE64_400_CHARS]")
  })

  it("4. prevents XSS in custom HTML and Telegram HTML while preserving allowed Telegram tags", () => {
    const dirtyHtml = `<div onclick="alert(1)"><script>evil()</script><a href="javascript:alert(2)">Click</a><p>Safe</p></div>`
    const cleanHtml = sanitizeNotificationHtml(dirtyHtml)
    assert.equal(cleanHtml.includes("<script>"), false)
    assert.equal(cleanHtml.includes("onclick="), false)
    assert.equal(cleanHtml.includes("javascript:"), false)
    assert.equal(cleanHtml.includes("<p>Safe</p>"), true)

    const tgInput = `<b>Order #1042</b> for <script>x</script> & <a href="https://store.example.com/orders/1">Track</a>`
    const cleanTg = sanitizeTelegramHtml(tgInput)
    assert.equal(cleanTg.includes("<b>Order #1042</b>"), true)
    assert.equal(cleanTg.includes("&lt;script&gt;x&lt;/script&gt;"), true)
    assert.equal(
      cleanTg.includes('<a href="https://store.example.com/orders/1">Track</a>'),
      true
    )
  })

  it("5. blocks SSRF against cloud metadata and RFC1918 private IPs", () => {
    assert.equal(
      validateSafeExternalUrl("http://169.254.169.254/latest/meta-data/").valid,
      false
    )
    assert.equal(
      validateSafeExternalUrl("http://10.0.0.15:8080/sendText").valid,
      false
    )
    assert.equal(
      validateSafeExternalUrl("http://192.168.1.10:3000/api").valid,
      false
    )
    assert.equal(
      validateSafeExternalUrl("http://127.0.0.1:8082/sendText", {
        allowLocalhost: false,
      }).valid,
      false
    )
    assert.equal(
      validateSafeExternalUrl("http://127.0.0.1:8082/sendText", {
        allowLocalhost: true,
      }).valid,
      true
    )
    assert.equal(
      validateSafeExternalUrl("https://graph.facebook.com/v22.0/123/messages")
        .valid,
      true
    )
  })

  it("6. verifies HMAC-SHA256 webhook signatures in constant time", () => {
    const rawBody = JSON.stringify({ from: "+14155552671", text: "JOIN" })
    const secret = "whsec_test_secret_key_9988"
    const validSig = createHmac("sha256", secret).update(rawBody).digest("hex")

    assert.equal(
      verifyWebhookHmacSignature(rawBody, `sha256=${validSig}`, secret),
      true
    )
    assert.equal(
      verifyWebhookHmacSignature(rawBody, "sha256=deadbeef", secret),
      false
    )
  })
})

describe("medusa-plugin-notifications — Interpolation, i18n, and Multi-Channel Rendering", () => {
  it("7. resolves two-prefix ({{data.*}}, {{translations.*}}) and Go-style ({{ .var }}) placeholders recursively", () => {
    const translations = getNotificationTranslations("es")
    const orderData = getMockContextByType("order", { storeName: "Nordic Lab" }, "es")
    const mapped = applyVariableMap(orderData, {
      first_name: "customer.first_name",
      first_item: "items.0.title",
    })

    const result = multiInterpolateString(
      "{{translations.order.placedSubject}} - {{ .first_name }} ordered {{data.first_item}} at {{ .StoreName }}",
      { data: mapped, translations }
    )
    assert.equal(
      result,
      "Pedido #1042 Confirmado - Alex ordered Mechanical Wireless Keyboard Pro at Nordic Lab"
    )
  })

  it("8. renders Email system preset block tree (with repeater & product-item) into responsive HTML and plaintext", () => {
    const preset = getSystemPresetById("system_email_order_placed")!
    assert.ok(preset)
    const blocks = buildBlockTreeFromFlatBlocks(preset.blocks)
    const data = getMockContextByType("order", { storeName: "Keycraft Store" }, "en")

    const rendered = renderNotificationTemplate({
      template_id: preset.id,
      template_name: preset.name,
      channel: "email",
      mode: "blocks",
      locale: "en",
      subject: preset.subject,
      blocks,
      data,
    })

    assert.equal(rendered.channel, "email")
    assert.equal(rendered.subject, "Order #1042 Confirmed")
    assert.ok(rendered.html?.includes("Mechanical Wireless Keyboard Pro"))
    assert.ok(rendered.html?.includes("Coiled Aviator USB-C Cable"))
    assert.ok(rendered.text.includes("Mechanical Wireless Keyboard Pro"))
  })

  it("9. renders WhatsApp preset with interactive buttons and Meta WABA template parameters", () => {
    const preset = getSystemPresetById("system_whatsapp_order_placed")!
    const blocks = buildBlockTreeFromFlatBlocks(preset.blocks)
    const data = getMockContextByType("order", { storeName: "Keycraft Store" }, "de")

    const rendered = renderNotificationTemplate({
      template_id: preset.id,
      template_name: preset.name,
      channel: "whatsapp",
      mode: "blocks",
      locale: "de",
      blocks,
      variable_map: preset.variable_map,
      meta_template_name: preset.meta_template_name,
      data,
    })

    assert.equal(rendered.channel, "whatsapp")
    assert.equal(rendered.whatsapp_options?.meta_template_name, "order_confirmation")
    assert.equal(
      rendered.whatsapp_options?.meta_components?.[0]?.parameters?.length,
      3
    )
    assert.equal(rendered.whatsapp_options?.buttons?.length, 2)
    assert.ok(rendered.text.includes("Vielen Dank für Ihre Bestellung!"))
  })

  it("10. renders Telegram preset with HTML formatting, InlineKeyboard buttons, and Forum Topic thread_id", () => {
    const preset = getSystemPresetById("system_telegram_order_placed")!
    const blocks = buildBlockTreeFromFlatBlocks(preset.blocks)
    const data = getMockContextByType("order", {}, "en")

    const rendered = renderNotificationTemplate({
      template_id: preset.id,
      template_name: preset.name,
      channel: "telegram",
      mode: "blocks",
      locale: "en",
      blocks,
      data,
      telegram_thread_id: 42,
    })

    assert.equal(rendered.channel, "telegram")
    assert.equal(rendered.telegram_options?.parse_mode, "HTML")
    assert.equal(rendered.telegram_options?.message_thread_id, 42)
    assert.equal(
      rendered.telegram_options?.inline_keyboard?.[0]?.length,
      2
    )
    assert.ok(
      rendered.text.includes("<b>🛒 Thank you for your order! (#1042)</b>")
    )
  })

  it("11. calculates GSM-7 vs UCS-2 SMS segments and appends TCPA STOP footer on first message", () => {
    const preset = getSystemPresetById("system_sms_order_placed")!
    const data = getMockContextByType("order", { storeName: "Acme" }, "en")

    const rendered = renderNotificationTemplate({
      template_id: preset.id,
      template_name: preset.name,
      channel: "sms",
      mode: "raw",
      locale: "en",
      raw_content: preset.raw_content,
      data,
      append_sms_consent_footer: true,
    })

    assert.equal(rendered.sms_options?.consent_footer_appended, true)
    assert.ok(rendered.text.endsWith("Reply STOP to opt out."))
    assert.equal(rendered.sms_options?.encoding, "GSM-7")
    assert.ok((rendered.sms_options?.segments || 0) >= 1)

    const emojiStats = calculateSmsSegments("Order confirmed 🎉🛍️")
    assert.equal(emojiStats.encoding, "UCS-2")
    assert.equal(emojiStats.segments, 1)
  })

  it("12. renders Slack Block Kit JSON with header, section, divider, and actions", () => {
    const preset = getSystemPresetById("system_slack_order_placed")!
    const blocks = buildBlockTreeFromFlatBlocks(preset.blocks)
    const data = getMockContextByType("order", {}, "en")

    const rendered = renderNotificationTemplate({
      template_id: preset.id,
      template_name: preset.name,
      channel: "slack",
      mode: "blocks",
      blocks,
      data,
    })

    assert.equal(rendered.channel, "slack")
    assert.ok(Array.isArray(rendered.blocks_json))
    assert.equal(rendered.blocks_json?.[0]?.type, "header")
    assert.equal(rendered.blocks_json?.[3]?.type, "actions")
  })

  it("12b. (v1.1.0) scans data in a single pass, keeps $& / $1 / {{...}} literal in data, and escapes data HTML but not translation HTML", () => {
    const rendered = renderNotificationTemplate({
      template_id: "test_v110_escape",
      template_name: "test_v110_escape",
      channel: "email",
      mode: "blocks",
      locale: "en",
      translations: {
        general: {
          richNotice: "<strong>Trusted Translation</strong> for {{data.customer}}",
        },
      },
      data: {
        customer: "A < B & C",
        literalPattern: "$& $1",
        nestedInjection: "{{data.secret}}",
        secret: "LEAKED_SECRET",
      },
      blocks: [
        {
          id: "t1",
          type: "text",
          position: 0,
          metadata: { text: "{{translations.richNotice}}" },
        },
        {
          id: "t2",
          type: "text",
          position: 1,
          metadata: {
            text: "Pattern: {{data.literalPattern}} | Injection: {{data.nestedInjection}}",
          },
        },
        {
          id: "r1",
          type: "row",
          position: 2,
          metadata: { label: "Row", value: "<b>{{data.customer}}</b>" },
        },
      ],
    })

    // Translation HTML stays unescaped, while data value inside it is HTML-escaped
    assert.ok(
      rendered.html?.includes(
        "<strong>Trusted Translation</strong> for A &lt; B &amp; C"
      )
    )
    // Replacement patterns ($&, $1) and nested placeholders ({{data.secret}}) in data remain literal
    assert.ok(rendered.text.includes("Pattern: $& $1 | Injection: {{data.secret}}"))
    assert.equal(rendered.text.includes("LEAKED_SECRET"), false)
    assert.equal(rendered.html?.includes("LEAKED_SECRET"), false)
  })

  it("12c. (v1.1.0) skips empty heading, text, and row blocks and supports repeater emptyBlocks & {{data.<arrayPath>.<field>}}", () => {
    const blocksWithRepeater: any[] = [
      {
        id: "empty_h",
        type: "heading",
        position: 0,
        metadata: { text: "{{data.missing_heading}}" },
      },
      {
        id: "empty_t",
        type: "text",
        position: 1,
        metadata: { text: "   " },
      },
      {
        id: "empty_r",
        type: "row",
        position: 2,
        metadata: { label: "Optional Discount", value: "{{data.missing_row}}" },
      },
      {
        id: "rep_rows",
        type: "repeater",
        position: 3,
        metadata: {
          arrayPath: "rows",
          itemBlocks: [
            {
              id: "item_h",
              type: "heading",
              position: 0,
              props: { value: "{{data.rows.title}}" },
            },
            {
              id: "item_sec",
              type: "section",
              position: 1,
              props: {
                blocks: [
                  {
                    id: "item_msg",
                    type: "text",
                    position: 0,
                    props: { value: "{{data.rows.message}}" },
                  },
                ],
              },
            },
          ],
          emptyBlocks: [
            {
              id: "empty_fallback",
              type: "text",
              position: 0,
              props: { value: "Nothing to report" },
            },
          ],
        },
      },
    ]

    const populated = renderNotificationTemplate({
      template_id: "test_repeater",
      template_name: "test_repeater",
      channel: "email",
      mode: "blocks",
      blocks: blocksWithRepeater,
      data: {
        rows: [
          { title: "T1", message: "M1" },
          { title: "T2", message: "M2" },
        ],
      },
    })

    // Empty heading and empty row were skipped
    assert.equal(populated.html?.includes("Optional Discount"), false)
    // Repeater items rendered in order and nested section read {{data.rows.message}}
    assert.equal(populated.text, "T1\n\nM1\n\nT2\n\nM2")

    const emptyList = renderNotificationTemplate({
      template_id: "test_repeater_empty",
      template_name: "test_repeater_empty",
      channel: "email",
      mode: "blocks",
      blocks: blocksWithRepeater,
      data: { rows: [] },
    })

    assert.equal(emptyList.html?.includes("{{"), false)
    assert.ok(emptyList.html?.includes("Nothing to report"))
    assert.equal(emptyList.text, "Nothing to report")
  })

  it("12d. (v1.1.0) loads external templates from module or path, logs errors on broken paths, and supports unescaped subject override", async () => {
    const { NotificationsModuleService } = await import(
      "../modules/notifications/service"
    )
    const loggedErrors: string[] = []
    const loggedInfos: string[] = []
    const mockLogger = {
      info: (msg: string) => loggedInfos.push(msg),
      error: (msg: string) => loggedErrors.push(msg),
    }

    const service = new NotificationsModuleService(
      { logger: mockLogger },
      {
        extend: {
          services: [
            {
              id: "email",
              templates: [
                {
                  name: "external_order-summary",
                  module: {
                    translations: {
                      en: {
                        general: {
                          headerTitle: "Report {{data.job_id}}",
                        },
                      },
                    },
                    templateBlocks: [
                      {
                        id: "title",
                        type: "heading",
                        props: { value: "{{translations.headerTitle}}" },
                      },
                      {
                        id: "total",
                        type: "row",
                        props: { label: "Job", value: "{{data.job_id}}" },
                      },
                    ],
                  },
                },
                {
                  name: "external_broken",
                  path: "/non-existent-path/does-not-exist",
                },
              ],
            },
          ],
        },
      }
    )

    assert.equal(
      loggedInfos.some((m) => m.includes('"external_order-summary"')),
      true
    )
    assert.equal(
      loggedErrors.some((m) => m.includes('"external_broken"')),
      true
    )

    const defaultSubj = await service.renderTemplateById({
      template_id: "external_order-summary",
      data: { job_id: "A&B" },
      locale: "en",
    })
    assert.equal(defaultSubj.subject, "Report A&B")
    assert.ok(defaultSubj.html?.includes("Report A&amp;B"))

    const customSubj = await service.renderTemplateById({
      template_id: "external_order-summary",
      data: { job_id: "A&B" },
      locale: "en",
      subject: "Sync {{data.job_id}}",
    })
    assert.equal(customSubj.subject, "Sync A&B")
  })
})

describe("medusa-plugin-notifications — Multi-Driver Providers & Sibling Integration", () => {
  it("13. builds requests for all 4 WhatsApp drivers (meta-cloud, openwa, waha, evolution) including PDF invoice attachments", () => {
    const waProvider = new WhatsAppNotificationProviderService({}, {
      phoneNumberId: "10987654321",
      accessToken: "meta_tok_test",
      gatewayUrl: "http://127.0.0.1:8082",
      allowLocalhost: true,
    })

    // Meta Cloud API template request
    const metaReq = waProvider.buildDriverRequest({
      driver: "meta-cloud",
      to: "+1 (415) 555-2671",
      text: "Hello Alex",
      whatsappOptions: {
        meta_template_name: "order_confirmation",
        meta_language_code: "en",
        meta_components: [
          { type: "body", parameters: [{ type: "text", text: "1042" }] },
        ],
      },
    })
    assert.equal(metaReq.driver, "meta-cloud")
    assert.equal(metaReq.body.to, "14155552671") // stripped leading +
    assert.equal(metaReq.body.type, "template")
    assert.equal(metaReq.body.template.name, "order_confirmation")

    // OpenWA (@open-wa/wa-automate) PDF attachment request
    const openWaDocReq = waProvider.buildDriverRequest({
      driver: "openwa",
      to: "+14155552671",
      text: "Here is your invoice",
      attachments: [
        {
          filename: "invoice-INV-2026-0001.pdf",
          content: Buffer.from("%PDF-1.4 mock").toString("base64"),
          content_type: "application/pdf",
        },
      ],
    })
    assert.equal(openWaDocReq.driver, "openwa")
    assert.equal(openWaDocReq.endpoint, "http://127.0.0.1:8082/sendFile")
    assert.equal(openWaDocReq.body.args.to, "14155552671@c.us")
    assert.ok(
      String(openWaDocReq.body.args.file).startsWith(
        "data:application/pdf;base64,"
      )
    )

    // WAHA request
    const wahaReq = waProvider.buildDriverRequest({
      driver: "waha",
      to: "+14155552671",
      text: "Order shipped",
    })
    assert.equal(wahaReq.driver, "waha")
    assert.equal(wahaReq.endpoint, "http://127.0.0.1:8082/api/sendText")
    assert.equal(wahaReq.body.chatId, "14155552671@c.us")

    // Evolution API v2 request
    const evoReq = waProvider.buildDriverRequest({
      driver: "evolution",
      to: "+14155552671",
      text: "Order shipped",
    })
    assert.equal(evoReq.driver, "evolution")
    assert.ok(evoReq.endpoint.includes("/message/sendText/"))
    assert.equal(evoReq.body.number, "14155552671")
  })

  it("14. builds SMS requests across Twilio (SMS/MMS + 20xxx error classification), Signal House, MSG91, and SMSAPI", () => {
    const smsProvider = new SmsNotificationProviderService({}, {
      account_sid: "AC12345",
      auth_token: "tw_tok",
      messaging_service_sid: "MG998877",
    })

    const twilioReq = smsProvider.buildDriverRequest({
      driver: "twilio",
      to: "+14155552671",
      text: "Your OTP is 482910",
      mediaUrls: ["https://cdn.example.com/receipt.png"],
    })
    assert.equal(twilioReq.driver, "twilio")
    assert.equal(twilioReq.isFormEncoded, true)
    assert.ok(String(twilioReq.body).includes("MessagingServiceSid=MG998877"))
    assert.ok(
      String(twilioReq.body).includes(
        "MediaUrl=https%3A%2F%2Fcdn.example.com%2Freceipt.png"
      )
    )

    // Validation errors (20000-20999) are not retried, network 503 errors are retried
    assert.equal(smsProvider.isRetryableSmsError({ code: 21211 }), false)
    assert.equal(smsProvider.isRetryableSmsError({ status: 503 }), true)

    const shReq = smsProvider.buildDriverRequest({
      driver: "signalhouse",
      to: "+14155552671",
      text: "Cart recovery link",
    })
    assert.equal(shReq.driver, "signalhouse")
    assert.equal(shReq.endpoint, "https://v2.signalhouse.io/message/sendSMS")
  })

  it("15. enforces Telegram rate limiting (30 msg/s global, 1 msg/s per chat) and builds forum topic payload", () => {
    const tgProvider = new TelegramNotificationProviderService({}, {})
    const payload = tgProvider.buildTelegramPayload({
      chatId: "-1001234567890",
      text: "<b>Order #1042</b>",
      messageThreadId: 19,
      inlineKeyboard: [[{ text: "View", url: "https://store.example.com" }]],
    })

    assert.equal(payload.chat_id, "-1001234567890")
    assert.equal(payload.message_thread_id, 19)
    assert.equal(payload.parse_mode, "HTML")
    assert.equal(payload.reply_markup.inline_keyboard[0][0].text, "View")

    const limiter = new ChannelRateLimiter()
    const first = limiter.scheduleSend({
      recipient: "-1001234567890",
      globalRatePerSec: 30,
      perRecipientRatePerSec: 1,
      nowMs: 1000,
    })
    const secondSameChat = limiter.scheduleSend({
      recipient: "-1001234567890",
      globalRatePerSec: 30,
      perRecipientRatePerSec: 1,
      nowMs: 1000,
    })

    assert.equal(first.allowedImmediately, true)
    assert.equal(first.delayMs, 0)
    assert.equal(secondSameChat.allowedImmediately, false)
    assert.equal(secondSameChat.delayMs, 1000)
  })

  it("16. captures OTPs in DummySandboxNotificationProviderService and resolves PDF invoices from medusa-documents-plugin", async () => {
    clearInMemorySandboxMessages()
    const dummyProvider = new DummySandboxNotificationProviderService({}, {})

    const res = await dummyProvider.send({
      to: "+14155552671",
      channel: "sms",
      content: {
        text: "Your Medusa Store verification code is 739201. Valid for 10 minutes.",
      },
    } as any)

    assert.ok(res.id.startsWith("sbx_"))
    const captured = getInMemorySandboxMessages(10, 0)
    assert.equal(captured.count, 1)
    assert.equal(captured.messages[0].otp_code, "739201")
    assert.equal(extractOtpCode("Code: 884422"), "884422")

    // Test zero-hard-dependency medusa-documents-plugin attachment resolver
    const mockContainer = {
      resolve(key: string) {
        if (key === "documentsModuleService") {
          return {
            async listDocuments() {
              return [{ id: "doc_01", document_number: "INV-2026-0042" }]
            },
            async getDocumentPdfBuffer() {
              return {
                buffer: Buffer.from("%PDF-1.4 invoice content"),
                document: { id: "doc_01", document_number: "INV-2026-0042" },
              }
            },
          }
        }
        throw new Error("not found")
      },
    }

    const attachments = await resolveOrderDocumentAttachments(
      mockContainer,
      "order_01",
      ["invoice"]
    )
    assert.equal(attachments.length, 1)
    assert.equal(attachments[0].filename, "invoice-INV-2026-0042.pdf")
    assert.equal(attachments[0].content_type, "application/pdf")

    const b2bContacts = await resolveB2BNotificationContacts(null, {
      id: "order_01",
      email: "buyer@company.com",
      metadata: {
        b2b_accounting_email: "ap@company.com",
        telegram_chat_id: "55443322",
      },
    })
    assert.equal(b2bContacts.accounting_email, "ap@company.com")
    assert.equal(b2bContacts.telegram_chat_id, "55443322")
  })

  it("17. generates deterministic idempotency keys and supports all 10 locales (including es, tr, ar with RTL)", () => {
    const key1 = buildIdempotencyKey({
      event_name: "order.placed",
      entity_id: "order_01",
      channel: "whatsapp",
      template_id: "system_whatsapp_order_placed",
      recipient: "+14155552671",
    })
    const key2 = buildIdempotencyKey({
      event_name: "order.placed",
      entity_id: "order_01",
      channel: "whatsapp",
      template_id: "system_whatsapp_order_placed",
      recipient: "+14155552671",
    })
    assert.equal(key1, key2)
    assert.equal(normalizeLocale("es-ES"), "es")
    assert.equal(normalizeLocale("tr-TR"), "tr")
    assert.equal(normalizeLocale("ar-SA"), "ar")
    assert.equal(normalizeLocale("pt-BR"), "pt")
    assert.equal(normalizeLocale("nl-NL"), "nl")

    const trDict = getNotificationTranslations("tr")
    assert.equal(trDict.general.hello, "Merhaba")
    const arDict = getNotificationTranslations("ar")
    assert.equal(arDict.general.hello, "مرحباً")

    const preset = getSystemPresetById("system_email_order_placed")!
    const arEmail = renderNotificationTemplate({
      template_id: preset.id,
      template_name: preset.name,
      channel: "email",
      mode: "blocks",
      locale: "ar",
      subject: preset.subject,
      blocks: buildBlockTreeFromFlatBlocks(preset.blocks),
      data: getMockContextByType("order", { storeName: "Souq Store" }, "ar"),
    })
    assert.ok(arEmail.html?.includes('dir="rtl"'))
    assert.ok(arEmail.subject?.includes("تم تأكيد الطلب #1042"))
    assert.equal(SYSTEM_TEMPLATE_PRESETS.length >= 11, true)
  })
})

describe("NotificationsApiClient SDK & Query Keys", async () => {
  const {
    NotificationsApiClient,
    notificationsQueryKeys,
    invalidateNotificationsQueries,
    subscribeNotificationsQueryInvalidation,
  } = await import("../sdk")

  it("builds query keys and notifies invalidation subscribers", () => {
    assert.deepEqual(notificationsQueryKeys.all, ["notifications"])
    assert.deepEqual(notificationsQueryKeys.orderLogs("order_42"), [
      "notifications",
      "logs",
      "order",
      "order_42",
    ])

    const invalidated: Array<readonly unknown[]> = []
    const unsubscribe = subscribeNotificationsQueryInvalidation((prefix) => {
      invalidated.push(prefix)
    })
    invalidateNotificationsQueries(notificationsQueryKeys.templatesAll())
    unsubscribe()
    assert.equal(invalidated.length, 1)
    assert.deepEqual(invalidated[0], ["notifications", "templates"])
  })

  it("executes typed Admin MPN and Store Consent requests via NotificationsApiClient", async () => {
    const requests: Array<{ url: string; method?: string; headers?: any }> = []
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      requests.push({ url, method: init?.method, headers: init?.headers })
      if (url.endsWith("/mpn/consent")) {
        return new Response(
          JSON.stringify({
            success: true,
            consent: {
              id: "con_1",
              channel: "sms",
              identifier_masked: "+1415***2671",
              status: "opted_in",
            },
          }),
          { status: 200 }
        )
      }
      return new Response(
        JSON.stringify({
          success: true,
          templates: [{ id: "system_email_order_placed", label: "Order Placed" }],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const adminSdk = new NotificationsApiClient("/admin", "http://localhost:9000", {
      fetchImpl: mockFetch,
    })
    const storeSdk = new NotificationsApiClient("/store", "http://localhost:9000", {
      fetchImpl: mockFetch,
      publishableApiKey: "pk_live_abc",
    })

    const tplRes = await adminSdk.listTemplates({ channel: "email" })
    assert.equal(tplRes.templates.length, 1)
    assert.equal(
      requests[0].url,
      "http://localhost:9000/admin/mpn/templates?channel=email"
    )

    const consentRes = await storeSdk.updateConsent({
      identifier: "+14155552671",
      channel: "sms",
      action: "opt_in",
    })
    assert.equal(consentRes.consent.status, "opted_in")
    assert.equal(requests[1].headers["x-publishable-api-key"], "pk_live_abc")
  })
})


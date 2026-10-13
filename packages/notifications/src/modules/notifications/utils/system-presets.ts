import type {
  BlockType,
  SystemTemplatePreset,
  TemplateBlockNode,
} from "../../../types"

export type { SystemTemplatePreset } from "../../../types"

/**
 * Converts a flat array of block rows (`mpn_template_block` or preset blocks)
 * into a hierarchical tree sorted by `position`.
 */
export function buildBlockTreeFromFlatBlocks(
  flatBlocks: Array<{
    id: string
    type: BlockType | string
    position?: number
    parent_id?: string | null
    metadata?: Record<string, any> | null
  }>
): TemplateBlockNode[] {
  const nodeMap = new Map<string, TemplateBlockNode>()
  const roots: TemplateBlockNode[] = []

  const sorted = [...flatBlocks].sort(
    (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)
  )

  for (const item of sorted) {
    nodeMap.set(item.id, {
      id: item.id,
      type: item.type as BlockType,
      position: Number(item.position ?? 0),
      parent_id: item.parent_id ?? null,
      metadata: item.metadata ? { ...item.metadata } : {},
      children: [],
    })
  }

  for (const item of sorted) {
    const node = nodeMap.get(item.id)!
    if (item.parent_id && nodeMap.has(item.parent_id)) {
      nodeMap.get(item.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export const SYSTEM_TEMPLATE_PRESETS: SystemTemplatePreset[] = [
  // =========================================================================
  // 1. EMAIL PRESETS (codee-sh Visual Block Tree + @sam-ael Raw HTML)
  // =========================================================================
  {
    id: "system_email_order_placed",
    name: "order-placed-email",
    label: "Order Placed Confirmation (Email)",
    description:
      "Responsive order confirmation email with line-item repeater, totals breakdown, and order status CTA button.",
    channel: "email",
    mode: "blocks",
    default_event: "order.placed",
    subject: "{{translations.order.placedSubject}}",
    blocks: [
      {
        id: "blk_ep_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          level: 1,
          align: "center",
          text: "{{translations.order.placedTitle}}",
        },
      },
      {
        id: "blk_ep_2",
        type: "text",
        position: 1,
        parent_id: null,
        metadata: {
          align: "left",
          text: "{{translations.general.hello}} {{data.first_name}}, {{translations.order.placedIntro}}",
        },
      },
      {
        id: "blk_ep_3",
        type: "separator",
        position: 2,
        parent_id: null,
        metadata: {},
      },
      {
        id: "blk_ep_4",
        type: "heading",
        position: 3,
        parent_id: null,
        metadata: {
          level: 2,
          text: "{{translations.order.itemsHeader}} (#{{data.display_id}})",
        },
      },
      {
        id: "blk_ep_5",
        type: "repeater",
        position: 4,
        parent_id: null,
        metadata: {
          arrayKey: "items",
        },
      },
      {
        id: "blk_ep_5_child",
        type: "product-item",
        position: 0,
        parent_id: "blk_ep_5",
        metadata: {
          variant: "order_item",
          showSku: true,
          showThumbnail: true,
        },
      },
      {
        id: "blk_ep_6",
        type: "separator",
        position: 5,
        parent_id: null,
        metadata: {},
      },
      {
        id: "blk_ep_7",
        type: "row",
        position: 6,
        parent_id: null,
        metadata: {
          label: "{{translations.order.subtotal}}",
          value: "{{data.subtotal_formatted}}",
        },
      },
      {
        id: "blk_ep_8",
        type: "row",
        position: 7,
        parent_id: null,
        metadata: {
          label: "{{translations.order.shipping}}",
          value: "{{data.shipping_total_formatted}}",
        },
      },
      {
        id: "blk_ep_9",
        type: "row",
        position: 8,
        parent_id: null,
        metadata: {
          label: "{{translations.order.tax}}",
          value: "{{data.tax_total_formatted}}",
        },
      },
      {
        id: "blk_ep_10",
        type: "row",
        position: 9,
        parent_id: null,
        metadata: {
          label: "{{translations.order.total}}",
          value: "{{data.total_formatted}}",
          bold: true,
        },
      },
      {
        id: "blk_ep_11",
        type: "button",
        position: 10,
        parent_id: null,
        metadata: {
          text: "{{translations.order.trackOrderButton}}",
          url: "{{data.order_url}}",
          align: "center",
        },
      },
    ],
  },
  {
    id: "system_email_shipment_created",
    name: "shipment-created-email",
    label: "Order Shipped with Tracking (Email)",
    description:
      "Notifies the customer when a shipment is created with carrier and tracking link.",
    channel: "email",
    mode: "blocks",
    default_event: "shipment.created",
    subject: "{{translations.shipment.shippedSubject}}",
    blocks: [
      {
        id: "blk_es_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          level: 1,
          text: "{{translations.shipment.shippedTitle}}",
        },
      },
      {
        id: "blk_es_2",
        type: "text",
        position: 1,
        parent_id: null,
        metadata: {
          text: "{{translations.general.hello}} {{data.first_name}}, {{translations.shipment.shippedIntro}}",
        },
      },
      {
        id: "blk_es_3",
        type: "row",
        position: 2,
        parent_id: null,
        metadata: {
          label: "{{translations.shipment.carrier}}",
          value: "{{data.carrier}}",
        },
      },
      {
        id: "blk_es_4",
        type: "row",
        position: 3,
        parent_id: null,
        metadata: {
          label: "{{translations.shipment.trackingNumber}}",
          value: "{{data.tracking_number}}",
          bold: true,
        },
      },
      {
        id: "blk_es_5",
        type: "button",
        position: 4,
        parent_id: null,
        metadata: {
          text: "{{translations.shipment.trackPackageButton}}",
          url: "{{data.tracking_url}}",
        },
      },
    ],
  },
  {
    id: "system_email_document_ready",
    name: "document-ready-email",
    label: "Commercial Document / Invoice Attached (Email)",
    description:
      "Delivers PDF Invoices, Packing Slips, or Credit Notes generated by medusa-documents-plugin.",
    channel: "email",
    mode: "blocks",
    default_event: "document.generated",
    subject: "{{translations.document.readySubject}}",
    blocks: [
      {
        id: "blk_ed_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          level: 1,
          text: "{{translations.document.readyTitle}}",
        },
      },
      {
        id: "blk_ed_2",
        type: "text",
        position: 1,
        parent_id: null,
        metadata: {
          text: "{{translations.general.hello}} {{data.first_name}}, {{translations.document.readyIntro}}",
        },
      },
      {
        id: "blk_ed_3",
        type: "attachment",
        position: 2,
        parent_id: null,
        metadata: {
          document_type: "invoice",
          description: "{{data.document_number}}.pdf",
        },
      },
    ],
  },
  {
    id: "system_email_inventory_low",
    name: "inventory-low-email",
    label: "Low Stock Alert (Email)",
    description: "Merchant alert when stock drops below threshold.",
    channel: "email",
    mode: "blocks",
    default_event: "inventory-level.updated",
    subject: "{{translations.inventory.lowStockSubject}}",
    blocks: [
      {
        id: "blk_ei_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          level: 1,
          text: "{{translations.inventory.lowStockTitle}}",
        },
      },
      {
        id: "blk_ei_2",
        type: "product-item",
        position: 1,
        parent_id: null,
        metadata: {
          variant: "inventory_item",
        },
      },
    ],
  },

  // =========================================================================
  // 2. WHATSAPP / OPENWA PRESETS (Meta Cloud Templates + OpenWA/WAHA Rich Text & Buttons)
  // =========================================================================
  {
    id: "system_whatsapp_order_placed",
    name: "order-placed-whatsapp",
    label: "Order Placed + Interactive Buttons (WhatsApp / OpenWA)",
    description:
      "Supports both OpenWA/WAHA/Evolution rich text with interactive buttons AND Meta Cloud API template parameters.",
    channel: "whatsapp",
    mode: "blocks",
    default_event: "order.placed",
    meta_template_name: "order_confirmation",
    meta_language_code: "en",
    variable_map: {
      customer_name: "first_name",
      order_id: "display_id",
      order_total: "total_formatted",
    },
    blocks: [
      {
        id: "blk_wa_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          text: "🛍️ {{translations.order.placedTitle}}",
        },
      },
      {
        id: "blk_wa_2",
        type: "text",
        position: 1,
        parent_id: null,
        metadata: {
          text: "{{translations.general.hello}} *{{data.first_name}}*! {{translations.order.placedIntro}}",
        },
      },
      {
        id: "blk_wa_3",
        type: "repeater",
        position: 2,
        parent_id: null,
        metadata: {
          arrayKey: "items",
        },
      },
      {
        id: "blk_wa_3_child",
        type: "product-item",
        position: 0,
        parent_id: "blk_wa_3",
        metadata: {
          variant: "order_item",
        },
      },
      {
        id: "blk_wa_4",
        type: "row",
        position: 3,
        parent_id: null,
        metadata: {
          label: "{{translations.order.total}}",
          value: "{{data.total_formatted}}",
          bold: true,
        },
      },
      {
        id: "blk_wa_5",
        type: "actions",
        position: 4,
        parent_id: null,
        metadata: {
          buttons: [
            {
              id: "btn_track_order",
              title: "{{translations.order.trackOrderButton}}",
              url: "{{data.order_url}}",
            },
            {
              id: "btn_visit_store",
              title: "{{translations.general.viewInStore}}",
              url: "{{data.store_url}}",
            },
          ],
        },
      },
    ],
  },
  {
    id: "system_whatsapp_shipment_created",
    name: "shipment-created-whatsapp",
    label: "Order Shipped Tracking Alert (WhatsApp / OpenWA)",
    description:
      "WhatsApp shipping notification with carrier, tracking code, and interactive tracking button.",
    channel: "whatsapp",
    mode: "blocks",
    default_event: "shipment.created",
    meta_template_name: "order_shipped",
    meta_language_code: "en",
    variable_map: {
      customer_name: "first_name",
      order_id: "order_display_id",
      carrier: "carrier",
      tracking_number: "tracking_number",
    },
    blocks: [
      {
        id: "blk_was_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          text: "📦 {{translations.shipment.shippedTitle}}",
        },
      },
      {
        id: "blk_was_2",
        type: "text",
        position: 1,
        parent_id: null,
        metadata: {
          text: "{{translations.shipment.shippedIntro}}\n• *{{translations.shipment.carrier}}:* {{data.carrier}}\n• *{{translations.shipment.trackingNumber}}:* `{{data.tracking_number}}`",
        },
      },
      {
        id: "blk_was_3",
        type: "actions",
        position: 2,
        parent_id: null,
        metadata: {
          buttons: [
            {
              id: "btn_track_shipment",
              title: "{{translations.shipment.trackPackageButton}}",
              url: "{{data.tracking_url}}",
            },
          ],
        },
      },
    ],
  },

  // =========================================================================
  // 3. TELEGRAM PRESETS (Merchant Ops Forum Topics + Customer Inline Keyboard)
  // =========================================================================
  {
    id: "system_telegram_order_placed",
    name: "order-placed-telegram",
    label: "Order Notification + Inline Keyboard (Telegram)",
    description:
      "HTML-formatted Telegram notification with line-item list and InlineKeyboard buttons (works for both Merchant Channel Topics and Customer DM).",
    channel: "telegram",
    mode: "blocks",
    default_event: "order.placed",
    blocks: [
      {
        id: "blk_tg_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          text: "🛒 {{translations.order.placedTitle}} (#{{data.display_id}})",
        },
      },
      {
        id: "blk_tg_2",
        type: "text",
        position: 1,
        parent_id: null,
        metadata: {
          text: "<b>{{translations.general.hello}} {{data.first_name}}</b>\n{{translations.order.placedIntro}}",
        },
      },
      {
        id: "blk_tg_3",
        type: "repeater",
        position: 2,
        parent_id: null,
        metadata: {
          arrayKey: "items",
        },
      },
      {
        id: "blk_tg_3_child",
        type: "product-item",
        position: 0,
        parent_id: "blk_tg_3",
        metadata: {
          variant: "order_item",
        },
      },
      {
        id: "blk_tg_4",
        type: "row",
        position: 3,
        parent_id: null,
        metadata: {
          label: "{{translations.order.total}}",
          value: "{{data.total_formatted}}",
          bold: true,
        },
      },
      {
        id: "blk_tg_5",
        type: "actions",
        position: 4,
        parent_id: null,
        metadata: {
          buttons: [
            {
              text: "{{translations.order.trackOrderButton}}",
              url: "{{data.order_url}}",
            },
            {
              text: "{{translations.general.viewInStore}}",
              url: "{{data.store_url}}",
            },
          ],
        },
      },
    ],
  },
  {
    id: "system_telegram_inventory_low",
    name: "inventory-low-telegram",
    label: "Low Stock Ops Alert (Telegram Topic)",
    description:
      "Merchant operations alert formatted for Telegram supergroup topics.",
    channel: "telegram",
    mode: "blocks",
    default_event: "inventory-level.updated",
    blocks: [
      {
        id: "blk_tgi_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          text: "⚠️ {{translations.inventory.lowStockTitle}}",
        },
      },
      {
        id: "blk_tgi_2",
        type: "product-item",
        position: 1,
        parent_id: null,
        metadata: {
          variant: "inventory_item",
        },
      },
    ],
  },

  // =========================================================================
  // 4. SMS PRESETS (GSM-7 Optimized Transactional, OTP & Cart Recovery)
  // =========================================================================
  {
    id: "system_sms_order_placed",
    name: "order-placed-sms",
    label: "Order Confirmation (SMS)",
    description:
      "Single-segment GSM-7 order confirmation SMS with direct status link.",
    channel: "sms",
    mode: "raw",
    default_event: "order.placed",
    raw_content:
      "{{data.store_name}}: {{translations.general.hello}} {{data.first_name}}, order #{{data.display_id}} ({{data.total_formatted}}) is confirmed! View status: {{data.order_url}}",
    blocks: [],
  },
  {
    id: "system_sms_shipment_created",
    name: "shipment-created-sms",
    label: "Order Shipped Tracking (SMS)",
    description: "SMS shipping alert with carrier and tracking link.",
    channel: "sms",
    mode: "raw",
    default_event: "shipment.created",
    raw_content:
      "{{data.store_name}}: Order #{{data.order_display_id}} shipped via {{data.carrier}} ({{data.tracking_number}}). Track: {{data.tracking_url}}",
    blocks: [],
  },
  {
    id: "system_sms_otp_code",
    name: "otp-verification-sms",
    label: "OTP Verification Code (SMS / Sandbox)",
    description:
      "One-Time Password verification SMS compatible with Twilio, SignalHouse, MSG91, and Dummy SMS Sandbox.",
    channel: "sms",
    mode: "raw",
    default_event: "auth.otp_generated",
    raw_content: "{{translations.customer.otpMessage}}",
    blocks: [],
  },
  {
    id: "system_sms_cart_recovery",
    name: "abandoned-cart-recovery-sms",
    label: "Abandoned Cart Recovery (SMS)",
    description:
      "10DLC-compliant abandoned cart recovery SMS with direct checkout resume link.",
    channel: "sms",
    mode: "raw",
    default_event: "cart.abandoned",
    raw_content:
      "{{data.store_name}}: {{translations.general.hello}} {{data.first_name}}, {{translations.cart.recoveryIntro}} ({{data.total_formatted}}): {{data.recovery_url}}",
    blocks: [],
  },

  // =========================================================================
  // 5. SLACK PRESETS (Slack Block Kit JSON)
  // =========================================================================
  {
    id: "system_slack_order_placed",
    name: "order-placed-slack",
    label: "New Order Alert (Slack Block Kit)",
    description:
      "Merchant Slack channel notification using Slack Block Kit header, sections, and action buttons.",
    channel: "slack",
    mode: "blocks",
    default_event: "order.placed",
    blocks: [
      {
        id: "blk_slk_1",
        type: "heading",
        position: 0,
        parent_id: null,
        metadata: {
          text: "🎉 New Order #{{data.display_id}} ({{data.total_formatted}})",
        },
      },
      {
        id: "blk_slk_2",
        type: "section",
        position: 1,
        parent_id: null,
        metadata: {
          text: "*Customer:* {{data.customer_name}} ({{data.email}})\n*Items:* {{data.items_count}} | *Payment:* {{data.payment_status}}",
        },
      },
      {
        id: "blk_slk_3",
        type: "divider",
        position: 2,
        parent_id: null,
        metadata: {},
      },
      {
        id: "blk_slk_4",
        type: "actions",
        position: 3,
        parent_id: null,
        metadata: {
          buttons: [
            {
              text: "View Order",
              url: "{{data.order_url}}",
            },
          ],
        },
      },
    ],
  },
]

export function getSystemPresetById(
  presetId: string
): SystemTemplatePreset | undefined {
  return SYSTEM_TEMPLATE_PRESETS.find(
    (p) => p.id === presetId || p.name === presetId
  )
}

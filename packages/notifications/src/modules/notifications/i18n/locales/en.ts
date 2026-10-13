import type { NotificationTranslationDictionary } from "../types"

export const en: NotificationTranslationDictionary = {
  general: {
    hello: "Hello",
    thankYou: "Thank you for shopping with us!",
    questionsContact:
      "If you have any questions, reply to this message or contact support.",
    viewInStore: "Visit Store",
    poweredBy: "Sent by",
    unsubscribeSms: "Reply STOP to opt out.",
  },
  order: {
    placedSubject: "Order #{{data.display_id}} Confirmed",
    placedTitle: "Thank you for your order!",
    placedIntro:
      "We have received your order #{{data.display_id}} and are preparing it for shipment.",
    completedSubject: "Order #{{data.display_id}} Completed",
    completedTitle: "Your order is complete",
    canceledSubject: "Order #{{data.display_id}} Canceled",
    canceledTitle: "Your order has been canceled",
    updatedSubject: "Order #{{data.display_id}} Updated",
    updatedTitle: "Your order details were updated",
    orderNumber: "Order Number",
    orderDate: "Order Date",
    orderStatus: "Status",
    paymentStatus: "Payment",
    fulfillmentStatus: "Fulfillment",
    itemsHeader: "Order Items",
    quantity: "Qty",
    unitPrice: "Price",
    subtotal: "Subtotal",
    shipping: "Shipping",
    tax: "Tax",
    discount: "Discount",
    total: "Total",
    shippingAddress: "Shipping Address",
    billingAddress: "Billing Address",
    trackOrderButton: "View Order Status",
    downloadInvoiceButton: "Download Invoice PDF",
  },
  shipment: {
    shippedSubject: "Your Order #{{data.order_display_id}} Has Shipped!",
    shippedTitle: "Your package is on the way",
    shippedIntro:
      "Good news! Your order #{{data.order_display_id}} has been handed over to the carrier.",
    deliveredSubject: "Order #{{data.order_display_id}} Delivered",
    deliveredTitle: "Your order has been delivered",
    carrier: "Carrier",
    trackingNumber: "Tracking Number",
    trackPackageButton: "Track Shipment",
  },
  inventory: {
    lowStockSubject: "[Inventory Alert] Low stock for {{data.sku}}",
    lowStockTitle: "Low Stock Inventory Alert",
    sku: "SKU",
    location: "Location",
    stockedQuantity: "Stocked",
    reservedQuantity: "Reserved",
    availableQuantity: "Available",
  },
  customer: {
    welcomeSubject: "Welcome to {{data.store_name}}!",
    welcomeTitle: "Welcome aboard!",
    welcomeIntro:
      "Your customer account is ready. Enjoy seamless checkout and real-time order updates.",
    otpSubject: "Your verification code is {{data.otp_code}}",
    otpMessage:
      "Your {{data.store_name}} verification code is {{data.otp_code}}. Valid for {{data.expires_in_minutes}} minutes.",
  },
  cart: {
    recoverySubject: "You left items in your cart at {{data.store_name}}",
    recoveryTitle: "Still thinking it over?",
    recoveryIntro: "Your cart is saved and ready whenever you are.",
    resumeCartButton: "Complete Your Order",
  },
  document: {
    readySubject:
      "Document {{data.document_number}} for Order #{{data.order_display_id}}",
    readyTitle: "Your commercial document is attached",
    readyIntro:
      "Please find attached {{data.document_type_label}} {{data.document_number}} for order #{{data.order_display_id}}.",
  },
}

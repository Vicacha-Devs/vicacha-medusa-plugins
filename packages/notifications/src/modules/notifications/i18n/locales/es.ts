import type { NotificationTranslationDictionary } from "../types"

export const es: NotificationTranslationDictionary = {
  general: {
    hello: "Hola",
    thankYou: "¡Gracias por tu compra!",
    questionsContact:
      "Si tienes alguna pregunta, responde a este mensaje o contacta a soporte.",
    viewInStore: "Visitar Tienda",
    poweredBy: "Enviado por",
    unsubscribeSms: "Responde STOP para cancelar.",
  },
  order: {
    placedSubject: "Pedido #{{data.display_id}} Confirmado",
    placedTitle: "¡Gracias por tu pedido!",
    placedIntro:
      "Hemos recibido tu pedido #{{data.display_id}} y lo estamos preparando.",
    completedSubject: "Pedido #{{data.display_id}} Completado",
    completedTitle: "Tu pedido ha sido completado",
    canceledSubject: "Pedido #{{data.display_id}} Cancelado",
    canceledTitle: "Tu pedido ha sido cancelado",
    updatedSubject: "Pedido #{{data.display_id}} Actualizado",
    updatedTitle: "Tu pedido fue actualizado",
    orderNumber: "Número de Pedido",
    orderDate: "Fecha",
    orderStatus: "Estado",
    paymentStatus: "Pago",
    fulfillmentStatus: "Envío",
    itemsHeader: "Artículos del Pedido",
    quantity: "Cant.",
    unitPrice: "Precio",
    subtotal: "Subtotal",
    shipping: "Envío",
    tax: "Impuestos",
    discount: "Descuento",
    total: "Total",
    shippingAddress: "Dirección de Envío",
    billingAddress: "Dirección de Facturación",
    trackOrderButton: "Ver Estado del Pedido",
    downloadInvoiceButton: "Descargar Factura PDF",
  },
  shipment: {
    shippedSubject: "¡Tu Pedido #{{data.order_display_id}} ha sido enviado!",
    shippedTitle: "Tu paquete está en camino",
    shippedIntro:
      "¡Buenas noticias! Tu pedido #{{data.order_display_id}} está en tránsito.",
    deliveredSubject: "Pedido #{{data.order_display_id}} Entregado",
    deliveredTitle: "Tu pedido ha sido entregado",
    carrier: "Transportista",
    trackingNumber: "Número de Seguimiento",
    trackPackageButton: "Rastrear Envío",
  },
  inventory: {
    lowStockSubject: "[Alerta de Inventario] Stock bajo para {{data.sku}}",
    lowStockTitle: "Alerta de Stock Bajo",
    sku: "SKU",
    location: "Ubicación",
    stockedQuantity: "En Stock",
    reservedQuantity: "Reservado",
    availableQuantity: "Disponible",
  },
  customer: {
    welcomeSubject: "¡Bienvenido a {{data.store_name}}!",
    welcomeTitle: "¡Bienvenido!",
    welcomeIntro: "Tu cuenta está lista.",
    otpSubject: "Tu código de verificación es {{data.otp_code}}",
    otpMessage:
      "Tu código de verificación de {{data.store_name}} es {{data.otp_code}}. Válido por {{data.expires_in_minutes}} minutos.",
  },
  cart: {
    recoverySubject: "Dejaste artículos en tu carrito en {{data.store_name}}",
    recoveryTitle: "¿Olvidaste algo?",
    recoveryIntro:
      "Guardamos tu carrito para que puedas finalizar tu compra fácilmente.",
    resumeCartButton: "Completar Compra",
  },
  document: {
    readySubject:
      "Documento {{data.document_number}} del Pedido #{{data.order_display_id}}",
    readyTitle: "Tu documento comercial está adjunto",
    readyIntro:
      "Adjuntamos {{data.document_type_label}} {{data.document_number}} para el pedido #{{data.order_display_id}}.",
  },
}

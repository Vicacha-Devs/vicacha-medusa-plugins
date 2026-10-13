import type { NotificationTranslationDictionary } from "../types"

export const de: NotificationTranslationDictionary = {
  general: {
    hello: "Hallo",
    thankYou: "Vielen Dank für Ihren Einkauf!",
    questionsContact:
      "Bei Fragen antworten Sie einfach auf diese Nachricht.",
    viewInStore: "Zum Shop",
    poweredBy: "Gesendet von",
    unsubscribeSms: "Antworten Sie STOP zum Abmelden.",
  },
  order: {
    placedSubject: "Bestellung #{{data.display_id}} bestätigt",
    placedTitle: "Vielen Dank für Ihre Bestellung!",
    placedIntro:
      "Wir haben Ihre Bestellung #{{data.display_id}} erhalten und bereiten den Versand vor.",
    completedSubject: "Bestellung #{{data.display_id}} abgeschlossen",
    completedTitle: "Ihre Bestellung ist abgeschlossen",
    canceledSubject: "Bestellung #{{data.display_id}} storniert",
    canceledTitle: "Ihre Bestellung wurde storniert",
    updatedSubject: "Bestellung #{{data.display_id}} aktualisiert",
    updatedTitle: "Ihre Bestelldaten wurden aktualisiert",
    orderNumber: "Bestellnummer",
    orderDate: "Bestelldatum",
    orderStatus: "Status",
    paymentStatus: "Zahlung",
    fulfillmentStatus: "Versandstatus",
    itemsHeader: "Bestellte Artikel",
    quantity: "Menge",
    unitPrice: "Preis",
    subtotal: "Zwischensumme",
    shipping: "Versand",
    tax: "MwSt.",
    discount: "Rabatt",
    total: "Gesamtsumme",
    shippingAddress: "Lieferadresse",
    billingAddress: "Rechnungsadresse",
    trackOrderButton: "Bestellstatus ansehen",
    downloadInvoiceButton: "Rechnung PDF herunterladen",
  },
  shipment: {
    shippedSubject:
      "Ihre Bestellung #{{data.order_display_id}} wurde versandt!",
    shippedTitle: "Ihr Paket ist unterwegs",
    shippedIntro:
      "Ihre Bestellung #{{data.order_display_id}} wurde an den Versanddienstleister übergeben.",
    deliveredSubject: "Bestellung #{{data.order_display_id}} zugestellt",
    deliveredTitle: "Ihre Bestellung wurde zugestellt",
    carrier: "Versanddienstleister",
    trackingNumber: "Sendungsnummer",
    trackPackageButton: "Sendung verfolgen",
  },
  inventory: {
    lowStockSubject: "[Lagerwarnung] Niedriger Bestand für {{data.sku}}",
    lowStockTitle: "Warnung: Niedriger Lagerbestand",
    sku: "SKU",
    location: "Lagerort",
    stockedQuantity: "Gelagert",
    reservedQuantity: "Reserviert",
    availableQuantity: "Verfügbar",
  },
  customer: {
    welcomeSubject: "Willkommen bei {{data.store_name}}!",
    welcomeTitle: "Herzlich willkommen!",
    welcomeIntro: "Ihr Kundenkonto ist bereit.",
    otpSubject: "Ihr Bestätigungscode lautet {{data.otp_code}}",
    otpMessage:
      "Ihr {{data.store_name}} Bestätigungscode lautet {{data.otp_code}}. Gültig für {{data.expires_in_minutes}} Minuten.",
  },
  cart: {
    recoverySubject:
      "Sie haben Artikel im Warenkorb bei {{data.store_name}}",
    recoveryTitle: "Haben Sie etwas vergessen?",
    recoveryIntro: "Ihr Warenkorb ist gespeichert und wartet auf Sie.",
    resumeCartButton: "Bestellung abschließen",
  },
  document: {
    readySubject:
      "Dokument {{data.document_number}} für Bestellung #{{data.order_display_id}}",
    readyTitle: "Ihr Beleg ist beigefügt",
    readyIntro:
      "Im Anhang finden Sie {{data.document_type_label}} {{data.document_number}} zur Bestellung #{{data.order_display_id}}.",
  },
}

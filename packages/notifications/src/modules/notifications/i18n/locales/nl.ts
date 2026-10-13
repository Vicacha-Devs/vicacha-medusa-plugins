import type { NotificationTranslationDictionary } from "../types"

export const nl: NotificationTranslationDictionary = {
  general: {
    hello: "Hallo",
    thankYou: "Bedankt voor uw bestelling!",
    questionsContact:
      "Heeft u vragen? Beantwoord dit bericht gerust.",
    viewInStore: "Bezoek Winkel",
    poweredBy: "Verzonden door",
    unsubscribeSms: "Antwoord STOP om af te melden.",
  },
  order: {
    placedSubject: "Bestelling #{{data.display_id}} Bevestigd",
    placedTitle: "Bedankt voor uw bestelling!",
    placedIntro:
      "We hebben uw bestelling #{{data.display_id}} ontvangen en maken deze verzendklaar.",
    completedSubject: "Bestelling #{{data.display_id}} Voltooid",
    completedTitle: "Uw bestelling is voltooid",
    canceledSubject: "Bestelling #{{data.display_id}} Geannuleerd",
    canceledTitle: "Uw bestelling is geannuleerd",
    updatedSubject: "Bestelling #{{data.display_id}} Bijgewerkt",
    updatedTitle: "Uw bestelling is bijgewerkt",
    orderNumber: "Bestelnummer",
    orderDate: "Besteldatum",
    orderStatus: "Status",
    paymentStatus: "Betaling",
    fulfillmentStatus: "Levering",
    itemsHeader: "Bestelde Artikelen",
    quantity: "Aantal",
    unitPrice: "Prijs",
    subtotal: "Subtotaal",
    shipping: "Verzending",
    tax: "Btw",
    discount: "Korting",
    total: "Totaal",
    shippingAddress: "Verzendadres",
    billingAddress: "Factuuradres",
    trackOrderButton: "Bestelstatus bekijken",
    downloadInvoiceButton: "Factuur PDF downloaden",
  },
  shipment: {
    shippedSubject:
      "Uw bestelling #{{data.order_display_id}} is verzonden!",
    shippedTitle: "Uw pakket is onderweg",
    shippedIntro:
      "Uw bestelling #{{data.order_display_id}} is overgedragen aan de bezorgdienst.",
    deliveredSubject: "Bestelling #{{data.order_display_id}} Bezorgd",
    deliveredTitle: "Uw bestelling is bezorgd",
    carrier: "Vervoerder",
    trackingNumber: "Track & Trace-code",
    trackPackageButton: "Volg Pakket",
  },
  inventory: {
    lowStockSubject: "[Voorraadmelding] Lage voorraad voor {{data.sku}}",
    lowStockTitle: "Waarschuwing: Lage Voorraad",
    sku: "SKU",
    location: "Locatie",
    stockedQuantity: "Op voorraad",
    reservedQuantity: "Gereserveerd",
    availableQuantity: "Beschikbaar",
  },
  customer: {
    welcomeSubject: "Welkom bij {{data.store_name}}!",
    welcomeTitle: "Welkom!",
    welcomeIntro: "Uw klantaccount is gereed.",
    otpSubject: "Uw verificatiecode is {{data.otp_code}}",
    otpMessage:
      "Uw {{data.store_name}} verificatiecode is {{data.otp_code}}. Geldig gedurende {{data.expires_in_minutes}} minuten.",
  },
  cart: {
    recoverySubject:
      "U heeft artikelen in uw winkelwagen bij {{data.store_name}}",
    recoveryTitle: "Iets vergeten?",
    recoveryIntro: "Uw winkelwagen staat nog voor u klaar.",
    resumeCartButton: "Bestelling Afronden",
  },
  document: {
    readySubject:
      "Document {{data.document_number}} voor Bestelling #{{data.order_display_id}}",
    readyTitle: "Uw document is bijgevoegd",
    readyIntro:
      "In de bijlage vindt u {{data.document_type_label}} {{data.document_number}}.",
  },
}

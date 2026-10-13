import type { NotificationTranslationDictionary } from "../types"

export const pl: NotificationTranslationDictionary = {
  general: {
    hello: "Cześć",
    thankYou: "Dziękujemy za zakupy!",
    questionsContact:
      "W razie pytań odpowiedz na tę wiadomość lub skontaktuj się z nami.",
    viewInStore: "Odwiedź sklep",
    poweredBy: "Wysłane przez",
    unsubscribeSms: "Odpowiedz STOP, aby zrezygnować.",
  },
  order: {
    placedSubject: "Zamówienie #{{data.display_id}} potwierdzone",
    placedTitle: "Dziękujemy za złożenie zamówienia!",
    placedIntro:
      "Otrzymaliśmy Twoje zamówienie #{{data.display_id}} i przygotowujemy je do wysyłki.",
    completedSubject: "Zamówienie #{{data.display_id}} zrealizowane",
    completedTitle: "Twoje zamówienie zostało zrealizowane",
    canceledSubject: "Zamówienie #{{data.display_id}} anulowane",
    canceledTitle: "Twoje zamówienie zostało anulowane",
    updatedSubject: "Zamówienie #{{data.display_id}} zaktualizowane",
    updatedTitle: "Szczegóły zamówienia zostały zaktualizowane",
    orderNumber: "Numer zamówienia",
    orderDate: "Data zamówienia",
    orderStatus: "Status",
    paymentStatus: "Płatność",
    fulfillmentStatus: "Realizacja",
    itemsHeader: "Produkty w zamówieniu",
    quantity: "Ilość",
    unitPrice: "Cena",
    subtotal: "Suma częściowa",
    shipping: "Dostawa",
    tax: "Podatek",
    discount: "Rabat",
    total: "Razem",
    shippingAddress: "Adres dostawy",
    billingAddress: "Adres rozliczeniowy",
    trackOrderButton: "Sprawdź status zamówienia",
    downloadInvoiceButton: "Pobierz fakturę PDF",
  },
  shipment: {
    shippedSubject: "Zamówienie #{{data.order_display_id}} zostało wysłane!",
    shippedTitle: "Twoja przesyłka jest w drodze",
    shippedIntro:
      "Twoje zamówienie #{{data.order_display_id}} zostało przekazane kurierowi.",
    deliveredSubject: "Zamówienie #{{data.order_display_id}} dostarczone",
    deliveredTitle: "Twoje zamówienie zostało dostarczone",
    carrier: "Przewoźnik",
    trackingNumber: "Numer przesyłki",
    trackPackageButton: "Śledź przesyłkę",
  },
  inventory: {
    lowStockSubject: "[Alert magazynowy] Niski stan dla {{data.sku}}",
    lowStockTitle: "Alert niskiego stanu magazynowego",
    sku: "SKU",
    location: "Lokalizacja",
    stockedQuantity: "Na stanie",
    reservedQuantity: "Zarezerwowane",
    availableQuantity: "Dostępne",
  },
  customer: {
    welcomeSubject: "Witamy w {{data.store_name}}!",
    welcomeTitle: "Witamy!",
    welcomeIntro: "Twoje konto klienta jest gotowe.",
    otpSubject: "Twój kod weryfikacyjny to {{data.otp_code}}",
    otpMessage:
      "Twój kod weryfikacyjny {{data.store_name}} to {{data.otp_code}}. Ważny przez {{data.expires_in_minutes}} min.",
  },
  cart: {
    recoverySubject: "Twój koszyk w {{data.store_name}} czeka",
    recoveryTitle: "Zostawiłeś produkty w koszyku",
    recoveryIntro:
      "Zapisaliśmy Twój koszyk, abyś mógł wygodnie dokończyć zamówienie.",
    resumeCartButton: "Dokończ zamówienie",
  },
  document: {
    readySubject:
      "Dokument {{data.document_number}} do zamówienia #{{data.order_display_id}}",
    readyTitle: "Twój dokument handlowy w załączniku",
    readyIntro:
      "W załączniku przesyłamy {{data.document_type_label}} {{data.document_number}} dla zamówienia #{{data.order_display_id}}.",
  },
}

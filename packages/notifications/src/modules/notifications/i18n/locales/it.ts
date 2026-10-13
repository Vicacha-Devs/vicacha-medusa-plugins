import type { NotificationTranslationDictionary } from "../types"

export const it: NotificationTranslationDictionary = {
  general: {
    hello: "Ciao",
    thankYou: "Grazie per il tuo acquisto!",
    questionsContact:
      "Per qualsiasi domanda, rispondi a questo messaggio.",
    viewInStore: "Visita il Negozio",
    poweredBy: "Inviato da",
    unsubscribeSms: "Rispondi STOP per annullare l'iscrizione.",
  },
  order: {
    placedSubject: "Ordine #{{data.display_id}} Confermato",
    placedTitle: "Grazie per il tuo ordine!",
    placedIntro: "Abbiamo ricevuto il tuo ordine #{{data.display_id}}.",
    completedSubject: "Ordine #{{data.display_id}} Completato",
    completedTitle: "Il tuo ordine è completato",
    canceledSubject: "Ordine #{{data.display_id}} Annullato",
    canceledTitle: "Il tuo ordine è stato annullato",
    updatedSubject: "Ordine #{{data.display_id}} Aggiornato",
    updatedTitle: "Il tuo ordine è stato aggiornato",
    orderNumber: "Numero Ordine",
    orderDate: "Data",
    orderStatus: "Stato",
    paymentStatus: "Pagamento",
    fulfillmentStatus: "Spedizione",
    itemsHeader: "Articoli Ordinati",
    quantity: "Qtà",
    unitPrice: "Prezzo",
    subtotal: "Subtotale",
    shipping: "Spedizione",
    tax: "IVA",
    discount: "Sconto",
    total: "Totale",
    shippingAddress: "Indirizzo di Spedizione",
    billingAddress: "Indirizzo di Fatturazione",
    trackOrderButton: "Stato Ordine",
    downloadInvoiceButton: "Scarica Fattura PDF",
  },
  shipment: {
    shippedSubject:
      "Il tuo ordine #{{data.order_display_id}} è stato spedito!",
    shippedTitle: "Il tuo pacco è in viaggio",
    shippedIntro:
      "Il tuo ordine #{{data.order_display_id}} è stato affidato al corriere.",
    deliveredSubject: "Ordine #{{data.order_display_id}} Consegnato",
    deliveredTitle: "Il tuo ordine è stato consegnato",
    carrier: "Corriere",
    trackingNumber: "Numero di Tracciamento",
    trackPackageButton: "Traccia Spedizione",
  },
  inventory: {
    lowStockSubject: "[Avviso Scorte] Scorte basse per {{data.sku}}",
    lowStockTitle: "Avviso Scorte in Esaurimento",
    sku: "SKU",
    location: "Magazzino",
    stockedQuantity: "In magazzino",
    reservedQuantity: "Riservato",
    availableQuantity: "Disponibile",
  },
  customer: {
    welcomeSubject: "Benvenuto su {{data.store_name}}!",
    welcomeTitle: "Benvenuto!",
    welcomeIntro: "Il tuo account cliente è attivo.",
    otpSubject: "Il tuo codice di verifica è {{data.otp_code}}",
    otpMessage:
      "Il tuo codice {{data.store_name}} è {{data.otp_code}}. Valido per {{data.expires_in_minutes}} minuti.",
  },
  cart: {
    recoverySubject:
      "Hai lasciato articoli nel carrello su {{data.store_name}}",
    recoveryTitle: "Hai dimenticato qualcosa?",
    recoveryIntro:
      "Il tuo carrello è salvato e pronto per il checkout.",
    resumeCartButton: "Completa l'Ordine",
  },
  document: {
    readySubject:
      "Documento {{data.document_number}} per Ordine #{{data.order_display_id}}",
    readyTitle: "Il tuo documento commerciale è in allegato",
    readyIntro:
      "In allegato trovi {{data.document_type_label}} {{data.document_number}}.",
  },
}

import type { NotificationTranslationDictionary } from "../types"

export const fr: NotificationTranslationDictionary = {
  general: {
    hello: "Bonjour",
    thankYou: "Merci pour votre commande !",
    questionsContact:
      "Si vous avez des questions, répondez à ce message.",
    viewInStore: "Visiter la boutique",
    poweredBy: "Envoyé par",
    unsubscribeSms: "Répondez STOP pour vous désabonner.",
  },
  order: {
    placedSubject: "Commande #{{data.display_id}} confirmée",
    placedTitle: "Merci pour votre commande !",
    placedIntro:
      "Nous avons bien reçu votre commande #{{data.display_id}}.",
    completedSubject: "Commande #{{data.display_id}} terminée",
    completedTitle: "Votre commande est terminée",
    canceledSubject: "Commande #{{data.display_id}} annulée",
    canceledTitle: "Votre commande a été annulée",
    updatedSubject: "Commande #{{data.display_id}} mise à jour",
    updatedTitle: "Votre commande a été mise à jour",
    orderNumber: "Numéro de commande",
    orderDate: "Date",
    orderStatus: "Statut",
    paymentStatus: "Paiement",
    fulfillmentStatus: "Expédition",
    itemsHeader: "Articles commandés",
    quantity: "Qté",
    unitPrice: "Prix",
    subtotal: "Sous-total",
    shipping: "Livraison",
    tax: "Taxes",
    discount: "Remise",
    total: "Total",
    shippingAddress: "Adresse de livraison",
    billingAddress: "Adresse de facturation",
    trackOrderButton: "Suivre ma commande",
    downloadInvoiceButton: "Télécharger la facture PDF",
  },
  shipment: {
    shippedSubject:
      "Votre commande #{{data.order_display_id}} a été expédiée !",
    shippedTitle: "Votre colis est en route",
    shippedIntro:
      "Votre commande #{{data.order_display_id}} est en cours d'acheminement.",
    deliveredSubject: "Commande #{{data.order_display_id}} livrée",
    deliveredTitle: "Votre commande a été livrée",
    carrier: "Transporteur",
    trackingNumber: "Numéro de suivi",
    trackPackageButton: "Suivre le colis",
  },
  inventory: {
    lowStockSubject: "[Alerte Stock] Stock faible pour {{data.sku}}",
    lowStockTitle: "Alerte de stock faible",
    sku: "SKU",
    location: "Emplacement",
    stockedQuantity: "En stock",
    reservedQuantity: "Réservé",
    availableQuantity: "Disponible",
  },
  customer: {
    welcomeSubject: "Bienvenue chez {{data.store_name}} !",
    welcomeTitle: "Bienvenue !",
    welcomeIntro: "Votre compte client est actif.",
    otpSubject: "Votre code de vérification est {{data.otp_code}}",
    otpMessage:
      "Votre code {{data.store_name}} est {{data.otp_code}}. Valable {{data.expires_in_minutes}} minutes.",
  },
  cart: {
    recoverySubject: "Votre panier vous attend chez {{data.store_name}}",
    recoveryTitle: "Vous avez oublié quelque chose ?",
    recoveryIntro:
      "Vos articles sont toujours réservés dans votre panier.",
    resumeCartButton: "Finaliser ma commande",
  },
  document: {
    readySubject:
      "Document {{data.document_number}} pour la commande #{{data.order_display_id}}",
    readyTitle: "Votre document commercial est joint",
    readyIntro:
      "Veuillez trouver ci-joint {{data.document_type_label}} {{data.document_number}}.",
  },
}

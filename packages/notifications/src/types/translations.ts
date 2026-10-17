export interface NotificationTranslationDictionary {
  general: {
    hello: string
    thankYou: string
    questionsContact: string
    viewInStore: string
    poweredBy: string
    unsubscribeSms: string
  }
  order: {
    placedSubject: string
    placedTitle: string
    placedIntro: string
    completedSubject: string
    completedTitle: string
    canceledSubject: string
    canceledTitle: string
    updatedSubject: string
    updatedTitle: string
    orderNumber: string
    orderDate: string
    orderStatus: string
    paymentStatus: string
    fulfillmentStatus: string
    itemsHeader: string
    quantity: string
    unitPrice: string
    subtotal: string
    shipping: string
    tax: string
    discount: string
    total: string
    shippingAddress: string
    billingAddress: string
    trackOrderButton: string
    downloadInvoiceButton: string
  }
  shipment: {
    shippedSubject: string
    shippedTitle: string
    shippedIntro: string
    deliveredSubject: string
    deliveredTitle: string
    carrier: string
    trackingNumber: string
    trackPackageButton: string
  }
  inventory: {
    lowStockSubject: string
    lowStockTitle: string
    sku: string
    location: string
    stockedQuantity: string
    reservedQuantity: string
    availableQuantity: string
  }
  customer: {
    welcomeSubject: string
    welcomeTitle: string
    welcomeIntro: string
    otpSubject: string
    otpMessage: string
  }
  cart: {
    recoverySubject: string
    recoveryTitle: string
    recoveryIntro: string
    resumeCartButton: string
  }
  document: {
    readySubject: string
    readyTitle: string
    readyIntro: string
  }
}

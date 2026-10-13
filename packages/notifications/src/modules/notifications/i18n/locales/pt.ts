import type { NotificationTranslationDictionary } from "../types"

export const pt: NotificationTranslationDictionary = {
  general: {
    hello: "Olá",
    thankYou: "Obrigado por comprar conosco!",
    questionsContact:
      "Se tiver dúvidas, responda a esta mensagem.",
    viewInStore: "Visitar Loja",
    poweredBy: "Enviado por",
    unsubscribeSms: "Responda STOP para cancelar.",
  },
  order: {
    placedSubject: "Pedido #{{data.display_id}} Confirmado",
    placedTitle: "Obrigado pelo seu pedido!",
    placedIntro:
      "Recebemos o seu pedido #{{data.display_id}} e estamos preparando o envio.",
    completedSubject: "Pedido #{{data.display_id}} Concluído",
    completedTitle: "Seu pedido foi concluído",
    canceledSubject: "Pedido #{{data.display_id}} Cancelado",
    canceledTitle: "Seu pedido foi cancelado",
    updatedSubject: "Pedido #{{data.display_id}} Atualizado",
    updatedTitle: "Seu pedido foi atualizado",
    orderNumber: "Número do Pedido",
    orderDate: "Data",
    orderStatus: "Status",
    paymentStatus: "Pagamento",
    fulfillmentStatus: "Envio",
    itemsHeader: "Itens do Pedido",
    quantity: "Qtd",
    unitPrice: "Preço",
    subtotal: "Subtotal",
    shipping: "Frete",
    tax: "Impostos",
    discount: "Desconto",
    total: "Total",
    shippingAddress: "Endereço de Entrega",
    billingAddress: "Endereço de Cobrança",
    trackOrderButton: "Ver Pedido",
    downloadInvoiceButton: "Baixar Fatura PDF",
  },
  shipment: {
    shippedSubject:
      "Seu Pedido #{{data.order_display_id}} foi enviado!",
    shippedTitle: "Sua encomenda está a caminho",
    shippedIntro:
      "O pedido #{{data.order_display_id}} foi entregue à transportadora.",
    deliveredSubject: "Pedido #{{data.order_display_id}} Entregue",
    deliveredTitle: "Seu pedido foi entregue",
    carrier: "Transportadora",
    trackingNumber: "Código de Rastreio",
    trackPackageButton: "Rastrear Pedido",
  },
  inventory: {
    lowStockSubject: "[Alerta de Estoque] Estoque baixo para {{data.sku}}",
    lowStockTitle: "Alerta de Estoque Baixo",
    sku: "SKU",
    location: "Localização",
    stockedQuantity: "Em estoque",
    reservedQuantity: "Reservado",
    availableQuantity: "Disponível",
  },
  customer: {
    welcomeSubject: "Bem-vindo à {{data.store_name}}!",
    welcomeTitle: "Bem-vindo!",
    welcomeIntro: "Sua conta está pronta.",
    otpSubject: "Seu código de verificação é {{data.otp_code}}",
    otpMessage:
      "Seu código {{data.store_name}} é {{data.otp_code}}. Válido por {{data.expires_in_minutes}} minutos.",
  },
  cart: {
    recoverySubject:
      "Você deixou itens no carrinho na {{data.store_name}}",
    recoveryTitle: "Esqueceu alguma coisa?",
    recoveryIntro: "Seu carrinho está salvo esperando por você.",
    resumeCartButton: "Finalizar Compra",
  },
  document: {
    readySubject:
      "Documento {{data.document_number}} do Pedido #{{data.order_display_id}}",
    readyTitle: "Seu documento fiscal está em anexo",
    readyIntro:
      "Segue em anexo {{data.document_type_label}} {{data.document_number}}.",
  },
}

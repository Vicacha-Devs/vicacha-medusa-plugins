import type { NotificationTranslationDictionary } from "../types"

export const tr: NotificationTranslationDictionary = {
  general: {
    hello: "Merhaba",
    thankYou: "Bizi tercih ettiğiniz için teşekkür ederiz!",
    questionsContact:
      "Herhangi bir sorunuz varsa bu mesaja yanıt verebilir veya destek ekibimizle iletişime geçebilirsiniz.",
    viewInStore: "Mağazayı Ziyaret Et",
    poweredBy: "Gönderen",
    unsubscribeSms: "İptal etmek için STOP yazıp yanıtlayın.",
  },
  order: {
    placedSubject: "Sipariş #{{data.display_id}} Onaylandı",
    placedTitle: "Siparişiniz için teşekkür ederiz!",
    placedIntro:
      "#{{data.display_id}} numaralı siparişinizi aldık ve gönderim için hazırlıyoruz.",
    completedSubject: "Sipariş #{{data.display_id}} Tamamlandı",
    completedTitle: "Siparişiniz tamamlandı",
    canceledSubject: "Sipariş #{{data.display_id}} İptal Edildi",
    canceledTitle: "Siparişiniz iptal edildi",
    updatedSubject: "Sipariş #{{data.display_id}} Güncellendi",
    updatedTitle: "Sipariş bilgileriniz güncellendi",
    orderNumber: "Sipariş Numarası",
    orderDate: "Sipariş Tarihi",
    orderStatus: "Durum",
    paymentStatus: "Ödeme",
    fulfillmentStatus: "Teslimat Durumu",
    itemsHeader: "Sipariş Edilen Ürünler",
    quantity: "Adet",
    unitPrice: "Birim Fiyat",
    subtotal: "Ara Toplam",
    shipping: "Kargo",
    tax: "KDV",
    discount: "İndirim",
    total: "Toplam",
    shippingAddress: "Teslimat Adresi",
    billingAddress: "Fatura Adresi",
    trackOrderButton: "Sipariş Durumunu Görüntüle",
    downloadInvoiceButton: "PDF Faturayı İndir",
  },
  shipment: {
    shippedSubject: "#{{data.order_display_id}} Numaralı Siparişiniz Kargoya Verildi!",
    shippedTitle: "Paketiniz yola çıktı",
    shippedIntro:
      "#{{data.order_display_id}} numaralı siparişiniz kargo firmasına teslim edildi.",
    deliveredSubject: "Sipariş #{{data.order_display_id}} Teslim Edildi",
    deliveredTitle: "Siparişiniz teslim edildi",
    carrier: "Kargo Firması",
    trackingNumber: "Takip Numarası",
    trackPackageButton: "Kargoyu Takip Et",
  },
  inventory: {
    lowStockSubject: "[Stok Uyarısı] {{data.sku}} için düşük stok",
    lowStockTitle: "Düşük Stok Uyarısı",
    sku: "Stok Kodu (SKU)",
    location: "Depo Konumu",
    stockedQuantity: "Stok Miktarı",
    reservedQuantity: "Rezerve Edilen",
    availableQuantity: "Kullanılabilir",
  },
  customer: {
    welcomeSubject: "{{data.store_name}} mağazasına hoş geldiniz!",
    welcomeTitle: "Aramıza hoş geldiniz!",
    welcomeIntro:
      "Müşteri hesabınız hazır. Hızlı alışveriş ve anlık sipariş bildirimlerinin keyfini çıkarın.",
    otpSubject: "Doğrulama kodunuz: {{data.otp_code}}",
    otpMessage:
      "{{data.store_name}} doğrulama kodunuz: {{data.otp_code}}. {{data.expires_in_minutes}} dakika boyunca geçerlidir.",
  },
  cart: {
    recoverySubject: "{{data.store_name}} sepetinizde ürünler bıraktınız",
    recoveryTitle: "Sepetinizi unuttunuz mu?",
    recoveryIntro:
      "Sepetinizdeki ürünleri sizin için sakladık, istediğiniz zaman alışverişinizi tamamlayabilirsiniz.",
    resumeCartButton: "Siparişi Tamamla",
  },
  document: {
    readySubject:
      "Sipariş #{{data.order_display_id}} için Belge {{data.document_number}}",
    readyTitle: "Ticari belgeniz ektedir",
    readyIntro:
      "#{{data.order_display_id}} numaralı siparişinize ait {{data.document_type_label}} ({{data.document_number}}) ekte yer almaktadır.",
  },
}

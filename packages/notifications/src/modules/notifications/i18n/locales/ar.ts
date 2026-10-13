import type { NotificationTranslationDictionary } from "../types"

export const ar: NotificationTranslationDictionary = {
  general: {
    hello: "مرحباً",
    thankYou: "شكراً لتسوقك معنا!",
    questionsContact:
      "إذا كان لديك أي استفسار، يرجى الرد على هذه الرسالة أو التواصل مع فريق الدعم.",
    viewInStore: "زيارة المتجر",
    poweredBy: "مُرسل بواسطة",
    unsubscribeSms: "أرسل STOP لإلغاء الاشتراك.",
  },
  order: {
    placedSubject: "تم تأكيد الطلب #{{data.display_id}}",
    placedTitle: "شكراً لطلبك!",
    placedIntro:
      "لقد استلمنا طلبك رقم #{{data.display_id}} وجارٍ تجهيزه للشحن.",
    completedSubject: "اكتمل الطلب #{{data.display_id}}",
    completedTitle: "تم إكمال طلبك بنجاح",
    canceledSubject: "تم إلغاء الطلب #{{data.display_id}}",
    canceledTitle: "تم إلغاء طلبك",
    updatedSubject: "تم تحديث الطلب #{{data.display_id}}",
    updatedTitle: "تم تحديث تفاصيل طلبك",
    orderNumber: "رقم الطلب",
    orderDate: "تاريخ الطلب",
    orderStatus: "الحالة",
    paymentStatus: "حالة الدفع",
    fulfillmentStatus: "حالة التجهيز",
    itemsHeader: "المنتجات المطلوبة",
    quantity: "الكمية",
    unitPrice: "السعر",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    tax: "الضريبة",
    discount: "الخصم",
    total: "الإجمالي",
    shippingAddress: "عنوان الشحن",
    billingAddress: "عنوان الفوترة",
    trackOrderButton: "عرض حالة الطلب",
    downloadInvoiceButton: "تحميل الفاتورة PDF",
  },
  shipment: {
    shippedSubject: "تم شحن طلبك رقم #{{data.order_display_id}}!",
    shippedTitle: "شحنتك في الطريق إليك",
    shippedIntro:
      "أخبار سارة! تم تسليم طلبك رقم #{{data.order_display_id}} إلى شركة الشحن.",
    deliveredSubject: "تم توصيل الطلب #{{data.order_display_id}}",
    deliveredTitle: "تم توصيل طلبك بنجاح",
    carrier: "شركة الشحن",
    trackingNumber: "رقم التتبع",
    trackPackageButton: "تتبع الشحنة",
  },
  inventory: {
    lowStockSubject: "[تنبيه المخزون] انخفاض مخزون {{data.sku}}",
    lowStockTitle: "تنبيه انخفاض المخزون",
    sku: "رمز المنتج (SKU)",
    location: "الموقع",
    stockedQuantity: "المتوفر في المخزن",
    reservedQuantity: "المحجوز",
    availableQuantity: "المتاح للبيع",
  },
  customer: {
    welcomeSubject: "مرحباً بك في {{data.store_name}}!",
    welcomeTitle: "أهلاً وسهلاً بك!",
    welcomeIntro:
      "حسابك جاهز الآن. استمتع بتجربة تسوق سريعة وتحديثات فورية لطلباتك.",
    otpSubject: "رمز التحقق الخاص بك هو {{data.otp_code}}",
    otpMessage:
      "رمز التحقق الخاص بك في {{data.store_name}} هو {{data.otp_code}}. صالح لمدة {{data.expires_in_minutes}} دقائق.",
  },
  cart: {
    recoverySubject: "لديك منتجات متروكة في سلة التسوق لدى {{data.store_name}}",
    recoveryTitle: "هل نسيت شيئاً في سلتك؟",
    recoveryIntro:
      "لقد احتفظنا بمنتجاتك في سلة التسوق لتتمكن من إتمام طلبك في أي وقت.",
    resumeCartButton: "إتمام الطلب الآن",
  },
  document: {
    readySubject:
      "المستند {{data.document_number}} للطلب #{{data.order_display_id}}",
    readyTitle: "المستند التجاري مرفق مع هذه الرسالة",
    readyIntro:
      "يرجى العثور على المرفق {{data.document_type_label}} رقم {{data.document_number}} الخاص بالطلب #{{data.order_display_id}}.",
  },
}

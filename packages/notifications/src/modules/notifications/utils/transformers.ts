import type { ContextType, NotificationsPluginOptions } from "../types"

export function formatCurrencyAmount(
  amount: number | string | null | undefined,
  currencyCode = "USD",
  locale = "en-US"
): string {
  const num = Number(amount ?? 0)
  if (!Number.isFinite(num)) {
    return `0.00 ${(currencyCode || "USD").toUpperCase()}`
  }
  const code = (currencyCode || "USD").toUpperCase()
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `${num.toFixed(2)} ${code}`
  }
}

export function formatDateTime(
  dateInput: string | Date | null | undefined,
  locale = "en-US"
): string {
  if (!dateInput) return ""
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return String(dateInput)
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export function formatAddressInline(addr?: Record<string, any> | null): string {
  if (!addr || typeof addr !== "object") return ""
  const name = [addr.first_name, addr.last_name].filter(Boolean).join(" ").trim()
  const parts = [
    name,
    addr.company,
    addr.address_1,
    addr.address_2,
    [addr.postal_code, addr.city].filter(Boolean).join(" "),
    addr.province,
    addr.country_code ? String(addr.country_code).toUpperCase() : "",
  ]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean)
  return parts.join(", ")
}

export function buildGlobalStoreContext(
  pluginOptions?: NotificationsPluginOptions
): Record<string, any> {
  const storeName =
    pluginOptions?.storeName ||
    process.env.STORE_NAME ||
    "Medusa Store"
  const storeUrl =
    pluginOptions?.storeUrl ||
    process.env.STORE_URL ||
    process.env.STOREFRONT_URL ||
    "https://store.example.com"
  const logoUrl =
    pluginOptions?.logoUrl ||
    process.env.MAILER_LOGO_URL ||
    ""

  return {
    store_name: storeName,
    store_url: storeUrl,
    logo_url: logoUrl,
    // @sam-ael Go-style compatibility aliases
    StoreName: storeName,
    StoreURL: storeUrl,
    SiteURL: storeUrl,
    LogoURL: logoUrl,
  }
}

export function transformOrderData(
  order: Record<string, any>,
  pluginOptions?: NotificationsPluginOptions,
  locale = "en"
): Record<string, any> {
  const currency = (order?.currency_code || "usd").toUpperCase()
  const globalCtx = buildGlobalStoreContext(pluginOptions)
  const items = Array.isArray(order?.items) ? order.items : []

  const transformedItems = items.map((item: Record<string, any>, idx: number) => {
    const qty = Number(item.quantity ?? 1)
    const unitPrice = Number(item.unit_price ?? 0)
    const lineTotal = Number(item.total ?? unitPrice * qty)
    return {
      index: idx + 1,
      id: item.id || `item_${idx + 1}`,
      title: item.title || item.product_title || "Item",
      subtitle: item.subtitle || item.variant_title || "",
      variant_title: item.variant_title || item.variant?.title || "",
      sku: item.variant_sku || item.variant?.sku || item.sku || "N/A",
      thumbnail: item.thumbnail || item.product?.thumbnail || "",
      quantity: qty,
      unit_price: unitPrice,
      unit_price_formatted: formatCurrencyAmount(unitPrice, currency, locale),
      total: lineTotal,
      total_formatted: formatCurrencyAmount(lineTotal, currency, locale),
    }
  })

  const customerFirstName =
    order?.customer?.first_name ||
    order?.shipping_address?.first_name ||
    order?.billing_address?.first_name ||
    "Customer"
  const customerLastName =
    order?.customer?.last_name ||
    order?.shipping_address?.last_name ||
    order?.billing_address?.last_name ||
    ""
  const customerFullName = [customerFirstName, customerLastName]
    .filter(Boolean)
    .join(" ")
    .trim()

  const subtotal = Number(order?.item_subtotal ?? order?.subtotal ?? 0)
  const shippingTotal = Number(order?.shipping_total ?? 0)
  const taxTotal = Number(order?.tax_total ?? 0)
  const discountTotal = Number(order?.discount_total ?? 0)
  const total = Number(order?.total ?? subtotal + shippingTotal + taxTotal - discountTotal)

  const displayId = order?.display_id ?? order?.id ?? "1001"
  const orderUrl = `${globalCtx.store_url.replace(/\/$/, "")}/orders/${order?.id || displayId}`

  return {
    ...globalCtx,
    id: order?.id || "order_01",
    display_id: String(displayId),
    order_number: String(displayId),
    created_at: order?.created_at || new Date().toISOString(),
    created_at_formatted: formatDateTime(
      order?.created_at || new Date(),
      locale
    ),
    status: order?.status || "pending",
    payment_status: order?.payment_status || "captured",
    fulfillment_status: order?.fulfillment_status || "not_fulfilled",
    currency_code: currency,
    email: order?.email || order?.customer?.email || "",
    phone:
      order?.shipping_address?.phone ||
      order?.billing_address?.phone ||
      order?.customer?.phone ||
      "",
    first_name: customerFirstName,
    last_name: customerLastName,
    customer_name: customerFullName,
    customer: {
      id: order?.customer?.id || order?.customer_id || "cus_01",
      first_name: customerFirstName,
      last_name: customerLastName,
      full_name: customerFullName,
      email: order?.email || order?.customer?.email || "",
      phone:
        order?.customer?.phone ||
        order?.shipping_address?.phone ||
        "",
      telegram_chat_id:
        order?.customer?.metadata?.telegram_chat_id ||
        order?.metadata?.telegram_chat_id ||
        "",
    },
    shipping_address: order?.shipping_address || {},
    shipping_address_formatted: formatAddressInline(order?.shipping_address),
    billing_address: order?.billing_address || {},
    billing_address_formatted: formatAddressInline(order?.billing_address),
    items: transformedItems,
    items_count: transformedItems.reduce(
      (acc: number, item: any) => acc + item.quantity,
      0
    ),
    subtotal,
    subtotal_formatted: formatCurrencyAmount(subtotal, currency, locale),
    shipping_total: shippingTotal,
    shipping_total_formatted: formatCurrencyAmount(
      shippingTotal,
      currency,
      locale
    ),
    tax_total: taxTotal,
    tax_total_formatted: formatCurrencyAmount(taxTotal, currency, locale),
    discount_total: discountTotal,
    discount_total_formatted: formatCurrencyAmount(
      discountTotal,
      currency,
      locale
    ),
    total,
    total_formatted: formatCurrencyAmount(total, currency, locale),
    order_url: orderUrl,
    region_id: order?.region_id || order?.region?.id || null,
    sales_channel_id: order?.sales_channel_id || null,
    metadata: order?.metadata || {},
  }
}

export function transformShipmentData(
  fulfillment: Record<string, any>,
  order?: Record<string, any> | null,
  pluginOptions?: NotificationsPluginOptions,
  locale = "en"
): Record<string, any> {
  const orderCtx = order
    ? transformOrderData(order, pluginOptions, locale)
    : buildGlobalStoreContext(pluginOptions)

  const labels = Array.isArray(fulfillment?.labels) ? fulfillment.labels : []
  const firstLabel = labels[0] || {}
  const trackingNumber =
    firstLabel.tracking_number ||
    fulfillment?.tracking_numbers?.[0] ||
    fulfillment?.data?.tracking_number ||
    "TRK-99887766"
  const trackingUrl =
    firstLabel.tracking_url ||
    fulfillment?.tracking_links?.[0]?.url ||
    fulfillment?.data?.tracking_url ||
    `${orderCtx.store_url}/track/${trackingNumber}`
  const carrier =
    fulfillment?.provider_id ||
    fulfillment?.shipping_option?.name ||
    "Standard Carrier"

  return {
    ...orderCtx,
    fulfillment_id: fulfillment?.id || "ful_01",
    order_display_id: orderCtx.display_id || "1001",
    carrier,
    provider_id: carrier,
    tracking_number: trackingNumber,
    tracking_url: trackingUrl,
    labels,
    shipped_at: formatDateTime(
      fulfillment?.shipped_at || fulfillment?.created_at || new Date(),
      locale
    ),
  }
}

export function transformInventoryLevelData(
  inventory: Record<string, any>,
  pluginOptions?: NotificationsPluginOptions
): Record<string, any> {
  const globalCtx = buildGlobalStoreContext(pluginOptions)
  const stocked = Number(inventory?.stocked_quantity ?? 0)
  const reserved = Number(inventory?.reserved_quantity ?? 0)
  const available = Number(
    inventory?.available_quantity ?? Math.max(0, stocked - reserved)
  )

  return {
    ...globalCtx,
    id: inventory?.id || "ilev_01",
    inventory_item_id: inventory?.inventory_item_id || "iitem_01",
    sku:
      inventory?.sku ||
      inventory?.inventory_item?.sku ||
      "SKU-DEFAULT-01",
    title:
      inventory?.title ||
      inventory?.inventory_item?.title ||
      "Inventory Item",
    location_id: inventory?.location_id || "sloc_01",
    location_name:
      inventory?.location_name ||
      inventory?.stock_location?.name ||
      "Main Warehouse",
    stocked_quantity: stocked,
    reserved_quantity: reserved,
    available_quantity: available,
  }
}

export function transformProductData(
  product: Record<string, any>,
  pluginOptions?: NotificationsPluginOptions
): Record<string, any> {
  const globalCtx = buildGlobalStoreContext(pluginOptions)
  return {
    ...globalCtx,
    id: product?.id || "prod_01",
    title: product?.title || "Sample Product",
    handle: product?.handle || "sample-product",
    status: product?.status || "published",
    description: product?.description || "",
    thumbnail: product?.thumbnail || "",
    product_url: `${globalCtx.store_url.replace(/\/$/, "")}/products/${product?.handle || product?.id || "sample-product"}`,
    variants: Array.isArray(product?.variants) ? product.variants : [],
  }
}

export function getMockContextByType(
  contextType: ContextType,
  pluginOptions?: NotificationsPluginOptions,
  locale = "en"
): Record<string, any> {
  const globalCtx = buildGlobalStoreContext(pluginOptions)

  switch (contextType) {
    case "order":
      return transformOrderData(
        {
          id: "order_01J9MOCK8899",
          display_id: 1042,
          created_at: "2026-10-10T10:30:00.000Z",
          status: "pending",
          payment_status: "captured",
          fulfillment_status: "not_fulfilled",
          currency_code: "EUR",
          email: "alex.rivera@example.com",
          customer: {
            id: "cus_01J9MOCK",
            first_name: "Alex",
            last_name: "Rivera",
            email: "alex.rivera@example.com",
            phone: "+14155552671",
            metadata: { telegram_chat_id: "987654321" },
          },
          shipping_address: {
            first_name: "Alex",
            last_name: "Rivera",
            company: "Rivera Studio GmbH",
            address_1: "Friedrichstraße 123",
            city: "Berlin",
            postal_code: "10117",
            country_code: "de",
            phone: "+14155552671",
          },
          billing_address: {
            first_name: "Alex",
            last_name: "Rivera",
            company: "Rivera Studio GmbH",
            address_1: "Friedrichstraße 123",
            city: "Berlin",
            postal_code: "10117",
            country_code: "de",
          },
          items: [
            {
              id: "item_1",
              title: "Mechanical Wireless Keyboard Pro",
              variant_title: "Tactile / Space Gray",
              variant_sku: "KB-PRO-GRY",
              quantity: 1,
              unit_price: 189,
              total: 189,
            },
            {
              id: "item_2",
              title: "Coiled Aviator USB-C Cable",
              variant_title: "Obsidian Black",
              variant_sku: "CBL-USB-BLK",
              quantity: 2,
              unit_price: 29,
              total: 58,
            },
          ],
          subtotal: 247,
          shipping_total: 12,
          tax_total: 49.21,
          discount_total: 0,
          total: 308.21,
        },
        pluginOptions,
        locale
      )

    case "shipment":
      return transformShipmentData(
        {
          id: "ful_01J9MOCK",
          provider_id: "DHL Express",
          labels: [
            {
              tracking_number: "JJD009988776655",
              tracking_url: "https://www.dhl.com/en/express/tracking.html?AWB=JJD009988776655",
            },
          ],
        },
        getMockContextByType("order", pluginOptions, locale),
        pluginOptions,
        locale
      )

    case "inventory-level":
      return transformInventoryLevelData(
        {
          id: "ilev_01J9MOCK",
          sku: "KB-PRO-GRY",
          title: "Mechanical Wireless Keyboard Pro",
          location_name: "Berlin Central Fulfillment Hub",
          stocked_quantity: 4,
          reserved_quantity: 2,
          available_quantity: 2,
        },
        pluginOptions
      )

    case "product":
      return transformProductData(
        {
          id: "prod_01J9MOCK",
          title: "Mechanical Wireless Keyboard Pro",
          handle: "mechanical-wireless-keyboard-pro",
          status: "published",
          description: "Hot-swappable aluminum wireless mechanical keyboard.",
        },
        pluginOptions
      )

    case "cart":
      return {
        ...globalCtx,
        id: "cart_01J9MOCK",
        first_name: "Alex",
        email: "alex.rivera@example.com",
        phone: "+14155552671",
        total_formatted: formatCurrencyAmount(247, "EUR", locale),
        recovery_url: `${globalCtx.store_url.replace(/\/$/, "")}/cart/recover?cart_id=cart_01J9MOCK`,
      }

    case "document":
      return {
        ...globalCtx,
        document_id: "doc_01J9MOCK",
        document_number: "INV-2026-00042",
        document_type: "invoice",
        document_type_label: "Invoice",
        order_id: "order_01J9MOCK8899",
        order_display_id: "1042",
        first_name: "Alex",
        total_formatted: formatCurrencyAmount(308.21, "EUR", locale),
      }

    case "otp":
    default:
      return {
        ...globalCtx,
        first_name: "Alex",
        otp_code: "482910",
        expires_in_minutes: 10,
      }
  }
}

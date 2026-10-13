import React from "react"
import {
  Document as PdfDocument,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import { ReactPdfTemplateProps } from "./clean-template"
import { formatAddressLines, formatDate } from "../../utils/formatters"
import { SignatureBlock } from "./signature-block"

/**
 * PackingSlipTemplate (Phase 2) — Displays fulfillment items, SKUs, variants, quantities,
 * weights, carrier & tracking numbers, and warehouse address. Strictly omits all prices.
 */
export const PackingSlipTemplate: React.FC<ReactPdfTemplateProps> = ({
  context,
  t,
}) => {
  const { order, settings, fulfillment, b2b } = context
  const primaryColor = settings.primary_color || "#18181b"
  const secondaryColor = settings.secondary_color || "#71717a"

  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontSize: 9.5,
      fontFamily: settings.font_family || "Helvetica",
      color: "#18181b",
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      paddingBottom: 14,
    },
    title: {
      fontSize: 19,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 6,
    },
    muted: {
      fontSize: 8.5,
      color: secondaryColor,
      lineHeight: 1.35,
    },
    addressesRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    addressCol: {
      width: "48%",
      padding: 10,
      backgroundColor: "#fafafa",
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#e4e4e7",
    },
    sectionHeading: {
      fontSize: 8,
      fontWeight: "bold",
      textTransform: "uppercase",
      color: primaryColor,
      marginBottom: 4,
    },
    trackingBanner: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 10,
      backgroundColor: "#f4f4f5",
      borderRadius: 4,
      marginBottom: 16,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: primaryColor,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    thText: {
      fontSize: 8,
      fontWeight: "bold",
      color: "#ffffff",
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#d4d4d8",
    },
    colDesc: { flex: 3 },
    colVariant: { flex: 1.5 },
    colSku: { flex: 1.3 },
    colWeight: { width: 64, textAlign: "right" },
    colQty: { width: 54, textAlign: "right" },
    summaryBar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 14,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: primaryColor,
    },
    summaryItem: {
      marginLeft: 20,
      fontSize: 9.5,
      fontWeight: "bold",
    },
  })

  const itemsToRender =
    fulfillment?.items && fulfillment.items.length > 0
      ? fulfillment.items
      : order.items.map((item) => ({
          line_item_id: item.id,
          title: item.title,
          sku: item.sku,
          variant_title: item.variant_title,
          quantity: item.quantity,
          weight: item.weight,
        }))

  const totalQty = itemsToRender.reduce((acc, i) => acc + (i.quantity || 0), 0)
  const totalWeightGrams = itemsToRender.reduce(
    (acc, i) => acc + (i.weight || 0) * (i.quantity || 1),
    0
  )
  const shippingLines = formatAddressLines(
    order.shipping_address || order.billing_address
  )

  return (
    <PdfDocument>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ maxWidth: "52%" }}>
            {settings.company_logo ? (
              <Image
                src={settings.company_logo}
                style={{ maxWidth: 110, maxHeight: 42, marginBottom: 6 }}
              />
            ) : null}
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>
              {settings.company_name}
            </Text>
            <Text style={styles.muted}>
              {fulfillment?.warehouse_address || settings.company_address}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>{t.packing_slip_title}</Text>
            <Text style={styles.muted}>
              {t.packing_slip_number}: {context.document_number}
            </Text>
            <Text style={styles.muted}>
              {t.order_number}: #{order.display_id}
            </Text>
            <Text style={styles.muted}>
              {t.issue_date}: {formatDate(context.generated_at, context.locale)}
            </Text>
            {b2b?.po_number ? (
              <Text style={styles.muted}>
                {t.po_number}: {b2b.po_number}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.addressesRow}>
          <View style={styles.addressCol}>
            <Text style={styles.sectionHeading}>{t.ship_to}</Text>
            {shippingLines.map((line, idx) => (
              <Text key={`ship-${idx}`} style={{ fontSize: 9, lineHeight: 1.35 }}>
                {line}
              </Text>
            ))}
          </View>

          <View style={styles.addressCol}>
            <Text style={styles.sectionHeading}>{t.warehouse}</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.35 }}>
              {settings.company_name}
            </Text>
            <Text style={styles.muted}>
              {fulfillment?.warehouse_address || settings.company_address}
            </Text>
            {fulfillment?.carrier ? (
              <Text style={{ fontSize: 9, marginTop: 4 }}>
                {t.carrier}: {fulfillment.carrier}
              </Text>
            ) : null}
            {fulfillment?.tracking_numbers?.length ? (
              <Text style={{ fontSize: 9, fontWeight: "bold", marginTop: 2 }}>
                {t.tracking_number}: {fulfillment.tracking_numbers.join(", ")}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Line Items Table — NO PRICES */}
        <View style={styles.tableHeader} fixed>
          <View style={styles.colDesc}>
            <Text style={styles.thText}>{t.item_description}</Text>
          </View>
          <View style={styles.colVariant}>
            <Text style={styles.thText}>{t.variant}</Text>
          </View>
          <View style={styles.colSku}>
            <Text style={styles.thText}>{t.sku}</Text>
          </View>
          <View style={styles.colWeight}>
            <Text style={styles.thText}>{t.weight}</Text>
          </View>
          <View style={styles.colQty}>
            <Text style={styles.thText}>{t.quantity}</Text>
          </View>
        </View>

        {itemsToRender.map((item, idx) => (
          <View
            key={item.line_item_id || `ps-item-${idx}`}
            style={styles.tableRow}
            wrap={false}
          >
            <View style={styles.colDesc}>
              <Text>{item.title}</Text>
            </View>
            <View style={styles.colVariant}>
              <Text style={styles.muted}>{item.variant_title || "-"}</Text>
            </View>
            <View style={styles.colSku}>
              <Text style={styles.muted}>{item.sku || "-"}</Text>
            </View>
            <View style={styles.colWeight}>
              <Text style={styles.muted}>
                {item.weight ? `${item.weight} g` : "-"}
              </Text>
            </View>
            <View style={styles.colQty}>
              <Text style={{ fontWeight: "bold" }}>{item.quantity}</Text>
            </View>
          </View>
        ))}

        <View style={styles.summaryBar} wrap={false}>
          <Text style={styles.summaryItem}>
            {t.total_items}: {itemsToRender.length}
          </Text>
          <Text style={styles.summaryItem}>
            {t.total_quantity}: {totalQty}
          </Text>
          {totalWeightGrams > 0 ? (
            <Text style={styles.summaryItem}>
              {t.total_weight}: {(totalWeightGrams / 1000).toFixed(2)} kg
            </Text>
          ) : null}
        </View>

        {settings.require_signature ? (
          <SignatureBlock
            t={t}
            role={settings.signature_role || "Recipient"}
            companyName={settings.company_name}
            buyerName={
              [
                order.shipping_address?.first_name,
                order.shipping_address?.last_name,
              ]
                .filter(Boolean)
                .join(" ") || b2b?.company_name
            }
          />
        ) : null}
      </Page>
    </PdfDocument>
  )
}

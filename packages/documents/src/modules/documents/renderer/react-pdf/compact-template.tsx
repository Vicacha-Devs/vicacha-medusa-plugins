import React from "react"
import {
  Document as PdfDocument,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import { ReactPdfTemplateProps } from "./clean-template"
import {
  formatAddressLines,
  formatCurrency,
  formatDate,
} from "../../utils/formatters"

/**
 * CompactTemplate — High-density layout engineered for large wholesale/B2B orders (50-100+ items).
 */
export const CompactTemplate: React.FC<ReactPdfTemplateProps> = ({
  context,
  t,
}) => {
  const { order, settings, b2b } = context
  const primaryColor = settings.primary_color || "#18181b"

  const styles = StyleSheet.create({
    page: {
      padding: 24,
      fontSize: 8,
      fontFamily: settings.font_family || "Helvetica",
      color: "#18181b",
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: primaryColor,
      paddingBottom: 8,
      marginBottom: 10,
    },
    title: {
      fontSize: 13,
      fontWeight: "bold",
      color: primaryColor,
    },
    partiesBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    col: { width: "48%" },
    label: { fontSize: 7, fontWeight: "bold", color: "#71717a" },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#f4f4f5",
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: primaryColor,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 3.5,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e4e4e7",
    },
    cIdx: { width: 22 },
    cDesc: { flex: 3 },
    cSku: { flex: 1.3 },
    cQty: { width: 32, textAlign: "right" },
    cPrice: { width: 56, textAlign: "right" },
    cTotal: { width: 62, textAlign: "right" },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 8,
    },
  })

  return (
    <PdfDocument>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} fixed>
          <View>
            <Text style={styles.title}>
              {settings.company_name} — {t.invoice_title} {context.document_number}
            </Text>
            <Text>
              {t.order_number}: #{order.display_id} • {t.issue_date}:{" "}
              {formatDate(context.generated_at, context.locale)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {settings.company_tax_id ? (
              <Text>
                {t.tax_id}: {settings.company_tax_id}
              </Text>
            ) : null}
            {b2b?.po_number ? (
              <Text>
                {t.po_number}: {b2b.po_number}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.partiesBar}>
          <View style={styles.col}>
            <Text style={styles.label}>{t.bill_to}</Text>
            <Text>{formatAddressLines(order.billing_address).join(", ")}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>{t.ship_to}</Text>
            <Text>{formatAddressLines(order.shipping_address).join(", ")}</Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={styles.cIdx}>#</Text>
          <Text style={styles.cDesc}>{t.item_description}</Text>
          <Text style={styles.cSku}>{t.sku}</Text>
          <Text style={styles.cQty}>{t.quantity}</Text>
          <Text style={styles.cPrice}>{t.unit_price}</Text>
          <Text style={styles.cTotal}>{t.total}</Text>
        </View>

        {order.items.map((item, idx) => (
          <View key={item.id || `c-${idx}`} style={styles.tableRow} wrap={false}>
            <Text style={styles.cIdx}>{idx + 1}</Text>
            <Text style={styles.cDesc}>{item.title}</Text>
            <Text style={styles.cSku}>{item.sku || "-"}</Text>
            <Text style={styles.cQty}>{item.quantity}</Text>
            <Text style={styles.cPrice}>
              {formatCurrency(item.unit_price, order.currency_code, context.locale)}
            </Text>
            <Text style={styles.cTotal}>
              {formatCurrency(item.total, order.currency_code, context.locale)}
            </Text>
          </View>
        ))}

        <View style={styles.summaryRow} wrap={false}>
          <Text style={{ fontWeight: "bold", fontSize: 10 }}>
            {t.grand_total}:{" "}
            {formatCurrency(order.total, order.currency_code, context.locale)}
          </Text>
        </View>
      </Page>
    </PdfDocument>
  )
}

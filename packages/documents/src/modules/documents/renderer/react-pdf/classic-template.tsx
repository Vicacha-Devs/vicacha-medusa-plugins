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
import {
  formatAddressLines,
  formatCurrency,
  formatDate,
} from "../../utils/formatters"
import { TipTapNotesRenderer } from "./tiptap-renderer"
import { SignatureBlock } from "./signature-block"

/**
 * ClassicTemplate — Traditional framed executive accounting layout with formal bordered grid.
 */
export const ClassicTemplate: React.FC<ReactPdfTemplateProps> = ({
  context,
  t,
}) => {
  const { order, settings, b2b } = context
  const primaryColor = settings.primary_color || "#18181b"
  const secondaryColor = settings.secondary_color || "#52525b"

  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontSize: 9.5,
      fontFamily: settings.font_family || "Helvetica",
      color: "#18181b",
    },
    headerFrame: {
      borderWidth: 1.5,
      borderColor: primaryColor,
      padding: 14,
      marginBottom: 16,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    companyName: {
      fontSize: 16,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: primaryColor,
      textAlign: "right",
      marginBottom: 6,
    },
    smallText: {
      fontSize: 8.5,
      color: secondaryColor,
      lineHeight: 1.35,
    },
    gridRow: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: "#d4d4d8",
      marginBottom: 16,
    },
    gridCell: {
      flex: 1,
      padding: 10,
      borderRightWidth: 1,
      borderRightColor: "#d4d4d8",
    },
    gridCellLast: {
      flex: 1,
      padding: 10,
    },
    cellHeading: {
      fontSize: 8,
      fontWeight: "bold",
      color: primaryColor,
      textTransform: "uppercase",
      marginBottom: 4,
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
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: "#d4d4d8",
    },
    colDesc: { flex: 3 },
    colSku: { flex: 1.2 },
    colQty: { width: 42, textAlign: "right" },
    colPrice: { width: 68, textAlign: "right" },
    colTotal: { width: 76, textAlign: "right" },
    totalsContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 12,
    },
    totalsTable: {
      width: 220,
      borderWidth: 1,
      borderColor: "#d4d4d8",
    },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e4e4e7",
    },
    grandRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: primaryColor,
    },
    grandText: {
      fontSize: 10,
      fontWeight: "bold",
      color: "#ffffff",
    },
  })

  const billingLines = formatAddressLines(order.billing_address)
  const shippingLines = formatAddressLines(order.shipping_address)

  return (
    <PdfDocument>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerFrame}>
          <View style={{ maxWidth: "55%" }}>
            {settings.company_logo ? (
              <Image
                src={settings.company_logo}
                style={{ maxWidth: 110, maxHeight: 42, marginBottom: 6 }}
              />
            ) : null}
            <Text style={styles.companyName}>{settings.company_name}</Text>
            <Text style={styles.smallText}>{settings.company_address}</Text>
            {settings.company_tax_id ? (
              <Text style={styles.smallText}>
                {t.tax_id}: {settings.company_tax_id}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>{t.invoice_title}</Text>
            <Text style={styles.smallText}>
              {t.invoice_number}: {context.document_number}
            </Text>
            <Text style={styles.smallText}>
              {t.order_number}: #{order.display_id}
            </Text>
            <Text style={styles.smallText}>
              {t.issue_date}: {formatDate(context.generated_at, context.locale)}
            </Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={styles.cellHeading}>{t.bill_to}</Text>
            {billingLines.map((l, i) => (
              <Text key={`b-${i}`} style={styles.smallText}>
                {l}
              </Text>
            ))}
            {b2b?.is_b2b && b2b.tax_id ? (
              <Text style={styles.smallText}>
                {t.tax_id}: {b2b.tax_id}
              </Text>
            ) : null}
            {b2b?.is_b2b && b2b.po_number ? (
              <Text style={styles.smallText}>
                {t.po_number}: {b2b.po_number}
              </Text>
            ) : null}
          </View>
          <View style={styles.gridCellLast}>
            <Text style={styles.cellHeading}>{t.ship_to}</Text>
            {shippingLines.map((l, i) => (
              <Text key={`s-${i}`} style={styles.smallText}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <View style={styles.colDesc}>
            <Text style={styles.thText}>{t.item_description}</Text>
          </View>
          <View style={styles.colSku}>
            <Text style={styles.thText}>{t.sku}</Text>
          </View>
          <View style={styles.colQty}>
            <Text style={styles.thText}>{t.quantity}</Text>
          </View>
          <View style={styles.colPrice}>
            <Text style={styles.thText}>{t.unit_price}</Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={styles.thText}>{t.total}</Text>
          </View>
        </View>

        {order.items.map((item, idx) => (
          <View key={item.id || `row-${idx}`} style={styles.tableRow} wrap={false}>
            <View style={styles.colDesc}>
              <Text>{item.title}</Text>
            </View>
            <View style={styles.colSku}>
              <Text style={styles.smallText}>{item.sku || "-"}</Text>
            </View>
            <View style={styles.colQty}>
              <Text>{item.quantity}</Text>
            </View>
            <View style={styles.colPrice}>
              <Text>
                {formatCurrency(item.unit_price, order.currency_code, context.locale)}
              </Text>
            </View>
            <View style={styles.colTotal}>
              <Text>
                {formatCurrency(item.total, order.currency_code, context.locale)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.totalsContainer} wrap={false}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.smallText}>{t.subtotal}</Text>
              <Text>
                {formatCurrency(order.subtotal, order.currency_code, context.locale)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.smallText}>{t.shipping_total}</Text>
              <Text>
                {formatCurrency(order.shipping_total, order.currency_code, context.locale)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.smallText}>{t.tax_total}</Text>
              <Text>
                {formatCurrency(order.tax_total, order.currency_code, context.locale)}
              </Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandText}>{t.grand_total}</Text>
              <Text style={styles.grandText}>
                {formatCurrency(order.total, order.currency_code, context.locale)}
              </Text>
            </View>
          </View>
        </View>

        {settings.notes ? (
          <View style={{ marginTop: 14 }}>
            <TipTapNotesRenderer content={settings.notes} />
          </View>
        ) : null}

        {settings.require_signature ? (
          <SignatureBlock
            t={t}
            role={settings.signature_role}
            companyName={settings.company_name}
            buyerName={b2b?.company_name}
          />
        ) : null}
      </Page>
    </PdfDocument>
  )
}

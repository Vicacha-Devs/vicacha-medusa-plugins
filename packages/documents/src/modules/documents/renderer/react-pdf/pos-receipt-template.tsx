import React from "react"
import {
  Document as PdfDocument,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import { ReactPdfTemplateProps } from "./clean-template"
import { formatCurrency, formatDate } from "../../utils/formatters"

/**
 * PosReceiptTemplate — Thermal POS receipt preset supporting 80mm (226.77pt) and 58mm (164.41pt)
 * paper widths with dynamic height calculation based on line item count (from @logicdine/medusa-plugin-invoice).
 */
export const PosReceiptTemplate: React.FC<
  ReactPdfTemplateProps & { widthMm?: 80 | 58 }
> = ({ context, t, widthMm = 80 }) => {
  const { order, settings } = context
  const pageWidthPt = widthMm === 58 ? 164.41 : 226.77
  const pageHeightPt = Math.max(
    360,
    240 + order.items.length * (widthMm === 58 ? 28 : 22)
  )

  const styles = StyleSheet.create({
    page: {
      paddingHorizontal: widthMm === 58 ? 8 : 12,
      paddingVertical: 14,
      fontSize: widthMm === 58 ? 7.5 : 8.5,
      fontFamily: "Helvetica",
      color: "#000000",
    },
    centerBlock: {
      alignItems: "center",
      marginBottom: 8,
    },
    storeName: {
      fontSize: widthMm === 58 ? 10 : 12,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 2,
    },
    smallCenter: {
      fontSize: widthMm === 58 ? 6.5 : 7.5,
      textAlign: "center",
      color: "#27272a",
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: "#000000",
      borderBottomStyle: "dashed",
      marginVertical: 6,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginVertical: 1.5,
    },
    itemBlock: {
      marginVertical: 2.5,
    },
    itemTitle: {
      fontWeight: "bold",
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: "#000000",
    },
    totalText: {
      fontSize: widthMm === 58 ? 9 : 10.5,
      fontWeight: "bold",
    },
  })

  return (
    <PdfDocument>
      <Page size={[pageWidthPt, pageHeightPt]} style={styles.page}>
        <View style={styles.centerBlock}>
          <Text style={styles.storeName}>{settings.company_name}</Text>
          {settings.company_address ? (
            <Text style={styles.smallCenter}>{settings.company_address}</Text>
          ) : null}
          {settings.company_tax_id ? (
            <Text style={styles.smallCenter}>
              {t.tax_id}: {settings.company_tax_id}
            </Text>
          ) : null}
          {settings.company_phone ? (
            <Text style={styles.smallCenter}>{settings.company_phone}</Text>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text>{t.receipt_number}:</Text>
          <Text>{context.document_number}</Text>
        </View>
        <View style={styles.row}>
          <Text>{t.order_number}:</Text>
          <Text>#{order.display_id}</Text>
        </View>
        <View style={styles.row}>
          <Text>{t.issue_date}:</Text>
          <Text>{formatDate(context.generated_at, context.locale)}</Text>
        </View>

        <View style={styles.divider} />

        {order.items.map((item, idx) => (
          <View key={item.id || `pos-${idx}`} style={styles.itemBlock}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <View style={styles.row}>
              <Text>
                {item.quantity} x{" "}
                {formatCurrency(
                  item.unit_price,
                  order.currency_code,
                  context.locale
                )}
              </Text>
              <Text>
                {formatCurrency(item.total, order.currency_code, context.locale)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text>{t.subtotal}</Text>
          <Text>
            {formatCurrency(order.subtotal, order.currency_code, context.locale)}
          </Text>
        </View>
        {order.shipping_total ? (
          <View style={styles.row}>
            <Text>{t.shipping_total}</Text>
            <Text>
              {formatCurrency(
                order.shipping_total,
                order.currency_code,
                context.locale
              )}
            </Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text>{t.tax_total}</Text>
          <Text>
            {formatCurrency(order.tax_total, order.currency_code, context.locale)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalText}>{t.grand_total}</Text>
          <Text style={styles.totalText}>
            {formatCurrency(order.total, order.currency_code, context.locale)}
          </Text>
        </View>

        {order.payment_method ? (
          <View style={[styles.row, { marginTop: 4 }]}>
            <Text>{t.payment_method}:</Text>
            <Text>{order.payment_method}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.centerBlock}>
          <Text style={styles.smallCenter}>
            {settings.footer_text || t.thank_you}
          </Text>
        </View>
      </Page>
    </PdfDocument>
  )
}

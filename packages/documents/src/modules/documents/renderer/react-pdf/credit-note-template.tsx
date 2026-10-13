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
import { SignatureBlock } from "./signature-block"

/**
 * CreditNoteTemplate (Phase 3) — Displays negative credit amounts, references the original
 * invoice number via `related_document`, and highlights the refund reason.
 */
export const CreditNoteTemplate: React.FC<ReactPdfTemplateProps> = ({
  context,
  t,
}) => {
  const { order, settings, refund, related_document, b2b } = context
  const accentColor = "#b91c1c" // Accounting crimson for credit notes

  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontSize: 9.5,
      fontFamily: settings.font_family || "Helvetica",
      color: "#18181b",
    },
    topBanner: {
      height: 5,
      backgroundColor: accentColor,
      marginBottom: 18,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: accentColor,
      marginBottom: 6,
    },
    muted: {
      fontSize: 8.5,
      color: "#52525b",
      lineHeight: 1.35,
    },
    refBanner: {
      padding: 10,
      backgroundColor: "#fef2f2",
      borderWidth: 1,
      borderColor: "#fecaca",
      borderRadius: 4,
      marginBottom: 16,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: accentColor,
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
      borderBottomColor: "#e4e4e7",
    },
    colDesc: { flex: 3 },
    colSku: { flex: 1.2 },
    colQty: { width: 42, textAlign: "right" },
    colPrice: { width: 72, textAlign: "right" },
    colTotal: { width: 78, textAlign: "right" },
    totalsWrapper: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 14,
    },
    totalsBox: {
      width: 230,
    },
    totalLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
    },
    grandTotalLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      marginTop: 4,
      borderTopWidth: 1.5,
      borderTopColor: accentColor,
    },
    grandTotalText: {
      fontSize: 11,
      fontWeight: "bold",
      color: accentColor,
    },
  })

  const ensureNegative = (val: number) => -Math.abs(val || 0)
  const billingLines = formatAddressLines(order.billing_address)
  const refInvoiceNumber =
    related_document?.document_number || refund?.reference_invoice_number

  return (
    <PdfDocument>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBanner} />

        <View style={styles.headerRow}>
          <View style={{ maxWidth: "52%" }}>
            {settings.company_logo ? (
              <Image
                src={settings.company_logo}
                style={{ maxWidth: 110, maxHeight: 42, marginBottom: 6 }}
              />
            ) : null}
            <Text style={{ fontSize: 15, fontWeight: "bold" }}>
              {settings.company_name}
            </Text>
            <Text style={styles.muted}>{settings.company_address}</Text>
            {settings.company_tax_id ? (
              <Text style={styles.muted}>
                {t.tax_id}: {settings.company_tax_id}
              </Text>
            ) : null}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>{t.credit_note_title}</Text>
            <Text style={styles.muted}>
              {t.credit_note_number}: {context.document_number}
            </Text>
            <Text style={styles.muted}>
              {t.order_number}: #{order.display_id}
            </Text>
            <Text style={styles.muted}>
              {t.issue_date}: {formatDate(context.generated_at, context.locale)}
            </Text>
          </View>
        </View>

        {/* Reference Invoice & Refund Reason Banner */}
        <View style={styles.refBanner}>
          <View>
            <Text style={{ fontSize: 8.5, fontWeight: "bold", color: accentColor }}>
              {t.reference_invoice}: {refInvoiceNumber || `#${order.display_id}`}
            </Text>
            {refund?.reason || refund?.note ? (
              <Text style={styles.muted}>
                {t.refund_reason}: {[refund.reason, refund.note].filter(Boolean).join(" — ")}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 8.5, fontWeight: "bold" }}>{t.bill_to}</Text>
            <Text style={styles.muted}>{billingLines.slice(0, 2).join(", ")}</Text>
            {b2b?.tax_id ? (
              <Text style={styles.muted}>
                {t.tax_id}: {b2b.tax_id}
              </Text>
            ) : null}
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
          <View key={item.id || `cn-${idx}`} style={styles.tableRow} wrap={false}>
            <View style={styles.colDesc}>
              <Text>{item.title}</Text>
            </View>
            <View style={styles.colSku}>
              <Text style={styles.muted}>{item.sku || "-"}</Text>
            </View>
            <View style={styles.colQty}>
              <Text>{item.quantity}</Text>
            </View>
            <View style={styles.colPrice}>
              <Text>
                {formatCurrency(
                  ensureNegative(item.unit_price),
                  order.currency_code,
                  context.locale
                )}
              </Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={{ color: accentColor, fontWeight: "bold" }}>
                {formatCurrency(
                  ensureNegative(item.total),
                  order.currency_code,
                  context.locale
                )}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.totalsWrapper} wrap={false}>
          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>{t.subtotal}</Text>
              <Text>
                {formatCurrency(
                  ensureNegative(order.subtotal),
                  order.currency_code,
                  context.locale
                )}
              </Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.muted}>{t.tax_total}</Text>
              <Text>
                {formatCurrency(
                  ensureNegative(order.tax_total),
                  order.currency_code,
                  context.locale
                )}
              </Text>
            </View>
            <View style={styles.grandTotalLine}>
              <Text style={styles.grandTotalText}>{t.refund_total}</Text>
              <Text style={styles.grandTotalText}>
                {formatCurrency(
                  ensureNegative(refund?.amount ?? order.total),
                  order.currency_code,
                  context.locale
                )}
              </Text>
            </View>
          </View>
        </View>

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

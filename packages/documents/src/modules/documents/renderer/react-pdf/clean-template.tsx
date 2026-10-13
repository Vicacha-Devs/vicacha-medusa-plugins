import React from "react"
import {
  Document as PdfDocument,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import { DocumentRenderContext } from "../../types"
import { DocumentTranslations } from "../../i18n"
import {
  formatAddressLines,
  formatCurrency,
  formatDate,
} from "../../utils/formatters"
import { TipTapNotesRenderer } from "./tiptap-renderer"
import { SignatureBlock } from "./signature-block"

export interface ReactPdfTemplateProps {
  context: DocumentRenderContext
  t: DocumentTranslations
}

export const CleanTemplate: React.FC<ReactPdfTemplateProps> = ({
  context,
  t,
}) => {
  const { order, settings, b2b, related_document } = context
  const primaryColor = settings.primary_color || "#18181b"
  const secondaryColor = settings.secondary_color || "#71717a"
  const sections = settings.sections || {}

  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontSize: 9.5,
      fontFamily: settings.font_family || "Helvetica",
      color: "#18181b",
    },
    accentBar: {
      height: 4,
      backgroundColor: primaryColor,
      marginBottom: 20,
      borderRadius: 2,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    companyBlock: {
      maxWidth: "52%",
    },
    logo: {
      maxWidth: 120,
      maxHeight: 48,
      marginBottom: 8,
    },
    companyName: {
      fontSize: 15,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 3,
    },
    mutedText: {
      fontSize: 8.5,
      color: secondaryColor,
      lineHeight: 1.35,
    },
    docTitleBlock: {
      alignItems: "flex-end",
      maxWidth: "45%",
    },
    docTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: primaryColor,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 2,
    },
    metaLabel: {
      fontSize: 8.5,
      color: secondaryColor,
      marginRight: 6,
    },
    metaValue: {
      fontSize: 8.5,
      fontWeight: "bold",
      color: "#18181b",
    },
    addressesRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      paddingTop: 12,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#e4e4e7",
    },
    addressCol: {
      width: "48%",
    },
    sectionHeading: {
      fontSize: 8,
      fontWeight: "bold",
      textTransform: "uppercase",
      color: secondaryColor,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    addressLine: {
      fontSize: 9,
      lineHeight: 1.35,
      color: "#27272a",
    },
    b2bBadgeBox: {
      marginTop: 6,
      padding: 6,
      backgroundColor: "#f4f4f5",
      borderRadius: 3,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#f4f4f5",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: primaryColor,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e4e4e7",
    },
    colDesc: { flex: 3.2 },
    colSku: { flex: 1.2 },
    colQty: { width: 42, textAlign: "right" },
    colPrice: { width: 68, textAlign: "right" },
    colTax: { width: 58, textAlign: "right" },
    colTotal: { width: 72, textAlign: "right" },
    thText: {
      fontSize: 8,
      fontWeight: "bold",
      color: primaryColor,
      textTransform: "uppercase",
    },
    tdText: {
      fontSize: 9,
      color: "#18181b",
    },
    tdSubText: {
      fontSize: 7.5,
      color: secondaryColor,
      marginTop: 1,
    },
    totalsWrapper: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 14,
    },
    totalsBox: {
      width: 220,
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
      borderTopColor: primaryColor,
    },
    grandTotalLabel: {
      fontSize: 11,
      fontWeight: "bold",
      color: primaryColor,
    },
    grandTotalValue: {
      fontSize: 11,
      fontWeight: "bold",
      color: primaryColor,
    },
    notesBox: {
      marginTop: 18,
      padding: 10,
      backgroundColor: "#fafafa",
      borderRadius: 4,
      borderLeftWidth: 2,
      borderLeftColor: primaryColor,
    },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 36,
      right: 36,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 0.5,
      borderTopColor: "#e4e4e7",
      paddingTop: 6,
    },
  })

  const billingLines = formatAddressLines(order.billing_address)
  const shippingLines = formatAddressLines(order.shipping_address)
  const showB2B = b2b?.is_b2b && sections.show_b2b_fields !== false

  return (
    <PdfDocument>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            {settings.company_logo && sections.show_logo !== false ? (
              <Image src={settings.company_logo} style={styles.logo} />
            ) : null}
            <Text style={styles.companyName}>{settings.company_name}</Text>
            {settings.company_address ? (
              <Text style={styles.mutedText}>{settings.company_address}</Text>
            ) : null}
            {[
              settings.company_postal_code,
              settings.company_city,
              settings.company_state,
              settings.company_country,
            ]
              .filter(Boolean)
              .join(" ") ? (
              <Text style={styles.mutedText}>
                {[
                  settings.company_postal_code,
                  settings.company_city,
                  settings.company_state,
                  settings.company_country,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            ) : null}
            {settings.company_tax_id && sections.show_company_tax_id !== false ? (
              <Text style={styles.mutedText}>
                {t.tax_id}: {settings.company_tax_id}
              </Text>
            ) : null}
            {settings.company_email ? (
              <Text style={styles.mutedText}>{settings.company_email}</Text>
            ) : null}
            {settings.company_phone ? (
              <Text style={styles.mutedText}>{settings.company_phone}</Text>
            ) : null}
          </View>

          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>{t.invoice_title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t.invoice_number}:</Text>
              <Text style={styles.metaValue}>{context.document_number}</Text>
            </View>
            {context.version > 1 ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t.revision}:</Text>
                <Text style={styles.metaValue}>v{context.version}</Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t.order_number}:</Text>
              <Text style={styles.metaValue}>#{order.display_id}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t.issue_date}:</Text>
              <Text style={styles.metaValue}>
                {formatDate(context.generated_at, context.locale)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t.order_date}:</Text>
              <Text style={styles.metaValue}>
                {formatDate(order.created_at, context.locale)}
              </Text>
            </View>
            {related_document ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t.reference_invoice}:</Text>
                <Text style={styles.metaValue}>
                  {related_document.document_number}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Addresses & Optional B2B Context */}
        <View style={styles.addressesRow}>
          <View style={styles.addressCol}>
            <Text style={styles.sectionHeading}>{t.bill_to}</Text>
            {billingLines.map((line, idx) => (
              <Text key={`bill-${idx}`} style={styles.addressLine}>
                {line}
              </Text>
            ))}
            {order.email ? (
              <Text style={styles.mutedText}>{order.email}</Text>
            ) : null}
            {showB2B ? (
              <View style={styles.b2bBadgeBox}>
                {b2b.company_name ? (
                  <Text style={styles.addressLine}>{b2b.company_name}</Text>
                ) : null}
                {b2b.tax_id ? (
                  <Text style={styles.mutedText}>
                    {t.tax_id}: {b2b.tax_id}
                  </Text>
                ) : null}
                {b2b.vat_number ? (
                  <Text style={styles.mutedText}>
                    {t.vat_number}: {b2b.vat_number}
                  </Text>
                ) : null}
                {b2b.po_number ? (
                  <Text style={styles.mutedText}>
                    {t.po_number}: {b2b.po_number}
                  </Text>
                ) : null}
                {b2b.payment_terms ? (
                  <Text style={styles.mutedText}>
                    {t.payment_terms}: {b2b.payment_terms}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {sections.show_shipping_address !== false && shippingLines.length > 0 ? (
            <View style={styles.addressCol}>
              <Text style={styles.sectionHeading}>{t.ship_to}</Text>
              {shippingLines.map((line, idx) => (
                <Text key={`ship-${idx}`} style={styles.addressLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* Line Items Table */}
        <View style={styles.tableHeader} fixed>
          <View style={styles.colDesc}>
            <Text style={styles.thText}>{t.item_description}</Text>
          </View>
          {sections.show_sku !== false ? (
            <View style={styles.colSku}>
              <Text style={styles.thText}>{t.sku}</Text>
            </View>
          ) : null}
          <View style={styles.colQty}>
            <Text style={styles.thText}>{t.quantity}</Text>
          </View>
          <View style={styles.colPrice}>
            <Text style={styles.thText}>{t.unit_price}</Text>
          </View>
          {sections.show_tax_column !== false ? (
            <View style={styles.colTax}>
              <Text style={styles.thText}>{t.tax}</Text>
            </View>
          ) : null}
          <View style={styles.colTotal}>
            <Text style={styles.thText}>{t.total}</Text>
          </View>
        </View>

        {order.items.map((item, idx) => (
          <View key={item.id || `item-${idx}`} style={styles.tableRow} wrap={false}>
            <View style={styles.colDesc}>
              <Text style={styles.tdText}>{item.title}</Text>
              {item.variant_title ? (
                <Text style={styles.tdSubText}>{item.variant_title}</Text>
              ) : null}
            </View>
            {sections.show_sku !== false ? (
              <View style={styles.colSku}>
                <Text style={styles.tdText}>{item.sku || "-"}</Text>
              </View>
            ) : null}
            <View style={styles.colQty}>
              <Text style={styles.tdText}>{item.quantity}</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={styles.tdText}>
                {formatCurrency(item.unit_price, order.currency_code, context.locale)}
              </Text>
            </View>
            {sections.show_tax_column !== false ? (
              <View style={styles.colTax}>
                <Text style={styles.tdText}>
                  {formatCurrency(item.tax_total, order.currency_code, context.locale)}
                </Text>
              </View>
            ) : null}
            <View style={styles.colTotal}>
              <Text style={styles.tdText}>
                {formatCurrency(item.total, order.currency_code, context.locale)}
              </Text>
            </View>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsWrapper} wrap={false}>
          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={styles.mutedText}>{t.subtotal}</Text>
              <Text style={styles.tdText}>
                {formatCurrency(order.subtotal, order.currency_code, context.locale)}
              </Text>
            </View>
            {order.discount_total ? (
              <View style={styles.totalLine}>
                <Text style={styles.mutedText}>{t.discount_total}</Text>
                <Text style={styles.tdText}>
                  -{formatCurrency(Math.abs(order.discount_total), order.currency_code, context.locale)}
                </Text>
              </View>
            ) : null}
            {sections.show_shipping_line !== false ? (
              <View style={styles.totalLine}>
                <Text style={styles.mutedText}>{t.shipping_total}</Text>
                <Text style={styles.tdText}>
                  {formatCurrency(order.shipping_total, order.currency_code, context.locale)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalLine}>
              <Text style={styles.mutedText}>{t.tax_total}</Text>
              <Text style={styles.tdText}>
                {formatCurrency(order.tax_total, order.currency_code, context.locale)}
              </Text>
            </View>
            <View style={styles.grandTotalLine}>
              <Text style={styles.grandTotalLabel}>{t.grand_total}</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(order.total, order.currency_code, context.locale)}
              </Text>
            </View>
          </View>
        </View>

        {/* Rich Text Notes & Banking Info */}
        {(settings.notes && sections.show_notes !== false) ||
        (settings.bank_details && sections.show_bank_details !== false) ? (
          <View style={styles.notesBox} wrap={false}>
            {settings.notes && sections.show_notes !== false ? (
              <View style={{ marginBottom: settings.bank_details ? 6 : 0 }}>
                <Text style={styles.sectionHeading}>{t.notes}</Text>
                <TipTapNotesRenderer content={settings.notes} />
              </View>
            ) : null}
            {settings.bank_details && sections.show_bank_details !== false ? (
              <View>
                <Text style={styles.sectionHeading}>{t.bank_details}</Text>
                <Text style={styles.mutedText}>{settings.bank_details}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Optional Docuseal Signature Block */}
        {settings.require_signature || sections.show_signature_block ? (
          <SignatureBlock
            t={t}
            role={settings.signature_role}
            companyName={settings.company_name}
            buyerName={
              b2b?.company_name ||
              [order.billing_address?.first_name, order.billing_address?.last_name]
                .filter(Boolean)
                .join(" ")
            }
          />
        ) : null}

        {/* Page Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.mutedText}>
            {settings.footer_text || t.thank_you}
          </Text>
          <Text
            style={styles.mutedText}
            render={({ pageNumber, totalPages }) =>
              t.page_of
                .replace("{current}", String(pageNumber))
                .replace("{total}", String(totalPages))
            }
          />
        </View>
      </Page>
    </PdfDocument>
  )
}

import React from "react"
import { Text, View, StyleSheet } from "@react-pdf/renderer"

import { DocumentTranslations } from "../../i18n"

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  box: {
    width: "45%",
    padding: 8,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 4,
    minHeight: 64,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#52525b",
    textTransform: "uppercase",
  },
  anchorTag: {
    fontSize: 6,
    color: "#fafafa", // Visually subtle anchor tag parsed by Docuseal /submissions/pdf
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 4,
    marginTop: 18,
  },
  subLabel: {
    fontSize: 7,
    color: "#71717a",
  },
})

export interface SignatureBlockProps {
  t: DocumentTranslations
  role?: string | null
  companyName?: string | null
  buyerName?: string | null
}

/**
 * Renders a two-column Authorized & Customer Signature block with embedded
 * Docuseal text field tags (`{{signature;role=...;type=signature}}`) for zero-config `/submissions/pdf` signing.
 */
export const SignatureBlock: React.FC<SignatureBlockProps> = ({
  t,
  role = "Customer",
  companyName,
  buyerName,
}) => {
  const safeRole = (role || "Customer").replace(/[^a-zA-Z0-9_-]/g, "") || "Customer"

  return (
    <View style={styles.container} wrap={false}>
      <View style={styles.box}>
        <Text style={styles.label}>{t.authorized_signature}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.subLabel}>{companyName || ""}</Text>
          <Text style={styles.subLabel}>{t.signature_date}</Text>
        </View>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>{t.customer_signature}</Text>
        <Text style={styles.anchorTag}>
          {`{{signature;role=${safeRole};type=signature;required=true}}`}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.subLabel}>{buyerName || ""}</Text>
          <Text style={styles.anchorTag}>
            {`{{date;role=${safeRole};type=date}}`}
          </Text>
          <Text style={styles.subLabel}>{t.signature_date}</Text>
        </View>
      </View>
    </View>
  )
}

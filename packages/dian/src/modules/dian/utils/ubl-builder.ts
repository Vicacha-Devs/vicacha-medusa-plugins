import type { DianDocumentBuildContext } from "../../../types"
import { formatDianAmount } from "./cufe-cude"

/**
 * Escapes untrusted strings for safe inclusion in XML element text and attributes.
 */
export function escapeXml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Resolves the DIAN `CustomizationID` and `ProfileID` per Anexo Técnico 1.9 & Resolución 000165.
 */
export function resolveUblProfileMetadata(ctx: DianDocumentBuildContext): {
  root_tag: "Invoice" | "CreditNote" | "DebitNote"
  root_xmlns: string
  customization_id: string
  profile_id: string
  line_tag: "InvoiceLine" | "CreditNoteLine" | "DebitNoteLine"
  quantity_tag: "InvoicedQuantity" | "CreditedQuantity" | "DebitedQuantity"
} {
  if (ctx.document_type === "91") {
    return {
      root_tag: "CreditNote",
      root_xmlns: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
      customization_id: ctx.billing_reference ? "20" : "22",
      profile_id: "DIAN 2.1: Nota Crédito de Factura Electrónica de Venta",
      line_tag: "CreditNoteLine",
      quantity_tag: "CreditedQuantity",
    }
  }
  if (ctx.document_type === "92") {
    return {
      root_tag: "DebitNote",
      root_xmlns: "urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2",
      customization_id: ctx.billing_reference ? "30" : "32",
      profile_id: "DIAN 2.1: Nota Débito de Factura Electrónica de Venta",
      line_tag: "DebitNoteLine",
      quantity_tag: "DebitedQuantity",
    }
  }
  if (ctx.document_type === "20") {
    return {
      root_tag: "Invoice",
      root_xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      customization_id: "20",
      profile_id:
        "DIAN 2.1: documento equivalente POS - Resolución 000165 de 2023",
      line_tag: "InvoiceLine",
      quantity_tag: "InvoicedQuantity",
    }
  }
  return {
    root_tag: "Invoice",
    root_xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    customization_id: ctx.document_type === "02" ? "02" : "10",
    profile_id: "DIAN 2.1: Factura Electrónica de Venta",
    line_tag: "InvoiceLine",
    quantity_tag: "InvoicedQuantity",
  }
}

/**
 * Generates an official Colombian DIAN UBL 2.1 XML document (`Invoice`, `CreditNote`, `DebitNote`, or POS `20`).
 */
export function buildDianUblXml(ctx: DianDocumentBuildContext): string {
  const meta = resolveUblProfileMetadata(ctx)
  const currency = escapeXml(ctx.currency_code.toUpperCase())
  const responsibilitiesJoined = escapeXml(
    ctx.seller.fiscal_responsibilities.join(";")
  )
  const buyerResponsibilitiesJoined = escapeXml(
    ctx.buyer.fiscal_responsibilities.join(";")
  )

  const posBenefitsBlock =
    ctx.document_type === "20" && ctx.pos_metadata
      ? `
      <sts:SoftwareManufacturer>
        <sts:SoftwareName>${escapeXml(ctx.pos_metadata.software_maker_name)}</sts:SoftwareName>
        <sts:CompanyName>${escapeXml(ctx.seller.registration_name)}</sts:CompanyName>
      </sts:SoftwareManufacturer>`
      : ""

  const billingReferenceXml = ctx.billing_reference
    ? `
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(ctx.billing_reference.invoice_number)}</cbc:ID>
      <cbc:UUID schemeName="CUFE-SHA384">${escapeXml(ctx.billing_reference.cufe)}</cbc:UUID>
      <cbc:IssueDate>${escapeXml(ctx.billing_reference.issue_date)}</cbc:IssueDate>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>`
    : ""

  const discrepancyResponseXml = ctx.discrepancy_response
    ? `
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${escapeXml(ctx.billing_reference?.invoice_number || ctx.document_number)}</cbc:ReferenceID>
    <cbc:ResponseCode>${escapeXml(ctx.discrepancy_response.concept_code)}</cbc:ResponseCode>
    <cbc:Description>${escapeXml(ctx.discrepancy_response.description)}</cbc:Description>
  </cac:DiscrepancyResponse>`
    : ""

  const taxTotalsXml = ctx.taxes
    .map(
      (tax) => `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${formatDianAmount(tax.tax_amount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${formatDianAmount(tax.taxable_amount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${formatDianAmount(tax.tax_amount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${formatDianAmount(tax.rate)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>${escapeXml(tax.tax_code)}</cbc:ID>
          <cbc:Name>${escapeXml(tax.tax_name)}</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`
    )
    .join("")

  const withholdingTotalsXml = ctx.withholdings
    .map(
      (wh) => `
  <cac:WithholdingTaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${formatDianAmount(wh.withholding_amount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${formatDianAmount(wh.taxable_amount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${formatDianAmount(wh.withholding_amount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${formatDianAmount(wh.rate)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>${escapeXml(wh.withholding_code)}</cbc:ID>
          <cbc:Name>${escapeXml(wh.withholding_name)}</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:WithholdingTaxTotal>`
    )
    .join("")

  const linesXml = ctx.items
    .map((line) => {
      const lineTaxes = line.taxes
        .map(
          (t) => `
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${formatDianAmount(t.tax_amount)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${currency}">${formatDianAmount(t.taxable_amount)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${currency}">${formatDianAmount(t.tax_amount)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>${formatDianAmount(t.rate)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>${escapeXml(t.tax_code)}</cbc:ID>
            <cbc:Name>${escapeXml(t.tax_name)}</cbc:Name>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>`
        )
        .join("")

      return `
  <cac:${meta.line_tag}>
    <cbc:ID>${line.line_number}</cbc:ID>
    <cbc:${meta.quantity_tag} unitCode="${escapeXml(line.unit_code)}">${line.quantity.toFixed(2)}</cbc:${meta.quantity_tag}>
    <cbc:LineExtensionAmount currencyID="${currency}">${formatDianAmount(line.line_extension_amount)}</cbc:LineExtensionAmount>${lineTaxes}
    <cac:Item>
      <cbc:Description>${escapeXml(line.title)}</cbc:Description>
      <cac:StandardItemIdentification>
        <cbc:ID schemeID="${escapeXml(line.standard_code_id)}">${escapeXml(line.standard_item_id)}</cbc:ID>
      </cac:StandardItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${formatDianAmount(line.unit_price)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="${escapeXml(line.unit_code)}">1.00</cbc:BaseQuantity>
    </cac:Price>
  </cac:${meta.line_tag}>`
    })
    .join("")

  const typeCodeElement =
    meta.root_tag === "Invoice"
      ? `<cbc:InvoiceTypeCode>${escapeXml(ctx.document_type)}</cbc:InvoiceTypeCode>`
      : meta.root_tag === "CreditNote"
        ? `<cbc:CreditNoteTypeCode>${escapeXml(ctx.document_type)}</cbc:CreditNoteTypeCode>`
        : ""

  const monetaryTag =
    meta.root_tag === "DebitNote"
      ? "RequestedMonetaryTotal"
      : "LegalMonetaryTotal"

  const buyerCompanyIdAttrs = ctx.buyer.dv
    ? `schemeAgencyID="195" schemeID="${escapeXml(ctx.buyer.dv)}" schemeName="${escapeXml(ctx.buyer.identification_type)}"`
    : `schemeAgencyID="195" schemeName="${escapeXml(ctx.buyer.identification_type)}"`

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<${meta.root_tag}
  xmlns="${meta.root_xmlns}"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
  xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceControl>
            <sts:InvoiceAuthorization>${escapeXml(ctx.resolution.resolution_number)}</sts:InvoiceAuthorization>
            <sts:AuthorizationPeriod>
              <cbc:StartDate>${escapeXml(ctx.resolution.valid_from)}</cbc:StartDate>
              <cbc:EndDate>${escapeXml(ctx.resolution.valid_to)}</cbc:EndDate>
            </sts:AuthorizationPeriod>
            <sts:AuthorizedInvoices>
              <sts:Prefix>${escapeXml(ctx.resolution.prefix)}</sts:Prefix>
              <sts:From>${ctx.resolution.from_number}</sts:From>
              <sts:To>${ctx.resolution.to_number}</sts:To>
            </sts:AuthorizedInvoices>
          </sts:InvoiceControl>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1">CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195" schemeID="${escapeXml(ctx.seller.dv)}" schemeName="31">${escapeXml(ctx.seller.nit)}</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195">${escapeXml(ctx.seller.software_id)}</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195">${escapeXml(ctx.software_security_code)}</sts:SoftwareSecurityCode>
          <sts:AuthorizationProvider>
            <sts:AuthorizationProviderID schemeAgencyID="195" schemeID="4" schemeName="31">800197268</sts:AuthorizationProviderID>
          </sts:AuthorizationProvider>
          <sts:QRCode>${escapeXml(ctx.qr_url)}</sts:QRCode>${posBenefitsBlock}
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent id="dian-signature-placeholder" />
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>${escapeXml(meta.customization_id)}</cbc:CustomizationID>
  <cbc:ProfileID>${escapeXml(meta.profile_id)}</cbc:ProfileID>
  <cbc:ProfileExecutionID>${escapeXml(ctx.environment)}</cbc:ProfileExecutionID>
  <cbc:ID>${escapeXml(ctx.document_number)}</cbc:ID>
  <cbc:UUID schemeID="${escapeXml(ctx.environment)}" schemeName="${escapeXml(ctx.cufe_cude_algorithm)}">${escapeXml(ctx.cufe_cude)}</cbc:UUID>
  <cbc:IssueDate>${escapeXml(ctx.issue_date)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(ctx.issue_time)}</cbc:IssueTime>
  ${typeCodeElement}
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${ctx.items.length}</cbc:LineCountNumeric>${discrepancyResponseXml}${billingReferenceXml}
  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>${escapeXml(ctx.seller.organization_type)}</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(ctx.seller.trade_name)}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>${escapeXml(ctx.seller.municipality_code)}</cbc:ID>
          <cbc:CityName>${escapeXml(ctx.seller.municipality_name)}</cbc:CityName>
          <cbc:PostalZone>${escapeXml(ctx.seller.postal_code)}</cbc:PostalZone>
          <cbc:CountrySubentity>${escapeXml(ctx.seller.department_name)}</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>${escapeXml(ctx.seller.department_code)}</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>${escapeXml(ctx.seller.address_line)}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>${escapeXml(ctx.seller.country_code)}</cbc:IdentificationCode>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(ctx.seller.registration_name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${escapeXml(ctx.seller.dv)}" schemeName="31">${escapeXml(ctx.seller.nit)}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="${escapeXml(ctx.seller.tax_regime)}">${responsibilitiesJoined}</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>${escapeXml(ctx.seller.tributo_id)}</cbc:ID>
          <cbc:Name>${ctx.seller.tributo_id === "01" ? "IVA" : "No aplica"}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(ctx.seller.registration_name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${escapeXml(ctx.seller.dv)}" schemeName="31">${escapeXml(ctx.seller.nit)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(ctx.seller.phone)}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(ctx.seller.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>${escapeXml(ctx.buyer.organization_type)}</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(ctx.buyer.registration_name)}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>${escapeXml(ctx.buyer.municipality_code)}</cbc:ID>
          <cbc:CityName>${escapeXml(ctx.buyer.municipality_name)}</cbc:CityName>
          <cbc:PostalZone>${escapeXml(ctx.buyer.postal_code || "110111")}</cbc:PostalZone>
          <cbc:CountrySubentity>${escapeXml(ctx.buyer.department_name)}</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>${escapeXml(ctx.buyer.department_code)}</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>${escapeXml(ctx.buyer.address_line)}</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>${escapeXml(ctx.buyer.country_code)}</cbc:IdentificationCode>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${escapeXml(ctx.buyer.registration_name)}</cbc:RegistrationName>
        <cbc:CompanyID ${buyerCompanyIdAttrs}>${escapeXml(ctx.buyer.identification_number)}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="${escapeXml(ctx.buyer.tax_regime)}">${buyerResponsibilitiesJoined}</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>${escapeXml(ctx.buyer.tributo_id)}</cbc:ID>
          <cbc:Name>${ctx.buyer.tributo_id === "01" ? "IVA" : "No aplica"}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(ctx.buyer.registration_name)}</cbc:RegistrationName>
        <cbc:CompanyID ${buyerCompanyIdAttrs}>${escapeXml(ctx.buyer.identification_number)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(ctx.buyer.phone)}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(ctx.buyer.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:ID>${escapeXml(ctx.payment_form)}</cbc:ID>
    <cbc:PaymentMeansCode>${escapeXml(ctx.payment_means)}</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${escapeXml(ctx.payment_due_date || ctx.issue_date)}</cbc:PaymentDueDate>
  </cac:PaymentMeans>${taxTotalsXml}${withholdingTotalsXml}
  <cac:${monetaryTag}>
    <cbc:LineExtensionAmount currencyID="${currency}">${formatDianAmount(ctx.line_extension_amount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${formatDianAmount(ctx.tax_exclusive_amount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${formatDianAmount(ctx.tax_inclusive_amount)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${currency}">${formatDianAmount(ctx.allowance_total_amount)}</cbc:AllowanceTotalAmount>
    <cbc:ChargeTotalAmount currencyID="${currency}">${formatDianAmount(ctx.charge_total_amount)}</cbc:ChargeTotalAmount>
    <cbc:PayableAmount currencyID="${currency}">${formatDianAmount(ctx.payable_amount)}</cbc:PayableAmount>
  </cac:${monetaryTag}>${linesXml}
</${meta.root_tag}>`
}

/**
 * Generates the official DIAN UBL 2.1 `AttachedDocument` container XML wrapping both
 * the signed UBL document and the DIAN `ApplicationResponse` XML.
 */
export function buildDianAttachedDocumentXml(params: {
  ctx: DianDocumentBuildContext
  signed_xml: string
  application_response_xml: string
}): string {
  const { ctx, signed_xml, application_response_xml } = params

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<AttachedDocument
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>Documentos adjuntos</cbc:CustomizationID>
  <cbc:ProfileID>Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ProfileExecutionID>${escapeXml(ctx.environment)}</cbc:ProfileExecutionID>
  <cbc:ID>${escapeXml(ctx.document_number)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(ctx.issue_date)}</cbc:IssueDate>
  <cbc:IssueTime>${escapeXml(ctx.issue_time)}</cbc:IssueTime>
  <cbc:DocumentType>Contenedor de Factura Electrónica</cbc:DocumentType>
  <cbc:ParentDocumentID>${escapeXml(ctx.document_number)}</cbc:ParentDocumentID>
  <cac:SenderParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>${escapeXml(ctx.seller.registration_name)}</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195" schemeID="${escapeXml(ctx.seller.dv)}" schemeName="31">${escapeXml(ctx.seller.nit)}</cbc:CompanyID>
      <cac:TaxScheme>
        <cbc:ID>${escapeXml(ctx.seller.tributo_id)}</cbc:ID>
        <cbc:Name>${ctx.seller.tributo_id === "01" ? "IVA" : "No aplica"}</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:SenderParty>
  <cac:ReceiverParty>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>${escapeXml(ctx.buyer.registration_name)}</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195" schemeName="${escapeXml(ctx.buyer.identification_type)}">${escapeXml(ctx.buyer.identification_number)}</cbc:CompanyID>
      <cac:TaxScheme>
        <cbc:ID>${escapeXml(ctx.buyer.tributo_id)}</cbc:ID>
        <cbc:Name>${ctx.buyer.tributo_id === "01" ? "IVA" : "No aplica"}</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:ReceiverParty>
  <cac:Attachment>
    <cac:ExternalReference>
      <cbc:MimeCode>text/xml</cbc:MimeCode>
      <cbc:EncodingCode>UTF-8</cbc:EncodingCode>
      <cbc:Description><![CDATA[${signed_xml}]]></cbc:Description>
    </cac:ExternalReference>
  </cac:Attachment>
  <cac:ParentDocumentLineReference>
    <cbc:LineID>1</cbc:LineID>
    <cac:DocumentReference>
      <cbc:ID>${escapeXml(ctx.document_number)}</cbc:ID>
      <cbc:UUID schemeName="${escapeXml(ctx.cufe_cude_algorithm)}">${escapeXml(ctx.cufe_cude)}</cbc:UUID>
      <cbc:IssueDate>${escapeXml(ctx.issue_date)}</cbc:IssueDate>
      <cbc:DocumentType>ApplicationResponse</cbc:DocumentType>
      <cac:Attachment>
        <cac:ExternalReference>
          <cbc:MimeCode>text/xml</cbc:MimeCode>
          <cbc:EncodingCode>UTF-8</cbc:EncodingCode>
          <cbc:Description><![CDATA[${application_response_xml}]]></cbc:Description>
        </cac:ExternalReference>
      </cac:Attachment>
      <cac:ResultOfVerification>
        <cbc:ValidatorID>Unidad Especial Dirección de Impuestos y Aduanas Nacionales</cbc:ValidatorID>
        <cbc:ValidationResultCode>02</cbc:ValidationResultCode>
        <cbc:ValidationDate>${escapeXml(ctx.issue_date)}</cbc:ValidationDate>
        <cbc:ValidationTime>${escapeXml(ctx.issue_time)}</cbc:ValidationTime>
      </cac:ResultOfVerification>
    </cac:DocumentReference>
  </cac:ParentDocumentLineReference>
</AttachedDocument>`
}

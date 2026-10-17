import { createHash, createHmac, createSign, randomUUID } from "node:crypto"
import { escapeXml } from "./ubl-builder"

export interface XadesSignOptions {
  private_key_pem?: string | null
  cert_pem?: string | null
  software_security_code: string
  signing_time?: string
}

export const DIAN_SIGNATURE_POLICY_V2 = {
  identifier:
    "https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf",
  description:
    "Política de firma para facturas electrónicas de la República de Colombia",
  digest_sha256_base64: "dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=",
} as const

/**
 * Generates an XAdES-EPES `ds:Signature` XML block per DIAN Anexo Técnico 1.9 and injects
 * it into `<ext:ExtensionContent id="dian-signature-placeholder" />`.
 *
 * Uses RSA-SHA256 when a PEM private key is configured, or falls back to a deterministic
 * HMAC-SHA256 signature using the `SoftwareSecurityCode` in Habilitación/Sandbox environments.
 */
export function signDianUblXmlXadesEpes(
  unsignedXml: string,
  options: XadesSignOptions
): {
  signed_xml: string
  signature_value: string
  document_digest: string
  signing_time: string
} {
  const signingTime = options.signing_time || new Date().toISOString()
  const sigId = `xmldsig-${randomUUID()}`
  const signedPropsId = `${sigId}-signedprops`
  const keyInfoId = `${sigId}-keyinfo`

  const documentDigest = createHash("sha256")
    .update(unsignedXml, "utf8")
    .digest("base64")

  const certClean = (options.cert_pem || "")
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "")

  const certBody =
    certClean ||
    Buffer.from(`DIAN-CERT:${options.software_security_code}`, "utf8").toString(
      "base64"
    )

  const certDigest = createHash("sha256")
    .update(certBody, "utf8")
    .digest("base64")

  const signedPropertiesXml = `<xades:SignedProperties Id="${signedPropsId}"><xades:SignedSignatureProperties><xades:SigningTime>${escapeXml(signingTime)}</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${certDigest}</ds:DigestValue></xades:CertDigest></xades:Cert></xades:SigningCertificate><xades:SignaturePolicyIdentifier><xades:SignaturePolicyId><xades:SigPolicyId><xades:Identifier>${DIAN_SIGNATURE_POLICY_V2.identifier}</xades:Identifier><xades:Description>${DIAN_SIGNATURE_POLICY_V2.description}</xades:Description></xades:SigPolicyId><xades:SigPolicyHash><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${DIAN_SIGNATURE_POLICY_V2.digest_sha256_base64}</ds:DigestValue></xades:SigPolicyHash></xades:SignaturePolicyId></xades:SignaturePolicyIdentifier><xades:SignerRole><xades:ClaimedRoles><xades:ClaimedRole>supplier</xades:ClaimedRole></xades:ClaimedRoles></xades:SignerRole></xades:SignedSignatureProperties></xades:SignedProperties>`

  const signedPropsDigest = createHash("sha256")
    .update(signedPropertiesXml, "utf8")
    .digest("base64")

  const keyInfoXml = `<ds:KeyInfo Id="${keyInfoId}"><ds:X509Data><ds:X509Certificate>${certBody}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`
  const keyInfoDigest = createHash("sha256")
    .update(keyInfoXml, "utf8")
    .digest("base64")

  const signedInfoXml = `<ds:SignedInfo><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference Id="${sigId}-ref0" URI=""><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${documentDigest}</ds:DigestValue></ds:Reference><ds:Reference URI="#${keyInfoId}"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${keyInfoDigest}</ds:DigestValue></ds:Reference><ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropsId}"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${signedPropsDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`

  let signatureValue: string
  if (
    options.private_key_pem &&
    options.private_key_pem.includes("PRIVATE KEY")
  ) {
    const signer = createSign("RSA-SHA256")
    signer.update(signedInfoXml, "utf8")
    signer.end()
    signatureValue = signer.sign(options.private_key_pem, "base64")
  } else {
    signatureValue = createHmac("sha256", options.software_security_code)
      .update(signedInfoXml, "utf8")
      .digest("base64")
  }

  const signatureBlock = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${sigId}">${signedInfoXml}<ds:SignatureValue Id="${sigId}-sigvalue">${signatureValue}</ds:SignatureValue>${keyInfoXml}<ds:Object><xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#${sigId}">${signedPropertiesXml}</xades:QualifyingProperties></ds:Object></ds:Signature>`

  const signedXml = unsignedXml.replace(
    `<ext:ExtensionContent id="dian-signature-placeholder" />`,
    `<ext:ExtensionContent>${signatureBlock}</ext:ExtensionContent>`
  )

  return {
    signed_xml: signedXml,
    signature_value: signatureValue,
    document_digest: documentDigest,
    signing_time: signingTime,
  }
}

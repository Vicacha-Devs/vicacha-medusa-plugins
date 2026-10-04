import { extractSessionId } from "../api/admin/utils/session-helpers"
import { BoldCheckoutData, BoldCheckoutResult, BoldMutationHookOptions } from "../types"
import { useCreateBoldButton } from "./use-create-bold-button"
import { useCreateBoldLink } from "./use-create-bold-link"
import { useCreateBoldQr } from "./use-create-bold-qr"
import { usePushToBoldTerminal } from "./use-create-bold-terminal"

export const useBoldCheckoutHandler = (options?: BoldMutationHookOptions) => {
  const createLink = useCreateBoldLink(options)
  const createButton = useCreateBoldButton(options)
  const createQr = useCreateBoldQr(options)
  const pushTerminal = usePushToBoldTerminal(options)

  const handleCheckout = async (
    data: BoldCheckoutData
  ): Promise<BoldCheckoutResult> => {
    const { details, client, currencyCode, paymentMode } = data
    const email =
      client.email || `${(client.phone || "").replace(/\D/g, "")}@noemail.local`

    // Mode: Link
    if (details.boldMode === "link") {
      const timestamp = Date.now()
      const rawName = `${client.first_name || ""}_${client.last_name || ""}`
      const cleanSlug =
        rawName.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 20) || "GUEST"

      const reference = `TRV_${cleanSlug}_${timestamp}`.slice(0, 60)
      const isInstallment = paymentMode === "installments"
      const fullName = `${client.first_name || ""} ${client.last_name || ""}`.trim()
      const rawDescription = isInstallment
        ? `Travel deposit payment - ${fullName || email}`
        : `Full travel package payment - ${fullName || email}`

      const response = await createLink.mutateAsync({
        amount: details.amount,
        currency: currencyCode,
        reference,
        description: rawDescription.trim().slice(0, 100),
        email,
        vatAmount: details.vatAmount || 0,
        consumptionTaxAmount: details.consumptionTaxAmount || 0,
        callbackUrl: details.callbackUrl,
        ...(details.expirationMinutes
          ? { expirationMinutes: details.expirationMinutes }
          : {}),
        ...(details.imageUrl ? { imageUrl: details.imageUrl } : {}),
        ...(details.paymentCollectionId
          ? { paymentCollectionId: details.paymentCollectionId }
          : {}),
      })

      const session = response.paymentSession
      return {
        type: "link",
        url: session?.data?.url || session?.data?.payment_url,
        sessionId: extractSessionId(session),
      }
    }

    // Mode: Button
    if (details.boldMode === "button") {
      const timestamp = Date.now()
      const rawName = `${client.first_name || ""}_${client.last_name || ""}`
      const cleanSlug =
        rawName.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 20) || "GUEST"

      const reference = `BTN_${cleanSlug}_${timestamp}`.slice(0, 60)

      const response = await createButton.mutateAsync({
        amount: details.amount,
        currency: currencyCode,
        reference,
        description: `Payment for ${client.first_name || email}`.slice(0, 100),
        email,
        taxAmount: details.vatAmount || 0,
        ...(details.paymentCollectionId
          ? { paymentCollectionId: details.paymentCollectionId }
          : {}),
      })

      const session = response.paymentSession
      return {
        type: "button",
        hash: session?.data?.hash,
        sessionId: extractSessionId(session),
      }
    }

    // Mode: QR
    if (details.boldMode === "qr") {
      const res = await createQr.mutateAsync({
        amount: details.amount,
        currency_code: currencyCode,
        ...(details.paymentCollectionId
          ? { paymentCollectionId: details.paymentCollectionId }
          : {}),
      })

      const session = res.paymentSession

      return {
        type: "qr",
        qrPayload: res.qr_payload,
        sessionId: extractSessionId(session) || "",
      }
    }

    // Mode: Terminal
    if (details.boldMode === "terminal") {
      if (!details.terminalModel || !details.terminalSerial) {
        throw new Error("Missing terminalModel or terminalSerial for POS payment mode")
      }

      const timestamp = Date.now()
      const rawName = `${client.first_name || ""}_${client.last_name || ""}`
      const cleanSlug =
        rawName.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 20) || "GUEST"

      const reference = `POS_${cleanSlug}_${timestamp}`.slice(0, 60)

      const res = await pushTerminal.mutateAsync({
        amount: details.amount,
        currency: currencyCode,
        reference,
        userEmail: email,
        terminalModel: details.terminalModel,
        terminalSerial: details.terminalSerial,
        ...(details.paymentCollectionId
          ? { paymentCollectionId: details.paymentCollectionId }
          : {}),
      })

      const session = res.paymentSession

      return {
        type: "terminal",
        sessionId: extractSessionId(session) || "",
      }
    }

    // Explicit fallback to satisfy TypeScript's return path check
    throw new Error(`Unsupported bold payment mode: ${(details as any)?.boldMode}`)
  }

  return {
    handleCheckout,
    isPending:
      createLink.isPending ||
      createButton.isPending ||
      createQr.isPending ||
      pushTerminal.isPending,
  }
}
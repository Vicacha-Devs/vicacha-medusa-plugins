import { useCallback, useEffect, useState } from "react"
import { toast } from "@medusajs/ui"

import { documentsAdminSdk } from "../sdk/client"
import { documentsQueryKeys } from "../sdk/query-keys"
import type {
  DocumentRecord,
  DocumentType,
  SupportedLocale,
  UseOrderDocumentsWidgetStateProps,
} from "../types"
import { useOrderDocuments } from "./use-documents-query"
import { useDocumentSettings } from "./use-document-settings"
import {
  useGenerateDocument,
  useRegenerateDocument,
  useSendDocumentEmail,
  useSendDocumentForSignature,
} from "./use-document-mutations"

export function useOrderDocumentsWidgetState({
  orderId,
  orderEmail = "",
  orderRegionId = null,
  client = documentsAdminSdk,
  t = (key: string) => key,
}: UseOrderDocumentsWidgetStateProps) {
  const [actionDocId, setActionDocId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<DocumentType>("invoice")
  const [selectedLocale, setSelectedLocale] = useState<string>("en")
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)
  const [customEmail, setCustomEmail] = useState<string>(orderEmail || "")

  const orderQueryKey = documentsQueryKeys.order(orderId)

  const {
    data: docsData,
    isLoading: docsLoading,
    refetch: fetchDocuments,
  } = useOrderDocuments(orderId, {
    client,
    queryKey: orderQueryKey,
  })

  const { data: settingsData, isLoading: settingsLoading } =
    useDocumentSettings(orderRegionId, {
      client,
      enabled: Boolean(orderId),
    })

  useEffect(() => {
    if (settingsData?.settings?.default_locale) {
      setSelectedLocale(settingsData.settings.default_locale)
    }
  }, [settingsData?.settings?.default_locale])

  const documents: DocumentRecord[] = docsData?.documents || []
  const docusealConfigured = Boolean(
    settingsData?.integrations?.docuseal_configured
  )
  const loading = docsLoading || settingsLoading

  const generateMutation = useGenerateDocument({
    client,
    queryKey: orderQueryKey,
  })
  const regenerateMutation = useRegenerateDocument({
    client,
    queryKey: orderQueryKey,
  })
  const sendEmailMutation = useSendDocumentEmail({
    client,
    queryKey: orderQueryKey,
  })
  const sendSignatureMutation = useSendDocumentForSignature({
    client,
    queryKey: orderQueryKey,
  })

  const getDocTypeLabel = useCallback(
    (type: DocumentType | string) =>
      t(`types.${type}`, { defaultValue: type }),
    [t]
  )

  const handleGenerate = useCallback(async () => {
    if (!orderId) return
    try {
      const json = await generateMutation.mutateAsync({
        order_id: orderId,
        document_type: selectedType,
        locale: selectedLocale as SupportedLocale,
      })
      const typeLabel = getDocTypeLabel(selectedType)
      toast.success(
        json.was_created
          ? t("widget.messages.generatedSuccess", {
              type: typeLabel,
              number: json.document.document_number,
            })
          : t("widget.messages.alreadyUpToDate", {
              type: typeLabel,
              number: json.document.document_number,
            })
      )
    } catch (err: any) {
      toast.error(err.message || t("widget.messages.generateError"))
    }
  }, [orderId, selectedType, selectedLocale, generateMutation, getDocTypeLabel, t])

  const handleRegenerate = useCallback(
    async (docId: string, isRetry = false) => {
      setActionDocId(docId)
      try {
        const json = await regenerateMutation.mutateAsync({
          id: docId,
          payload: { locale: selectedLocale },
        })
        toast.success(
          isRetry
            ? t("widget.messages.retriedSuccess", {
                number: json.document.document_number,
              })
            : t("widget.messages.revisionSuccess", {
                version: json.document.version,
                number: json.document.document_number,
              })
        )
      } catch (err: any) {
        toast.error(err.message || t("widget.messages.regenerateError"))
      } finally {
        setActionDocId(null)
      }
    },
    [regenerateMutation, selectedLocale, t]
  )

  const handleSendEmail = useCallback(
    async (docId: string) => {
      setActionDocId(docId)
      try {
        const json = await sendEmailMutation.mutateAsync({
          id: docId,
          payload: {
            recipient_email: customEmail?.trim() || undefined,
          },
        })
        toast.success(
          t("widget.messages.emailSentSuccess", { recipient: json.recipient })
        )
      } catch (err: any) {
        toast.error(err.message || t("widget.messages.emailError"))
      } finally {
        setActionDocId(null)
      }
    },
    [sendEmailMutation, customEmail, t]
  )

  const handleSendForSignature = useCallback(
    async (docId: string) => {
      setActionDocId(docId)
      try {
        const json = await sendSignatureMutation.mutateAsync({
          id: docId,
          payload: {
            signer_email: customEmail?.trim() || orderEmail || undefined,
          },
        })
        toast.success(
          t("widget.messages.signatureSentSuccess", {
            email: json.signature_request.signer_email,
          })
        )
      } catch (err: any) {
        toast.error(err.message || t("widget.messages.signatureError"))
      } finally {
        setActionDocId(null)
      }
    },
    [sendSignatureMutation, customEmail, orderEmail, t]
  )

  const getDocumentPdfUrl = useCallback(
    (docId: string, options?: { signed?: boolean }) =>
      client.getDocumentPdfUrl(docId, options),
    [client]
  )

  return {
    documents,
    loading,
    generating: generateMutation.isPending,
    actionDocId,
    selectedType,
    setSelectedType,
    selectedLocale,
    setSelectedLocale,
    docusealConfigured,
    expandedAuditId,
    setExpandedAuditId,
    customEmail,
    setCustomEmail,
    getDocTypeLabel,
    fetchDocuments,
    handleGenerate,
    handleRegenerate,
    handleSendEmail,
    handleSendForSignature,
    getDocumentPdfUrl,
  }
}

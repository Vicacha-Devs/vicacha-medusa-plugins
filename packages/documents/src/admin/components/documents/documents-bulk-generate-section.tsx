import React, { useState } from "react"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useBulkGenerateDocuments } from "../../../hooks"
import type { DocumentType } from "../../../modules/documents/types"

interface DocumentsBulkGenerateSectionProps {
  onSuccess?: () => void
}

export const DocumentsBulkGenerateSection: React.FC<
  DocumentsBulkGenerateSectionProps
> = ({ onSuccess }) => {
  const { t } = useTranslation()
  const [bulkOrderIdsInput, setBulkOrderIdsInput] = useState<string>("")
  const [bulkType, setBulkType] = useState<DocumentType>("invoice")

  const bulkGenerateMutation = useBulkGenerateDocuments()
  const bulkRunning = bulkGenerateMutation.isPending

  const handleBulkGenerate = async () => {
    const orderIds = bulkOrderIdsInput
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (orderIds.length === 0) {
      toast.error(t("hub.messages.enterOrderId"))
      return
    }

    try {
      const json = await bulkGenerateMutation.mutateAsync({
        order_ids: orderIds,
        document_type: bulkType,
      })
      toast.success(
        t("hub.messages.bulkSuccess", {
          generated: json.generated ?? json.generated_count ?? 0,
          skipped: json.skipped ?? 0,
          failed: json.failed ?? json.failed_count ?? 0,
        })
      )
      setBulkOrderIdsInput("")
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || t("hub.messages.bulkError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("hub.bulkTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("hub.bulkSubtitle")}
        </Text>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
        <div className="flex-1">
          <Input
            size="small"
            placeholder={t("hub.bulkPlaceholder")}
            value={bulkOrderIdsInput}
            onChange={(e) => setBulkOrderIdsInput(e.target.value)}
          />
        </div>
        <Select
          size="small"
          value={bulkType}
          onValueChange={(v) => setBulkType(v as DocumentType)}
        >
          <Select.Trigger>
            <Select.Value placeholder={t("hub.typePlaceholder")} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="invoice">{t("types.invoice")}</Select.Item>
            <Select.Item value="packing_slip">
              {t("types.packing_slip")}
            </Select.Item>
            <Select.Item value="credit_note">
              {t("types.credit_note")}
            </Select.Item>
            <Select.Item value="receipt">{t("types.receipt")}</Select.Item>
          </Select.Content>
        </Select>
        <Button
          size="small"
          variant="primary"
          isLoading={bulkRunning}
          onClick={() => void handleBulkGenerate()}
        >
          {t("hub.bulkRunButton")}
        </Button>
      </div>
    </Container>
  )
}

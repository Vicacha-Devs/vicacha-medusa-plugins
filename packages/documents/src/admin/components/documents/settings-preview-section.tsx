import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { DocumentType } from "../../../modules/documents/types"
import { documentsAdminSdk } from "../../../sdk"

interface SettingsPreviewSectionProps {
  defaultLocale: string
  selectedRegionId: string
}

export const SettingsPreviewSection: React.FC<SettingsPreviewSectionProps> = ({
  defaultLocale,
  selectedRegionId,
}) => {
  const { t } = useTranslation()
  const [previewDocType, setPreviewDocType] = useState<DocumentType>("invoice")
  const [previewOrderId, setPreviewOrderId] = useState<string>("")
  const [previewStressTest, setPreviewStressTest] = useState<boolean>(false)

  const previewUrl = documentsAdminSdk.getPreviewPdfUrl({
    document_type: previewDocType,
    locale: defaultLocale || "en",
    items: previewStressTest ? "75" : "4",
    region_id: selectedRegionId !== "global" ? selectedRegionId : undefined,
    order_id: previewOrderId.trim() || undefined,
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h2">{t("settings.previewSectionTitle")}</Heading>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("settings.previewSubtitle")}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="small"
            value={previewDocType}
            onValueChange={(v) => setPreviewDocType(v as DocumentType)}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="invoice">
                {t("settings.previewTypePrefix", {
                  type: t("types.invoice"),
                })}
              </Select.Item>
              <Select.Item value="packing_slip">
                {t("settings.previewTypePrefix", {
                  type: t("types.packing_slip"),
                })}
              </Select.Item>
              <Select.Item value="credit_note">
                {t("settings.previewTypePrefix", {
                  type: t("types.credit_note"),
                })}
              </Select.Item>
              <Select.Item value="receipt">
                {t("settings.previewTypePrefix", {
                  type: t("types.receipt"),
                })}
              </Select.Item>
            </Select.Content>
          </Select>

          <Input
            size="small"
            placeholder={t("settings.previewOrderPlaceholder")}
            value={previewOrderId}
            onChange={(e) => setPreviewOrderId(e.target.value)}
          />

          <Button
            size="small"
            type="button"
            variant="secondary"
            onClick={() => setPreviewStressTest((v) => !v)}
          >
            {previewStressTest
              ? t("settings.standardItemsButton")
              : t("settings.stressTestItemsButton")}
          </Button>

          <Button
            size="small"
            type="button"
            variant="secondary"
            onClick={() => window.open(previewUrl, "_blank")}
          >
            {t("settings.openFullPdf")}
          </Button>
        </div>
      </div>

      <div className="p-6">
        <iframe
          title={t("settings.previewSectionTitle")}
          src={previewUrl}
          className="h-[560px] w-full rounded border border-ui-border-base bg-ui-bg-subtle"
        />
      </div>
    </Container>
  )
}

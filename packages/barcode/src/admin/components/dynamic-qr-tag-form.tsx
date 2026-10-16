import { Button, Container, Heading, Input, Select } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type {
  BarcodeScanAction,
  BarcodeSymbology,
} from "../../modules/barcode/types"
import type { TagFormState } from "../hooks/use-barcode-studio"

export interface DynamicQrTagCreateSectionProps {
  form: TagFormState
  onFormChange: React.Dispatch<React.SetStateAction<TagFormState>>
  onCreateTag: () => void
}

export const DynamicQrTagCreateSection = ({
  form,
  onFormChange,
  onCreateTag,
}: DynamicQrTagCreateSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("tagsTab.createTitle")}</Heading>
      </div>
      <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-2">
        <Input
          value={form.target_id}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, target_id: e.target.value }))
          }
          placeholder={t("tagsTab.targetIdPlaceholder")}
        />
        <Input
          value={form.label}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, label: e.target.value }))
          }
          placeholder={t("tagsTab.labelPlaceholder")}
        />
        <Select
          value={form.symbology}
          onValueChange={(val) =>
            onFormChange((prev) => ({
              ...prev,
              symbology: val as BarcodeSymbology,
            }))
          }
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="qr">{t("tagsTab.symbologyQr")}</Select.Item>
            <Select.Item value="datamatrix">
              {t("tagsTab.symbologyDatamatrix")}
            </Select.Item>
            <Select.Item value="ean13">
              {t("tagsTab.symbologyEan13")}
            </Select.Item>
            <Select.Item value="upca">{t("tagsTab.symbologyUpca")}</Select.Item>
            <Select.Item value="code128">
              {t("tagsTab.symbologyCode128")}
            </Select.Item>
            <Select.Item value="code39">
              {t("tagsTab.symbologyCode39")}
            </Select.Item>
          </Select.Content>
        </Select>
        <Select
          value={form.scan_action}
          onValueChange={(val) =>
            onFormChange((prev) => ({
              ...prev,
              scan_action: val as BarcodeScanAction,
            }))
          }
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="view">{t("tagsTab.actionView")}</Select.Item>
            <Select.Item value="add_to_cart">
              {t("tagsTab.actionAddToCart")}
            </Select.Item>
            <Select.Item value="verify">
              {t("tagsTab.actionVerify")}
            </Select.Item>
            <Select.Item value="gs1_digital_link">
              {t("tagsTab.actionDigitalLink")}
            </Select.Item>
          </Select.Content>
        </Select>
        <Input
          value={form.gs1_gtin}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, gs1_gtin: e.target.value }))
          }
          placeholder={t("tagsTab.gs1GtinPlaceholder")}
        />
        <Input
          value={form.batch_lot}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, batch_lot: e.target.value }))
          }
          placeholder={t("tagsTab.batchLotPlaceholder")}
        />
        <Input
          value={form.serial_number}
          onChange={(e) =>
            onFormChange((prev) => ({
              ...prev,
              serial_number: e.target.value,
            }))
          }
          placeholder={t("tagsTab.serialNumberPlaceholder")}
        />
      </div>
      <div className="px-6 py-4">
        <Button variant="primary" size="small" onClick={onCreateTag}>
          {t("tagsTab.generateButton")}
        </Button>
      </div>
    </Container>
  )
}

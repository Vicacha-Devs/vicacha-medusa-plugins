import { Button, Container, Heading, Input, Select } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type {
  LabelPrintOutput,
  LabelTemplateSpec,
} from "../../modules/barcode/types"
import type { PrintFormState } from "../hooks/use-barcode-studio"
import { LabelPrintOutputSection } from "./label-output-section"

export interface LabelPrintCenterTabProps {
  form: PrintFormState
  onFormChange: React.Dispatch<React.SetStateAction<PrintFormState>>
  templates: LabelTemplateSpec[]
  output: LabelPrintOutput | null
  onRenderLabels: () => void
}

export const LabelPrintDesignerSection = ({
  form,
  onFormChange,
  templates,
  onRenderLabels,
}: Pick<
  LabelPrintCenterTabProps,
  "form" | "onFormChange" | "templates" | "onRenderLabels"
>) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("printTab.designerTitle")}</Heading>
      </div>
      <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            value={form.template_id}
            onValueChange={(val) =>
              onFormChange((prev) => ({ ...prev, template_id: val }))
            }
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {templates.map((tpl) => (
                <Select.Item key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.width_mm}×{tpl.height_mm}mm)
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <Input
          value={form.title}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder={t("printTab.productTitlePlaceholder")}
        />
        <Input
          value={form.variant_title}
          onChange={(e) =>
            onFormChange((prev) => ({
              ...prev,
              variant_title: e.target.value,
            }))
          }
          placeholder={t("printTab.variantTitlePlaceholder")}
        />
        <Input
          value={form.barcode}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, barcode: e.target.value }))
          }
          placeholder={t("printTab.barcodePlaceholder")}
        />
        <Input
          value={form.sku}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, sku: e.target.value }))
          }
          placeholder={t("printTab.skuPlaceholder")}
        />
        <Input
          type="number"
          value={String(form.price)}
          onChange={(e) =>
            onFormChange((prev) => ({
              ...prev,
              price: Number(e.target.value || 0),
            }))
          }
          placeholder={t("printTab.salePricePlaceholder")}
        />
        <Input
          type="number"
          value={String(form.compare_at_price)}
          onChange={(e) =>
            onFormChange((prev) => ({
              ...prev,
              compare_at_price: Number(e.target.value || 0),
            }))
          }
          placeholder={t("printTab.compareAtPricePlaceholder")}
        />
        <Input
          value={form.currency_code}
          onChange={(e) =>
            onFormChange((prev) => ({
              ...prev,
              currency_code: e.target.value.toUpperCase(),
            }))
          }
          placeholder={t("printTab.currencyPlaceholder")}
        />
        <Input
          type="number"
          value={String(form.quantity)}
          onChange={(e) =>
            onFormChange((prev) => ({
              ...prev,
              quantity: Number(e.target.value || 1),
            }))
          }
          placeholder={t("printTab.quantityPlaceholder")}
        />
      </div>
      <div className="px-6 py-4">
        <Button variant="primary" size="small" onClick={onRenderLabels}>
          {t("printTab.renderButton")}
        </Button>
      </div>
    </Container>
  )
}

export const LabelPrintCenterTab = (props: LabelPrintCenterTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <LabelPrintDesignerSection
        form={props.form}
        onFormChange={props.onFormChange}
        templates={props.templates}
        onRenderLabels={props.onRenderLabels}
      />
      <LabelPrintOutputSection output={props.output} />
    </div>
  )
}

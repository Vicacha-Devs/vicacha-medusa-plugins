import {
  Container,
  Heading,
  StatusBadge,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { LabelPrintOutput } from "../../modules/barcode/types"

export interface LabelPrintOutputSectionProps {
  output: LabelPrintOutput | null
}

export const LabelPrintOutputSection = ({
  output,
}: LabelPrintOutputSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("printTab.outputTitle")}</Heading>
        {output ? (
          <StatusBadge color="green">
            {t("printTab.labelsReadyBadge", {
              count: output.total_labels,
              name: output.template.name,
            })}
          </StatusBadge>
        ) : null}
      </div>

      {output ? (
        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <Text size="xsmall" weight="plus" className="mb-1">
              {t("printTab.zplHeading")}
            </Text>
            <Textarea
              readOnly
              rows={7}
              value={output.zpl}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Text size="xsmall" weight="plus" className="mb-1">
              {t("printTab.htmlHeading")}
            </Text>
            <Textarea
              readOnly
              rows={5}
              value={output.html}
              className="font-mono text-xs"
            />
          </div>
        </div>
      ) : (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("printTab.emptyState")}
          </Text>
        </div>
      )}
    </Container>
  )
}

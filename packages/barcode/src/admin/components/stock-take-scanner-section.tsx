import { Button, Container, Heading, Input } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { CountSessionFormState } from "../hooks/use-barcode-studio"
import { StockTakeSessionsSection } from "./stock-take-sessions-section"

export interface WarehouseStockTakeTabProps {
  form: CountSessionFormState
  onFormChange: React.Dispatch<React.SetStateAction<CountSessionFormState>>
  sessions: Array<Record<string, unknown>>
  selectedSessionId: string | null
  onSelectSession: (id: string) => void
  onCreateSession: () => void
  onScanDelta: (delta: number) => void
  onApplySession: (id: string) => void
}

export const StockTakeControlsSection = ({
  form,
  onFormChange,
  onCreateSession,
  onScanDelta,
}: Pick<
  WarehouseStockTakeTabProps,
  "form" | "onFormChange" | "onCreateSession" | "onScanDelta"
>) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("stockTakeTab.createTitle")}</Heading>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            value={form.name}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder={t("stockTakeTab.sessionNamePlaceholder")}
          />
          <Input
            value={form.location_id}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, location_id: e.target.value }))
            }
            placeholder={t("stockTakeTab.locationIdPlaceholder")}
          />
        </div>
        <div>
          <Button variant="secondary" size="small" onClick={onCreateSession}>
            {t("stockTakeTab.startSessionButton")}
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <Heading level="h3">{t("stockTakeTab.scannerTitle")}</Heading>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            value={form.scan_barcode}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                scan_barcode: e.target.value,
              }))
            }
            placeholder={t("stockTakeTab.scannedBarcodePlaceholder")}
          />
          <Input
            value={form.scan_title}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                scan_title: e.target.value,
              }))
            }
            placeholder={t("stockTakeTab.itemTitlePlaceholder")}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            size="small"
            onClick={() => onScanDelta(1)}
          >
            {t("stockTakeTab.scanPlusOneButton")}
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => onScanDelta(-1)}
          >
            {t("stockTakeTab.adjustMinusOneButton")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const WarehouseStockTakeTab = (props: WarehouseStockTakeTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <StockTakeControlsSection
        form={props.form}
        onFormChange={props.onFormChange}
        onCreateSession={props.onCreateSession}
        onScanDelta={props.onScanDelta}
      />
      <StockTakeSessionsSection
        sessions={props.sessions}
        selectedSessionId={props.selectedSessionId}
        onSelectSession={props.onSelectSession}
        onApplySession={props.onApplySession}
      />
    </div>
  )
}

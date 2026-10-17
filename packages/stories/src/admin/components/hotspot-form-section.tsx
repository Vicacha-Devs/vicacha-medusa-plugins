import type React from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StorySlideDTO } from "../../modules/story/types"
import type { NewHotspotFormState } from "../hooks/use-stories-studio"

export interface CanvasHotspotPinnerSectionProps {
  selectedSlide: StorySlideDTO | null
  hotspotForm: NewHotspotFormState
  onHotspotFormChange: React.Dispatch<React.SetStateAction<NewHotspotFormState>>
  isSavingHotspot: boolean
  onAddHotspot: () => void
  onRemoveHotspot: (hotspotId: string) => void
}

export const CanvasHotspotPinnerSection = ({
  selectedSlide,
  hotspotForm,
  onHotspotFormChange,
  isSavingHotspot,
  onAddHotspot,
  onRemoveHotspot,
}: CanvasHotspotPinnerSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("canvasTab.pinHotspotTitle", {
            slide: selectedSlide
              ? `"${selectedSlide.title}"`
              : t("canvasTab.selectedSlideFallback"),
          })}
        </Heading>
        <Button
          size="small"
          variant="primary"
          isLoading={isSavingHotspot}
          onClick={onAddHotspot}
        >
          {t("canvasTab.pinButton")}
        </Button>
      </div>

      <SectionRow
        title={t("canvasTab.pinCrosshair", {
          x: hotspotForm.x_percent,
          y: hotspotForm.y_percent,
        })}
        value={t("canvasTab.coordinatesHelp", {
          x: hotspotForm.x_percent,
          y: hotspotForm.y_percent,
        })}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="hs-prod-id">{t("canvasTab.productIdField")}</Label>
          <Input
            id="hs-prod-id"
            placeholder={t("canvasTab.productIdPlaceholder")}
            value={hotspotForm.product_id}
            onChange={(e) =>
              onHotspotFormChange((prev) => ({
                ...prev,
                product_id: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="hs-prod-title">
            {t("canvasTab.productTitleField")}
          </Label>
          <Input
            id="hs-prod-title"
            placeholder={t("canvasTab.productTitlePlaceholder")}
            value={hotspotForm.product_title}
            onChange={(e) =>
              onHotspotFormChange((prev) => ({
                ...prev,
                product_title: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="hs-price">{t("canvasTab.priceBadgeField")}</Label>
          <Input
            id="hs-price"
            placeholder={t("canvasTab.priceBadgePlaceholder")}
            value={hotspotForm.price_formatted}
            onChange={(e) =>
              onHotspotFormChange((prev) => ({
                ...prev,
                price_formatted: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {Boolean(selectedSlide?.hotspots?.length) && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                {t("canvasTab.productTitleField")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("canvasTab.priceBadgeField")}
              </Table.HeaderCell>
              <Table.HeaderCell>X / Y</Table.HeaderCell>
              <Table.HeaderCell className="text-right" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(selectedSlide?.hotspots ?? []).map((hs) => (
              <Table.Row key={hs.id}>
                <Table.Cell className="font-medium">
                  {hs.product_title}
                </Table.Cell>
                <Table.Cell>{hs.price_formatted || "—"}</Table.Cell>
                <Table.Cell>
                  <Badge size="xsmall" color="blue">
                    {hs.x_percent}%, {hs.y_percent}%
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => onRemoveHotspot(hs.id)}
                  >
                    {t("canvasTab.removeHotspotButton")}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

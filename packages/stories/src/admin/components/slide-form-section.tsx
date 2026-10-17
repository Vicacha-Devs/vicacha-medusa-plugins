import type React from "react"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  StoryGroupDTO,
  StoryMediaType,
} from "../../modules/story/types"
import type { NewSlideFormState } from "../hooks/use-stories-studio"
import { CanvasTimelineSection } from "./slide-timeline-section"

export { CanvasTimelineSection }

export interface CanvasSlideBuilderSectionProps {
  groups: StoryGroupDTO[]
  slideForm: NewSlideFormState
  onSlideFormChange: React.Dispatch<React.SetStateAction<NewSlideFormState>>
  isSavingSlide: boolean
  onCreateSlide: () => void
}

export const CanvasSlideBuilderSection = ({
  groups,
  slideForm,
  onSlideFormChange,
  isSavingSlide,
  onCreateSlide,
}: CanvasSlideBuilderSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("canvasTab.publishSlideTitle")}</Heading>
        <Button
          size="small"
          variant="primary"
          isLoading={isSavingSlide}
          onClick={onCreateSlide}
        >
          {t("canvasTab.publishButton")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-4">
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="slide-title">{t("canvasTab.slideTitleField")}</Label>
          <Input
            id="slide-title"
            placeholder={t("canvasTab.slideTitlePlaceholder")}
            value={slideForm.title}
            onChange={(e) =>
              onSlideFormChange((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="slide-media-url">
            {t("canvasTab.mediaUrlField")}
          </Label>
          <Input
            id="slide-media-url"
            placeholder={t("canvasTab.mediaUrlPlaceholder")}
            value={slideForm.media_url}
            onChange={(e) =>
              onSlideFormChange((prev) => ({
                ...prev,
                media_url: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="slide-caption">{t("canvasTab.captionField")}</Label>
          <Input
            id="slide-caption"
            placeholder={t("canvasTab.captionPlaceholder")}
            value={slideForm.caption}
            onChange={(e) =>
              onSlideFormChange((prev) => ({
                ...prev,
                caption: e.target.value,
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="slide-cta">{t("canvasTab.ctaField")}</Label>
          <div className="flex gap-2">
            <Input
              id="slide-cta"
              placeholder={t("canvasTab.ctaUrlPlaceholder")}
              value={slideForm.link_url}
              onChange={(e) =>
                onSlideFormChange((prev) => ({
                  ...prev,
                  link_url: e.target.value,
                }))
              }
            />
            <Input
              placeholder={t("canvasTab.ctaTextPlaceholder")}
              value={slideForm.link_text}
              onChange={(e) =>
                onSlideFormChange((prev) => ({
                  ...prev,
                  link_text: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4 items-center">
        <div className="flex flex-col gap-y-1.5">
          <Label>
            {t("canvasTab.imageButton")} / {t("canvasTab.videoButton")}
          </Label>
          <Select
            value={slideForm.media_type}
            onValueChange={(val) =>
              onSlideFormChange((prev) => ({
                ...prev,
                media_type: val as StoryMediaType,
              }))
            }
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="image">
                {t("canvasTab.imageButton")}
              </Select.Item>
              <Select.Item value="video">
                {t("canvasTab.videoButton")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div className="flex flex-col gap-y-1.5">
          <Label>{t("analyticsTab.colHighlightRing")}</Label>
          <Select
            value={slideForm.group_id || groups[0]?.id || ""}
            onValueChange={(val) =>
              onSlideFormChange((prev) => ({ ...prev, group_id: val }))
            }
          >
            <Select.Trigger>
              <Select.Value placeholder={t("analyticsTab.colHighlightRing")} />
            </Select.Trigger>
            <Select.Content>
              {groups.map((g) => (
                <Select.Item key={g.id} value={g.id}>
                  {g.title}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Label htmlFor="slide-24h">{t("canvasTab.autoExpireLabel")}</Label>
          <Switch
            id="slide-24h"
            checked={slideForm.is_ephemeral_24h}
            onCheckedChange={(checked) =>
              onSlideFormChange((prev) => ({
                ...prev,
                is_ephemeral_24h: checked,
              }))
            }
          />
        </div>
      </div>
    </Container>
  )
}

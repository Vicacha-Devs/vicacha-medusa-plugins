import type React from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  StorySlideDTO,
  StoryStickerType,
} from "../../modules/story/types"
import type { NewStickerFormState } from "../hooks/use-stories-studio"

export const STICKER_TYPES: StoryStickerType[] = [
  "poll",
  "coupon",
  "countdown",
  "question_badge",
]

export interface StickerBuilderSectionProps {
  selectedSlide: StorySlideDTO | null
  stickerForm: NewStickerFormState
  onStickerFormChange: React.Dispatch<React.SetStateAction<NewStickerFormState>>
  isSaving: boolean
  onAddSticker: () => void
}

export const StickerBuilderSection = ({
  selectedSlide,
  stickerForm,
  onStickerFormChange,
  isSaving,
  onAddSticker,
}: StickerBuilderSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("stickersTab.addTitle", {
            slide: selectedSlide
              ? `"${selectedSlide.title}"`
              : t("stickersTab.selectedSlideFallback"),
          })}
        </Heading>
        <Button
          size="small"
          variant="primary"
          isLoading={isSaving}
          onClick={onAddSticker}
        >
          {t("stickersTab.addButton")}
        </Button>
      </div>

      <SectionRow
        title={t("analyticsTab.colSlideTitle")}
        value={selectedSlide?.title || t("stickersTab.selectedSlideFallback")}
      />

      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div className="flex flex-col gap-y-1.5">
          <Label>{t("tabs.stickers")}</Label>
          <Select
            value={stickerForm.type}
            onValueChange={(val) =>
              onStickerFormChange((prev) => ({
                ...prev,
                type: val as StoryStickerType,
              }))
            }
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {STICKER_TYPES.map((stId) => (
                <Select.Item key={stId} value={stId}>
                  {t(`stickersTab.types.${stId}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="stk-prompt">{t("stickersTab.promptField")}</Label>
          <Input
            id="stk-prompt"
            placeholder={t("stickersTab.promptPlaceholder")}
            value={stickerForm.prompt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onStickerFormChange((prev) => ({
                ...prev,
                prompt: e.target.value,
              }))
            }
          />
        </div>

        {stickerForm.type === "poll" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-y-1.5">
              <Label htmlFor="stk-opt1">{t("stickersTab.option1Field")}</Label>
              <Input
                id="stk-opt1"
                value={stickerForm.option_one}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onStickerFormChange((prev) => ({
                    ...prev,
                    option_one: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-y-1.5">
              <Label htmlFor="stk-opt2">{t("stickersTab.option2Field")}</Label>
              <Input
                id="stk-opt2"
                value={stickerForm.option_two}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onStickerFormChange((prev) => ({
                    ...prev,
                    option_two: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}

        {stickerForm.type === "coupon" && (
          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="stk-coupon">{t("stickersTab.couponField")}</Label>
            <Input
              id="stk-coupon"
              placeholder={t("stickersTab.couponPlaceholder")}
              value={stickerForm.coupon_code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onStickerFormChange((prev) => ({
                  ...prev,
                  coupon_code: e.target.value,
                }))
              }
            />
          </div>
        )}

        {stickerForm.type === "countdown" && (
          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="stk-countdown">
              {t("stickersTab.countdownField")}
            </Label>
            <Input
              id="stk-countdown"
              placeholder={t("stickersTab.countdownPlaceholder")}
              value={stickerForm.countdown_until}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onStickerFormChange((prev) => ({
                  ...prev,
                  countdown_until: e.target.value,
                }))
              }
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="stk-x">{t("stickersTab.posXField")}</Label>
            <Input
              id="stk-x"
              type="number"
              min={0}
              max={100}
              value={String(stickerForm.x_percent)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onStickerFormChange((prev) => ({
                  ...prev,
                  x_percent: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="stk-y">{t("stickersTab.posYField")}</Label>
            <Input
              id="stk-y"
              type="number"
              min={0}
              max={100}
              value={String(stickerForm.y_percent)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onStickerFormChange((prev) => ({
                  ...prev,
                  y_percent: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
        </div>
      </div>
    </Container>
  )
}

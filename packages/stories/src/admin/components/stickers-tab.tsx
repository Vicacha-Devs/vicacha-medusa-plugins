import type React from "react"
import type { StorySlideDTO } from "../../modules/story/types"
import type { NewStickerFormState } from "../hooks/use-stories-studio"
import {
  STICKER_TYPES,
  StickerBuilderSection,
} from "./sticker-form-section"
import { StickerActiveListSection } from "./sticker-list-section"

export { STICKER_TYPES, StickerActiveListSection, StickerBuilderSection }

export interface StickersTabProps {
  selectedSlide: StorySlideDTO | null
  stickerForm: NewStickerFormState
  onStickerFormChange: React.Dispatch<React.SetStateAction<NewStickerFormState>>
  isSaving: boolean
  onAddSticker: () => void
  onRemoveSticker?: (stickerId: string) => void
}

export const StickersTab = (props: StickersTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <StickerBuilderSection
        selectedSlide={props.selectedSlide}
        stickerForm={props.stickerForm}
        onStickerFormChange={props.onStickerFormChange}
        isSaving={props.isSaving}
        onAddSticker={props.onAddSticker}
      />
      <StickerActiveListSection
        selectedSlide={props.selectedSlide}
        onRemoveSticker={props.onRemoveSticker}
      />
    </div>
  )
}

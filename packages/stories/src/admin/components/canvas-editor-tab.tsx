import type React from "react"
import type { StoryGroupDTO, StorySlideDTO } from "../../modules/story/types"
import type {
  NewHotspotFormState,
  NewSlideFormState,
} from "../hooks/use-stories-studio"
import { CanvasHotspotPinnerSection } from "./hotspot-form-section"
import {
  CanvasSlideBuilderSection,
  CanvasTimelineSection,
} from "./slide-form-section"
import { CanvasPreviewSection } from "./slide-preview-canvas"

export {
  CanvasHotspotPinnerSection,
  CanvasPreviewSection,
  CanvasSlideBuilderSection,
  CanvasTimelineSection,
}

export interface CanvasEditorTabProps {
  groups: StoryGroupDTO[]
  slides: StorySlideDTO[]
  selectedSlide: StorySlideDTO | null
  onSelectSlide: (slideId: string) => void
  slideForm: NewSlideFormState
  onSlideFormChange: React.Dispatch<React.SetStateAction<NewSlideFormState>>
  hotspotForm: NewHotspotFormState
  onHotspotFormChange: React.Dispatch<React.SetStateAction<NewHotspotFormState>>
  isSavingSlide: boolean
  isSavingHotspot: boolean
  onCreateSlide: () => void
  onToggleSlideActive: (id: string, isActive: boolean) => void
  onDeleteSlide: (id: string) => void
  onCanvasCoordinateClick: (xPercent: number, yPercent: number) => void
  onAddHotspot: () => void
  onRemoveHotspot: (hotspotId: string) => void
}

export const CanvasEditorTab = (props: CanvasEditorTabProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5">
        <CanvasPreviewSection
          selectedSlide={props.selectedSlide}
          slideForm={props.slideForm}
          hotspotForm={props.hotspotForm}
          onCanvasCoordinateClick={props.onCanvasCoordinateClick}
        />
      </div>
      <div className="lg:col-span-7 flex flex-col gap-y-6">
        <CanvasSlideBuilderSection
          groups={props.groups}
          slideForm={props.slideForm}
          onSlideFormChange={props.onSlideFormChange}
          isSavingSlide={props.isSavingSlide}
          onCreateSlide={props.onCreateSlide}
        />
        <CanvasHotspotPinnerSection
          selectedSlide={props.selectedSlide}
          hotspotForm={props.hotspotForm}
          onHotspotFormChange={props.onHotspotFormChange}
          isSavingHotspot={props.isSavingHotspot}
          onAddHotspot={props.onAddHotspot}
          onRemoveHotspot={props.onRemoveHotspot}
        />
        <CanvasTimelineSection
          slides={props.slides}
          selectedSlide={props.selectedSlide}
          onSelectSlide={props.onSelectSlide}
          onToggleSlideActive={props.onToggleSlideActive}
          onDeleteSlide={props.onDeleteSlide}
        />
      </div>
    </div>
  )
}

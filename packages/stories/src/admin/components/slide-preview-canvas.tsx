import type React from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import { Badge, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StorySlideDTO } from "../../modules/story/types"
import type {
  NewHotspotFormState,
  NewSlideFormState,
} from "../hooks/use-stories-studio"
import { sanitizeAdminMediaUrl } from "../utils/theme-presets"

export interface CanvasPreviewSectionProps {
  selectedSlide: StorySlideDTO | null
  slideForm: NewSlideFormState
  hotspotForm: NewHotspotFormState
  onCanvasCoordinateClick: (xPercent: number, yPercent: number) => void
}

export const CanvasPreviewSection = ({
  selectedSlide,
  slideForm,
  hotspotForm,
  onCanvasCoordinateClick,
}: CanvasPreviewSectionProps) => {
  const { t } = useTranslation()
  const safePreviewUrl = sanitizeAdminMediaUrl(
    selectedSlide?.media_url || slideForm.media_url
  )

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    onCanvasCoordinateClick(
      Math.min(95, Math.max(5, xPct)),
      Math.min(92, Math.max(8, yPct))
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("canvasTab.canvasTitle")}</Heading>
        <Badge size="xsmall" color="blue">
          {t("canvasTab.clickHintBadge", {
            x: hotspotForm.x_percent,
            y: hotspotForm.y_percent,
          })}
        </Badge>
      </div>

      <SectionRow
        title={t("canvasTab.slideTitleField")}
        value={
          selectedSlide?.title ??
          (slideForm.title || t("canvasTab.previewSlideFallback"))
        }
      />

      <div className="flex flex-col items-center px-6 py-6">
        <div
          role="button"
          tabIndex={0}
          aria-label={t("canvasTab.canvasAriaLabel")}
          onClick={handleCanvasClick}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onCanvasCoordinateClick(50, 50)
            }
          }}
          className="relative w-full max-w-[320px] aspect-[9/16] rounded-3xl overflow-hidden border-4 border-gray-900 bg-gray-950 shadow-xl cursor-crosshair select-none flex flex-col justify-between"
        >
          <div className="relative z-20 p-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="h-1 w-full rounded-full bg-white/30 overflow-hidden mb-2">
              <div className="h-full w-2/3 bg-white rounded-full" />
            </div>
            <div className="flex items-center justify-between text-white text-xs">
              <span className="font-semibold truncate">
                {selectedSlide?.title ??
                  (slideForm.title || t("canvasTab.previewSlideFallback"))}
              </span>
              <span className="text-[11px] opacity-80">
                {(
                  (selectedSlide?.duration_ms ?? slideForm.duration_ms) / 1000
                ).toFixed(0)}
                s
              </span>
            </div>
          </div>

          <div className="absolute inset-0 z-0">
            {safePreviewUrl ? (
              (selectedSlide?.media_type ?? slideForm.media_type) ===
              "video" ? (
                <video
                  src={safePreviewUrl}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={safePreviewUrl}
                  alt={t("canvasTab.slidePreviewAlt")}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6 text-center text-white/60 text-xs">
                {t("canvasTab.emptyCanvasPrompt")}
              </div>
            )}
          </div>

          {(selectedSlide?.hotspots ?? []).map((hs) => (
            <div
              key={hs.id}
              style={{
                left: `${hs.x_percent}%`,
                top: `${hs.y_percent}%`,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute z-20 rounded-full bg-white/95 text-gray-900 px-2.5 py-1 text-[11px] font-semibold shadow-md flex items-center gap-1"
            >
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
              <span>{hs.label || hs.product_title}</span>
              {hs.price_formatted && (
                <span className="text-rose-600">{hs.price_formatted}</span>
              )}
            </div>
          ))}

          <div
            style={{
              left: `${hotspotForm.x_percent}%`,
              top: `${hotspotForm.y_percent}%`,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute z-20 pointer-events-none rounded-full border-2 border-dashed border-amber-400 bg-black/60 text-amber-300 px-2 py-0.5 text-[10px] font-mono"
          >
            {t("canvasTab.pinCrosshair", {
              x: hotspotForm.x_percent,
              y: hotspotForm.y_percent,
            })}
          </div>

          <div className="relative z-20 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
            {(selectedSlide?.caption || slideForm.caption) && (
              <p className="text-xs text-white/90 mb-2 truncate">
                {selectedSlide?.caption || slideForm.caption}
              </p>
            )}
            <div className="w-full rounded-full bg-white text-gray-900 text-center text-xs font-semibold py-1.5">
              {selectedSlide?.link_text ||
                slideForm.link_text ||
                t("canvasTab.shopNowFallback")}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

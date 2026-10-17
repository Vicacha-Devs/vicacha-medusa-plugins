import { useEffect, useState } from "react"
import { useStoryPlayer } from "../hooks"
import type {
  StoryGroupDTO,
  StoryHotspotDTO,
  StorySlideDTO,
  StoryStickerDTO,
} from "../modules/story/types"
import { sanitizeHttpUrl } from "../modules/story/utils/security"
import { StoryHotspotPin } from "./story-hotspot-pin"
import { StoryProductSheet } from "./story-product-sheet"

export interface StoryPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Standalone mode props (uses internal `useStoryPlayer` state machine when provided).
   */
  groups?: StoryGroupDTO[]
  initialGroupIndex?: number
  /**
   * Controlled mode props (when driving the player externally via `useStoryPlayer`).
   */
  group?: StoryGroupDTO | null
  slide?: StorySlideDTO | null
  slideIndex?: number
  progressPct?: number
  isPaused?: boolean
  onPauseChange?: (paused: boolean) => void
  onNext?: () => void
  onPrev?: () => void
  selectedHotspot?: StoryHotspotDTO | null
  onSelectHotspot?: (hotspot: StoryHotspotDTO | null) => void
  onAddToCart?: (hotspot: StoryHotspotDTO, slide: StorySlideDTO) => void
  onVoteSticker?: (
    sticker: StoryStickerDTO,
    optionId: string,
    slide: StorySlideDTO
  ) => void
  onSubmitQuestionSticker?: (
    sticker: StoryStickerDTO,
    responseText: string,
    slide: StorySlideDTO
  ) => void
}

export const StoryPlayerModal = ({
  isOpen,
  onClose,
  groups = [],
  initialGroupIndex = 0,
  group: controlledGroup,
  slide: controlledSlide,
  slideIndex: controlledSlideIndex,
  progressPct: controlledProgressPct,
  isPaused: controlledIsPaused,
  onPauseChange: controlledOnPauseChange,
  onNext: controlledOnNext,
  onPrev: controlledOnPrev,
  selectedHotspot: controlledSelectedHotspot,
  onSelectHotspot: controlledOnSelectHotspot,
  onAddToCart,
  onVoteSticker,
  onSubmitQuestionSticker,
}: StoryPlayerModalProps) => {
  const internalPlayer = useStoryPlayer({
    groups,
    autoPlay: isOpen && !controlledGroup,
  })

  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>(
    {}
  )
  const [copiedStickerId, setCopiedStickerId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && !controlledGroup && groups.length > 0) {
      internalPlayer.openGroup(initialGroupIndex, 0)
    } else if (!isOpen && !controlledGroup) {
      internalPlayer.closePlayer()
    }
  }, [isOpen, initialGroupIndex, controlledGroup, groups.length])

  const group = controlledGroup ?? internalPlayer.activeGroup
  const slide = controlledSlide ?? internalPlayer.activeSlide
  const slideIndex = controlledSlideIndex ?? internalPlayer.activeSlideIndex
  const progressPct = controlledProgressPct ?? internalPlayer.progressPct
  const isPaused = controlledIsPaused ?? internalPlayer.isPaused
  const onPauseChange = controlledOnPauseChange ?? internalPlayer.setIsPaused
  const onNext =
    controlledOnNext ??
    (() => {
      if (
        internalPlayer.activeGroupIndex !== null &&
        internalPlayer.activeSlideIndex + 1 >=
          (internalPlayer.activeGroup?.slides?.length ?? 0) &&
        internalPlayer.activeGroupIndex + 1 >= groups.length
      ) {
        onClose()
      } else {
        internalPlayer.nextSlide()
      }
    })
  const onPrev = controlledOnPrev ?? internalPlayer.prevSlide
  const selectedHotspot =
    controlledSelectedHotspot !== undefined
      ? controlledSelectedHotspot
      : internalPlayer.selectedHotspot
  const onSelectHotspot =
    controlledOnSelectHotspot ?? internalPlayer.setSelectedHotspot

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowRight") {
        onNext()
      } else if (e.key === "ArrowLeft") {
        onPrev()
      } else if (e.key === " ") {
        onPauseChange(!isPaused)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isPaused, onClose, onNext, onPrev, onPauseChange])

  if (!isOpen || !group || !slide) {
    return null
  }

  const slides = group.slides ?? [slide]
  const safeMediaUrl = sanitizeHttpUrl(slide.media_url)
  const safeLinkUrl = sanitizeHttpUrl(slide.link_url)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${group.title} story player`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
    >
      <div
        onMouseDown={() => onPauseChange(true)}
        onMouseUp={() => onPauseChange(false)}
        onTouchStart={() => onPauseChange(true)}
        onTouchEnd={() => onPauseChange(false)}
        className="relative w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden bg-gray-950 shadow-2xl select-none flex flex-col justify-between"
      >
        {/* Segmented Progress Bars */}
        <div className="relative z-20 p-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-1.5 mb-2.5">
            {slides.map((s, idx) => {
              const fillWidth =
                idx < slideIndex
                  ? 100
                  : idx === slideIndex
                    ? Math.min(100, Math.max(0, progressPct))
                    : 0

              return (
                <div
                  key={s.id}
                  className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    style={{ width: `${fillWidth}%` }}
                    className="h-full bg-white transition-all duration-75"
                  />
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold truncate">
                {group.title}
              </span>
              <span className="text-[11px] text-white/75 truncate">
                • {slide.title}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close stories"
              className="text-white/90 hover:text-white text-sm px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Media Background */}
        <div className="absolute inset-0 z-0">
          {safeMediaUrl && slide.media_type === "video" ? (
            <video
              src={safeMediaUrl}
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : safeMediaUrl ? (
            <img
              src={safeMediaUrl}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        {/* Left & Right Tap Navigation Zones */}
        <div className="absolute inset-y-16 inset-x-0 z-10 flex">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={onPrev}
            className="w-1/3 h-full focus:outline-none"
          />
          <button
            type="button"
            aria-label="Next slide"
            onClick={onNext}
            className="w-2/3 h-full focus:outline-none"
          />
        </div>

        {/* Interactive Stickers (Polls / Coupons / Countdowns / Q&A) */}
        {(slide.stickers ?? []).map((sticker) => (
          <div
            key={sticker.id}
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${Math.min(90, Math.max(10, sticker.x_percent))}%`,
              top: `${Math.min(85, Math.max(15, sticker.y_percent))}%`,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute z-20 w-56 rounded-xl bg-white/95 backdrop-blur-md p-3 shadow-xl text-gray-900"
          >
            <p className="text-xs font-bold text-center mb-2">
              {sticker.prompt}
            </p>
            {sticker.type === "poll" &&
              (sticker.options ?? []).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onVoteSticker?.(sticker, opt.id, slide)}
                  className="w-full mb-1 last:mb-0 flex items-center justify-between rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium hover:bg-rose-50 hover:border-rose-300 transition-colors"
                >
                  <span>{opt.label}</span>
                  <span className="text-[11px] text-gray-500">{opt.votes}</span>
                </button>
              ))}
            {sticker.type === "coupon" && sticker.coupon_code && (
              <button
                type="button"
                onClick={() => {
                  if (
                    typeof navigator !== "undefined" &&
                    navigator.clipboard?.writeText &&
                    sticker.coupon_code
                  ) {
                    void navigator.clipboard.writeText(sticker.coupon_code)
                  }
                  setCopiedStickerId(sticker.id)
                  onVoteSticker?.(sticker, sticker.coupon_code ?? "", slide)
                }}
                className="w-full rounded-lg bg-rose-50 border border-dashed border-rose-300 px-3 py-1.5 text-center hover:bg-rose-100 transition-colors"
              >
                <span className="text-xs font-mono font-bold text-rose-700">
                  {copiedStickerId === sticker.id
                    ? `Copied: ${sticker.coupon_code}`
                    : sticker.coupon_code}
                </span>
              </button>
            )}
            {sticker.type === "countdown" && sticker.countdown_until && (
              <p className="text-[11px] font-semibold text-center text-indigo-600">
                Ends: {sticker.countdown_until}
              </p>
            )}
            {sticker.type === "question_badge" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Type your answer..."
                  value={questionDrafts[sticker.id] ?? ""}
                  onChange={(e) =>
                    setQuestionDrafts((prev) => ({
                      ...prev,
                      [sticker.id]: e.target.value,
                    }))
                  }
                  className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = (questionDrafts[sticker.id] ?? "").trim()
                    if (!text) return
                    onSubmitQuestionSticker?.(sticker, text, slide)
                    setQuestionDrafts((prev) => ({ ...prev, [sticker.id]: "" }))
                  }}
                  className="rounded-lg bg-gray-900 text-white px-2.5 py-1 text-xs font-semibold hover:bg-gray-800"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Interactive X/Y Product Hotspots */}
        {(slide.hotspots ?? []).map((hotspot) => (
          <StoryHotspotPin
            key={hotspot.id}
            hotspot={hotspot}
            isSelected={selectedHotspot?.id === hotspot.id}
            onSelect={(hs) => onSelectHotspot(hs)}
          />
        ))}

        {/* Bottom Caption & CTA Bar */}
        <div className="relative z-20 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
          {slide.caption && (
            <p className="text-xs text-white/90 mb-2 line-clamp-2">
              {slide.caption}
            </p>
          )}
          {safeLinkUrl && (
            <a
              href={safeLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block w-full rounded-full bg-white text-gray-900 text-center text-xs font-semibold py-2.5 px-4 shadow-md hover:bg-gray-100"
            >
              {slide.link_text || "Shop Now"}
            </a>
          )}
        </div>

        {/* Slide-Up Quick-Shop Product Sheet */}
        {selectedHotspot && (
          <StoryProductSheet
            hotspot={selectedHotspot}
            onClose={() => onSelectHotspot(null)}
            onAddToCart={
              onAddToCart ? (hs) => onAddToCart(hs, slide) : undefined
            }
          />
        )}
      </div>
    </div>
  )
}

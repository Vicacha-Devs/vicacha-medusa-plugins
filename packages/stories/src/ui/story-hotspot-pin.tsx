import type { StoryHotspotDTO } from "../modules/story/types"
import { sanitizeHttpUrl } from "../modules/story/utils/security"

export interface StoryHotspotPinProps {
  hotspot: StoryHotspotDTO
  onSelect: (hotspot: StoryHotspotDTO) => void
  isSelected?: boolean
}

export const StoryHotspotPin = ({
  hotspot,
  onSelect,
  isSelected = false,
}: StoryHotspotPinProps) => {
  const x = Math.min(95, Math.max(5, hotspot.x_percent))
  const y = Math.min(92, Math.max(8, hotspot.y_percent))
  const badgeStyle = hotspot.badge_style ?? "pill"
  const safeThumb = sanitizeHttpUrl(hotspot.product_thumbnail)

  if (badgeStyle === "dot") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect(hotspot)
        }}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: "translate(-50%, -50%)",
        }}
        aria-label={`Shop ${hotspot.product_title}`}
        className={`absolute z-20 flex h-7 w-7 items-center justify-center rounded-full shadow-lg transition-transform duration-150 hover:scale-110 ${
          isSelected
            ? "bg-black ring-2 ring-white"
            : "bg-white/95 backdrop-blur-sm"
        }`}
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
        </span>
      </button>
    )
  }

  if (badgeStyle === "card") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect(hotspot)
        }}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: "translate(-50%, -50%)",
        }}
        aria-label={`Shop ${hotspot.product_title}`}
        className={`absolute z-20 flex items-center gap-2 rounded-xl p-1.5 pr-3 text-left text-xs shadow-xl transition-transform duration-150 hover:scale-105 ${
          isSelected
            ? "bg-black text-white ring-2 ring-white"
            : "bg-white/95 text-gray-900 backdrop-blur-sm"
        }`}
      >
        {safeThumb && (
          <img
            src={safeThumb}
            alt={hotspot.product_title}
            className="h-8 w-8 rounded-lg object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="max-w-[110px] truncate font-semibold">
            {hotspot.label || hotspot.product_title}
          </p>
          {hotspot.price_formatted && (
            <p className="text-[11px] font-bold text-rose-600">
              {hotspot.price_formatted}
            </p>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect(hotspot)
      }}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      aria-label={`Shop ${hotspot.product_title}`}
      className={`absolute z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-transform duration-150 hover:scale-105 ${
        isSelected
          ? "bg-black text-white ring-2 ring-white"
          : "bg-white/95 text-gray-900 backdrop-blur-sm"
      }`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
      </span>
      <span className="max-w-[130px] truncate">
        {hotspot.label || hotspot.product_title}
      </span>
      {hotspot.price_formatted && (
        <span className="font-semibold text-rose-600 ml-0.5">
          {hotspot.price_formatted}
        </span>
      )}
    </button>
  )
}

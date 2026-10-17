import type { StoryHotspotDTO } from "../modules/story/types"
import { sanitizeHttpUrl } from "../modules/story/utils/security"

export interface StoryProductSheetProps {
  hotspot: StoryHotspotDTO
  onClose: () => void
  onAddToCart?: (hotspot: StoryHotspotDTO) => void
  onNavigateProduct?: (hotspot: StoryHotspotDTO) => void
}

export const StoryProductSheet = ({
  hotspot,
  onClose,
  onAddToCart,
  onNavigateProduct,
}: StoryProductSheetProps) => {
  const safeThumb = sanitizeHttpUrl(hotspot.product_thumbnail)

  return (
    <div
      role="dialog"
      aria-label={hotspot.product_title}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-x-0 bottom-0 z-30 rounded-t-2xl bg-white p-4 shadow-2xl border-t border-gray-100 animate-in slide-in-from-bottom"
    >
      <div className="flex items-start gap-3">
        {safeThumb ? (
          <img
            src={safeThumb}
            alt={hotspot.product_title}
            className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 shrink-0">
            Item
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {hotspot.product_title}
          </p>
          {hotspot.price_formatted && (
            <p className="text-sm font-bold text-rose-600 mt-0.5">
              {hotspot.price_formatted}
            </p>
          )}
          {hotspot.product_handle && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              /{hotspot.product_handle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product card"
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(hotspot)}
            className="flex-1 rounded-lg bg-gray-900 text-white text-xs font-semibold py-2.5 px-3 hover:bg-gray-800 transition-colors"
          >
            Quick Add to Cart
          </button>
        )}
        {onNavigateProduct && (
          <button
            type="button"
            onClick={() => onNavigateProduct(hotspot)}
            className="rounded-lg border border-gray-300 text-gray-800 text-xs font-semibold py-2.5 px-3 hover:bg-gray-50 transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  )
}

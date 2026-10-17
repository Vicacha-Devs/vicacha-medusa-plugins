import type { StoryGroupDTO } from "../modules/story/types"
import {
  RING_THEME_GRADIENTS,
  sanitizeHttpUrl,
} from "../modules/story/utils/security"

export type StoryRingsSelectHandler =
  | ((groupIndex: number) => void)
  | ((group: StoryGroupDTO, groupIndex: number) => void)

export interface StoryRingsBarProps {
  groups: StoryGroupDTO[]
  activeGroupId?: string | null
  isGroupSeen?: (group: StoryGroupDTO) => boolean
  onSelectGroup: StoryRingsSelectHandler
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_MAP = {
  sm: { outer: 60, inner: 52 },
  md: { outer: 76, inner: 68 },
  lg: { outer: 92, inner: 82 },
}

export const StoryRingsBar = ({
  groups,
  activeGroupId,
  isGroupSeen,
  onSelectGroup,
  size = "md",
  className = "",
}: StoryRingsBarProps) => {
  const dimensions = SIZE_MAP[size]

  const handleSelect = (group: StoryGroupDTO, index: number) => {
    if (onSelectGroup.length >= 2) {
      ;(onSelectGroup as (g: StoryGroupDTO, idx: number) => void)(group, index)
    } else {
      ;(onSelectGroup as (idx: number) => void)(index)
    }
  }

  return (
    <div
      role="region"
      aria-label="Shoppable Story Highlights"
      className={`flex items-center gap-4 overflow-x-auto py-3 px-2 ${className}`}
    >
      {groups.map((group, index) => {
        const seen = isGroupSeen ? isGroupSeen(group) : false
        const isActive = Boolean(activeGroupId && activeGroupId === group.id)
        const ringBackground = seen
          ? "#d1d5db"
          : group.ring_theme === "custom" && group.custom_ring_color
            ? group.custom_ring_color
            : (RING_THEME_GRADIENTS[group.ring_theme] ??
              RING_THEME_GRADIENTS.instagram)

        const safeAvatar =
          sanitizeHttpUrl(
            group.avatar_url ??
              group.slides?.[0]?.thumbnail_url ??
              group.slides?.[0]?.media_url
          ) ?? null

        return (
          <button
            key={group.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleSelect(group, index)}
            className="flex flex-col items-center gap-1.5 group focus:outline-none shrink-0"
          >
            <div
              style={{
                width: `${dimensions.outer}px`,
                height: `${dimensions.outer}px`,
                background: ringBackground,
              }}
              className={`rounded-full p-0.5 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm ${
                isActive ? "scale-105 ring-2 ring-gray-900" : ""
              }`}
            >
              <div
                style={{
                  width: `${dimensions.inner}px`,
                  height: `${dimensions.inner}px`,
                }}
                className="rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden"
              >
                {safeAvatar ? (
                  <img
                    src={safeAvatar}
                    alt={group.title}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-xs font-semibold text-gray-700 uppercase">
                    {group.title.slice(0, 2)}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-gray-900 max-w-[84px] truncate">
              {group.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}

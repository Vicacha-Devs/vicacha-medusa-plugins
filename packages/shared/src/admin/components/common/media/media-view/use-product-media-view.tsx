import { useContext } from "react"

import { MediaViewContext } from "./media-view-context"

export const useMediaView = () => {
  const context = useContext(MediaViewContext)

  if (!context) {
    throw new Error(
      "useMediaView must be used within a MediaViewProvider"
    )
  }

  return context
}

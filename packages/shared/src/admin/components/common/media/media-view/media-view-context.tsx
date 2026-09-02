import { createContext } from "react"

type MediaViewContextValue = {
  goToGallery: () => void
  goToEdit: () => void
}

export const MediaViewContext =
  createContext<MediaViewContextValue | null>(null)

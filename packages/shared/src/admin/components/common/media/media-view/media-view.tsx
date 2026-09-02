import { ReactNode } from "react"
import { useSearchParams } from "react-router-dom"

import { MediaViewContext } from "./media-view-context"
import { MediaGallery } from "../media-gallery"

export type MediaImage = {
  id: string
  url: string
}

export type MediaViewProps = {
  images: MediaImage[]
  thumbnail?: string | null
  onDelete: (id: string, isThumbnail: boolean) => Promise<void>
  isPending?: boolean
  editView: ReactNode
}

enum View {
  GALLERY = "gallery",
  EDIT = "edit",
}

const getView = (searchParams: URLSearchParams) => {
  const view = searchParams.get("view")
  if (view === View.EDIT) {
    return View.EDIT
  }

  return View.GALLERY
}

export const MediaView = ({ images, thumbnail, onDelete, isPending, editView }: MediaViewProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = getView(searchParams)

  const handleGoToView = (view: View) => {
    return () => {
      setSearchParams({ view })
    }
  }

  return (
    <MediaViewContext.Provider
      value={{
        goToGallery: handleGoToView(View.GALLERY),
        goToEdit: handleGoToView(View.EDIT),
      }}
    >
      {view === View.EDIT ? editView : (
        <MediaGallery
          images={images}
          thumbnail={thumbnail}
          onDelete={onDelete}
          isPending={isPending}
        />
      )}
    </MediaViewContext.Provider>
  )
}

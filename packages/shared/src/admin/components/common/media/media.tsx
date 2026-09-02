import { RouteFocusModal } from "../../modals"
import { MediaView, MediaViewProps } from "./media-view"

type MediaProps = MediaViewProps & {
  title: string
  description: string
}

export const Media = ({ title, description, ...mediaViewProps }: MediaProps) => {
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{title}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{description}</span>
      </RouteFocusModal.Description>
      <MediaView {...mediaViewProps} />
    </RouteFocusModal>
  )
}

import { PencilSquare, ThumbnailBadge } from "@medusajs/icons"
import {
  Button,
  Checkbox,
  CommandBar,
  Container,
  Heading,
  Text,
  Tooltip,
  clx,
  usePrompt,
} from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ActionMenu } from "../action-menu"

type MediaImage = {
  id: string
  url: string
}

type MediaSectionProps = {
  images?: MediaImage[]
  thumbnail?: string | null
  heading: string
  editPath?: string
  entityAlt?: string
  emptyState: {
    header: string
    description: string
    action: string
  }
  deleteWarning: {
    default: (count: number) => string
    withThumbnail?: (count: number) => string
  }
  onDelete: (imageIds: string[], includingThumbnail: boolean) => Promise<void>
  isPending?: boolean
}

type MediaItem = {
  id: string
  url: string
  isThumbnail: boolean
}

const buildMedia = (images: MediaImage[] = [], thumbnail?: string | null): MediaItem[] => {
  const items: MediaItem[] = images.map((img) => ({
    id: img.id,
    url: img.url,
    isThumbnail: !!thumbnail && img.url === thumbnail,
  }))

  if (thumbnail && !items.some((m) => m.url === thumbnail)) {
    items.unshift({ id: "img_thumbnail", url: thumbnail, isThumbnail: true })
  }

  return items
}

export const MediaSection = ({
  images,
  thumbnail,
  heading,
  editPath = "media?view=edit",
  entityAlt,
  emptyState,
  deleteWarning,
  onDelete,
}: MediaSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()

  const [selection, setSelection] = useState<Record<string, boolean>>({})

  const media = buildMedia(images, thumbnail)

  const handleCheckedChange = (id: string) => {
    setSelection((prev) => {
      if (prev[id]) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: true }
    })
  }

  const handleDelete = async () => {
    const ids = Object.keys(selection)
    const includingThumbnail = ids.some((id) => media.find((m) => m.id === id)?.isThumbnail)

    const warningFn = includingThumbnail && deleteWarning.withThumbnail
      ? deleteWarning.withThumbnail
      : deleteWarning.default

    const confirmed = await prompt({
      title: t("general.areYouSure"),
      description: warningFn(ids.length),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) return

    await onDelete(ids, includingThumbnail)
    setSelection({})
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{heading}</Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  to: editPath,
                  icon: <PencilSquare />,
                },
              ],
            },
          ]}
        />
      </div>

      {media.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4 px-6 py-4">
          {media.map((item, index) => {
            const isSelected = selection[item.id]

            return (
              <div
                key={item.id}
                className="shadow-elevation-card-rest hover:shadow-elevation-card-hover transition-fg group relative aspect-square size-full cursor-pointer overflow-hidden rounded-[8px]"
              >
                <div
                  className={clx(
                    "transition-fg invisible absolute right-2 top-2 opacity-0 group-hover:visible group-hover:opacity-100",
                    { "visible opacity-100": isSelected }
                  )}
                >
                  <Checkbox
                    checked={isSelected || false}
                    onCheckedChange={() => handleCheckedChange(item.id)}
                  />
                </div>
                {item.isThumbnail && (
                  <div className="absolute left-2 top-2">
                    <Tooltip content={t("fields.thumbnail")}>
                      <ThumbnailBadge />
                    </Tooltip>
                  </div>
                )}
                <Link to="media" state={{ curr: index }}>
                  <img
                    src={item.url}
                    alt={entityAlt ?? ""}
                    className="size-full object-cover"
                  />
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-y-4 pb-8 pt-6">
          <div className="flex flex-col items-center">
            <Text size="small" leading="compact" weight="plus" className="text-ui-fg-subtle">
              {emptyState.header}
            </Text>
            <Text size="small" className="text-ui-fg-muted">
              {emptyState.description}
            </Text>
          </div>
          <Button size="small" variant="secondary" asChild>
            <Link to={editPath}>{emptyState.action}</Link>
          </Button>
        </div>
      )}

      <CommandBar open={!!Object.keys(selection).length}>
        <CommandBar.Bar>
          <CommandBar.Value>
            {t("general.countSelected", { count: Object.keys(selection).length })}
          </CommandBar.Value>
          <CommandBar.Seperator />
          <CommandBar.Command
            action={handleDelete}
            label={t("actions.delete")}
            shortcut="d"
          />
        </CommandBar.Bar>
      </CommandBar>
    </Container>
  )
}

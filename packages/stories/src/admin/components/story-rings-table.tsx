import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Switch,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { StoryGroupDTO } from "../../modules/story/types"
import {
  resolveRingGradient,
  sanitizeAdminMediaUrl,
} from "../utils/theme-presets"

export interface StoryRingsPreviewSectionProps {
  groups: StoryGroupDTO[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string) => void
  onOpenCreateDrawer?: () => void
}

export const StoryRingsPreviewSection = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onOpenCreateDrawer,
}: StoryRingsPreviewSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("ringsTab.previewTitle")}</Heading>
        {onOpenCreateDrawer && (
          <Button size="small" variant="primary" onClick={onOpenCreateDrawer}>
            {t("ringsTab.createButton")}
          </Button>
        )}
      </div>

      <SectionRow
        title={t("analyticsTab.colHighlightRing")}
        value={
          <Badge size="xsmall" color="purple">
            {groups.length}
          </Badge>
        }
      />

      <div className="px-6 py-4 flex items-center gap-5 overflow-x-auto bg-ui-bg-subtle">
        {groups.map((g) => {
          const isSelected = g.id === selectedGroupId
          const safeAvatar = sanitizeAdminMediaUrl(
            g.avatar_url ??
              g.slides?.[0]?.thumbnail_url ??
              g.slides?.[0]?.media_url
          )
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGroup(g.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
            >
              <div
                style={{
                  background: resolveRingGradient(
                    g.ring_theme,
                    g.custom_ring_color
                  ),
                }}
                className={`w-16 h-16 rounded-full p-0.5 flex items-center justify-center transition-transform ${
                  isSelected ? "scale-110 ring-2 ring-ui-fg-base" : ""
                }`}
              >
                <div className="w-full h-full rounded-full bg-ui-bg-base p-0.5 flex items-center justify-center overflow-hidden">
                  {safeAvatar ? (
                    <img
                      src={safeAvatar}
                      alt={g.title}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase">
                      {g.title.slice(0, 2)}
                    </span>
                  )}
                </div>
              </div>
              <Text size="xsmall" weight={isSelected ? "plus" : "regular"}>
                {g.title}
              </Text>
            </button>
          )
        })}
        {!groups.length && (
          <Text size="small" className="text-ui-fg-subtle">
            {t("ringsTab.emptyState")}
          </Text>
        )}
      </div>
    </Container>
  )
}

export interface StoryRingsTableSectionProps {
  groups: StoryGroupDTO[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string) => void
  onToggleGroupActive?: (id: string, isActive: boolean) => void
  onDeleteGroup: (id: string) => void
}

export const StoryRingsTableSection = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onToggleGroupActive,
  onDeleteGroup,
}: StoryRingsTableSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("analyticsTab.ringBreakdownTitle")}</Heading>
        <Badge size="xsmall" color="purple">
          {groups.length}
        </Badge>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("ringsTab.titleField")}</Table.HeaderCell>
            <Table.HeaderCell>{t("ringsTab.themeField")}</Table.HeaderCell>
            <Table.HeaderCell>{t("ringsTab.placementField")}</Table.HeaderCell>
            <Table.HeaderCell>{t("analyticsTab.colSlides")}</Table.HeaderCell>
            <Table.HeaderCell>{t("ringsTab.activeBadge")}</Table.HeaderCell>
            <Table.HeaderCell className="text-right" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {groups.map((g) => (
            <Table.Row
              key={g.id}
              className={
                selectedGroupId === g.id ? "bg-ui-bg-subtle" : "cursor-pointer"
              }
              onClick={() => onSelectGroup(g.id)}
            >
              <Table.Cell>
                <div>
                  <Text weight="plus">{g.title}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("ringsTab.handleLabel", { handle: g.handle })}
                  </Text>
                </div>
              </Table.Cell>
              <Table.Cell>
                <Badge size="xsmall" color="purple">
                  {g.ring_theme}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Badge size="xsmall" color="blue">
                  {t("ringsTab.zoneBadge", { placement: g.placement })}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Badge size="xsmall" color="grey">
                  {t("ringsTab.slidesCountBadge", {
                    count: g.slides?.length ?? 0,
                  })}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color={g.is_active ? "green" : "grey"}>
                  {g.is_active
                    ? t("ringsTab.activeBadge")
                    : t("ringsTab.pausedBadge")}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-2">
                  {onToggleGroupActive && (
                    <Switch
                      checked={g.is_active}
                      onCheckedChange={(checked: boolean) =>
                        onToggleGroupActive(g.id, checked)
                      }
                    />
                  )}
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => onDeleteGroup(g.id)}
                  >
                    {t("ringsTab.deleteButton")}
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

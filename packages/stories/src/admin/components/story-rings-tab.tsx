import type React from "react"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  StoryGroupDTO,
  StoryPlacementZone,
  StoryRingTheme,
} from "../../modules/story/types"
import type { NewGroupFormState } from "../hooks/use-stories-studio"
import { ADMIN_RING_THEME_PRESETS } from "../utils/theme-presets"
import {
  makeStoryRingCreateFormSchema,
  PLACEMENT_ZONES,
  StoryRingCreateForm,
  type StoryRingCreateFormValues,
} from "./story-ring-form"
import {
  StoryRingsPreviewSection,
  StoryRingsTableSection,
} from "./story-rings-table"

export {
  makeStoryRingCreateFormSchema,
  PLACEMENT_ZONES,
  StoryRingCreateForm,
  type StoryRingCreateFormValues,
  StoryRingsPreviewSection,
  StoryRingsTableSection,
}

export interface StoryRingsInlineCreateSectionProps {
  form: NewGroupFormState
  onFormChange: React.Dispatch<React.SetStateAction<NewGroupFormState>>
  isSaving: boolean
  onCreateGroup: () => void
}

export const StoryRingsInlineCreateSection = ({
  form,
  onFormChange,
  isSaving,
  onCreateGroup,
}: StoryRingsInlineCreateSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("ringsTab.createTitle")}</Heading>
        <Button
          size="small"
          variant="primary"
          isLoading={isSaving}
          onClick={onCreateGroup}
        >
          {t("ringsTab.createButton")}
        </Button>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="grp-title">{t("ringsTab.titleField")}</Label>
          <Input
            id="grp-title"
            placeholder={t("ringsTab.titlePlaceholder")}
            value={form.title}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="grp-subtitle">{t("ringsTab.subtitleField")}</Label>
          <Input
            id="grp-subtitle"
            placeholder={t("ringsTab.subtitlePlaceholder")}
            value={form.subtitle}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, subtitle: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="grp-avatar">{t("ringsTab.avatarField")}</Label>
          <Input
            id="grp-avatar"
            placeholder={t("ringsTab.avatarPlaceholder")}
            value={form.avatar_url}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, avatar_url: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label>{t("ringsTab.themeField")}</Label>
          <Select
            value={form.ring_theme}
            onValueChange={(val) =>
              onFormChange((prev) => ({
                ...prev,
                ring_theme: val as StoryRingTheme,
              }))
            }
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {ADMIN_RING_THEME_PRESETS.map((preset) => (
                <Select.Item key={preset.id} value={preset.id}>
                  {t(`ringsTab.themes.${preset.id}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-y-1.5">
          <Label>{t("ringsTab.placementField")}</Label>
          <Select
            value={form.placement}
            onValueChange={(val) =>
              onFormChange((prev) => ({
                ...prev,
                placement: val as StoryPlacementZone,
              }))
            }
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {PLACEMENT_ZONES.map((zone) => (
                <Select.Item key={zone} value={zone}>
                  {t(`ringsTab.zones.${zone}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Label htmlFor="grp-pinned">{t("ringsTab.pinnedSwitch")}</Label>
          <Switch
            id="grp-pinned"
            checked={form.is_pinned}
            onCheckedChange={(checked) =>
              onFormChange((prev) => ({ ...prev, is_pinned: checked }))
            }
          />
        </div>
      </div>
    </Container>
  )
}

export interface StoryRingsTabProps {
  groups: StoryGroupDTO[]
  selectedGroupId: string | null
  onSelectGroup: (groupId: string) => void
  form: NewGroupFormState
  onFormChange: React.Dispatch<React.SetStateAction<NewGroupFormState>>
  isSaving: boolean
  onCreateGroup: () => void
  onToggleGroupActive?: (id: string, isActive: boolean) => void
  onDeleteGroup: (id: string) => void
  onOpenCreateDrawer?: () => void
}

export const StoryRingsTab = (props: StoryRingsTabProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 flex flex-col gap-y-6">
        <StoryRingsPreviewSection
          groups={props.groups}
          selectedGroupId={props.selectedGroupId}
          onSelectGroup={props.onSelectGroup}
          onOpenCreateDrawer={props.onOpenCreateDrawer}
        />
        <StoryRingsTableSection
          groups={props.groups}
          selectedGroupId={props.selectedGroupId}
          onSelectGroup={props.onSelectGroup}
          onToggleGroupActive={props.onToggleGroupActive}
          onDeleteGroup={props.onDeleteGroup}
        />
      </div>
      <div className="lg:col-span-5">
        <StoryRingsInlineCreateSection
          form={props.form}
          onFormChange={props.onFormChange}
          isSaving={props.isSaving}
          onCreateGroup={props.onCreateGroup}
        />
      </div>
    </div>
  )
}

import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm, RouteDrawer } from "@medusajs/dashboard/components"
import { Button, Input, Select, Switch } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import type { StoryPlacementZone } from "../../modules/story/types"
import { ADMIN_RING_THEME_PRESETS } from "../utils/theme-presets"

export const PLACEMENT_ZONES: StoryPlacementZone[] = [
  "home", "collection", "category", "product", "floating_bubble", "global",
]

const RING_THEME_VALUES = [
  "instagram", "tiktok", "sunset", "emerald", "violet",
  "cyber", "neon", "gold", "minimal", "custom",
] as const

const PLACEMENT_VALUES = [
  "home", "collection", "category", "product", "floating_bubble", "global",
] as const

export const makeStoryRingCreateFormSchema = () =>
  z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    avatar_url: z.string().optional(),
    ring_theme: z.enum(RING_THEME_VALUES),
    custom_ring_color: z.string().optional(),
    placement: z.enum(PLACEMENT_VALUES),
    is_pinned: z.boolean(),
    is_ephemeral: z.boolean(),
  })

export type StoryRingCreateFormValues = z.infer<
  ReturnType<typeof makeStoryRingCreateFormSchema>
>

export interface StoryRingCreateDrawerFormProps {
  onSubmit: (values: StoryRingCreateFormValues) => Promise<void>
  loading: boolean
}

export const StoryRingCreateForm = ({
  onSubmit,
  loading,
}: StoryRingCreateDrawerFormProps) => {
  const { t } = useTranslation()
  const schema = useMemo(() => makeStoryRingCreateFormSchema(), [])

  const form = useForm<StoryRingCreateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      subtitle: "",
      avatar_url: "",
      ring_theme: "instagram",
      custom_ring_color: "#6366f1",
      placement: "home",
      is_pinned: true,
      is_ephemeral: false,
    },
  })

  const ringTheme = form.watch("ring_theme")

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto p-6">
          <Form.Field
            control={form.control}
            name="title"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("ringsTab.titleField")}</Form.Label>
                <Form.Control>
                  <Input placeholder={t("ringsTab.titlePlaceholder")} {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="subtitle"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>{t("ringsTab.subtitleField")}</Form.Label>
                <Form.Control>
                  <Input placeholder={t("ringsTab.subtitlePlaceholder")} {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="avatar_url"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>{t("ringsTab.avatarField")}</Form.Label>
                <Form.Control>
                  <Input type="url" placeholder={t("ringsTab.avatarPlaceholder")} {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="ring_theme"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("ringsTab.themeField")}</Form.Label>
                <Form.Control>
                  <Select value={field.value} onValueChange={field.onChange}>
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
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          {ringTheme === "custom" && (
            <Form.Field
              control={form.control}
              name="custom_ring_color"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label>{t("ringsTab.customColorField")}</Form.Label>
                  <Form.Control>
                    <Input placeholder={t("ringsTab.customColorPlaceholder")} {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}
          <Form.Field
            control={form.control}
            name="placement"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("ringsTab.placementField")}</Form.Label>
                <Form.Control>
                  <Select value={field.value} onValueChange={field.onChange}>
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
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="is_pinned"
            render={({ field }: any) => (
              <Form.Item>
                <div className="flex items-center justify-between pt-2">
                  <Form.Label>{t("ringsTab.pinnedSwitch")}</Form.Label>
                  <Form.Control>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </Form.Control>
                </div>
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("header.dismiss")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={loading}>
              {t("ringsTab.createButton")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

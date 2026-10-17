import { RouteDrawer, useRouteModal } from "@medusajs/dashboard/components"
import { Heading, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useCreateStoryGroup } from "../../../../../hooks"
import {
  StoryRingCreateForm,
  type StoryRingCreateFormValues,
} from "../../../../components/story-rings-tab"

const CreateRingContent = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { mutateAsync: createGroup, isPending } = useCreateStoryGroup()

  const handleSubmit = async (values: StoryRingCreateFormValues) => {
    try {
      const res = await createGroup({
        title: values.title,
        subtitle: values.subtitle || null,
        avatar_url: values.avatar_url || null,
        ring_theme: values.ring_theme,
        custom_ring_color:
          values.ring_theme === "custom"
            ? values.custom_ring_color || "#6366f1"
            : null,
        placement: values.placement,
        is_pinned: values.is_pinned,
        is_ephemeral: values.is_ephemeral,
      })
      toast.success(t("messages.groupCreated", { title: res.group.title }))
      handleSuccess()
    } catch (err: any) {
      toast.error(err?.message ?? t("messages.groupCreateError"))
    }
  }

  return <StoryRingCreateForm onSubmit={handleSubmit} loading={isPending} />
}

const StoryRingCreateDrawer = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("ringsTab.createTitle")}</Heading>
      </RouteDrawer.Header>
      <CreateRingContent />
    </RouteDrawer>
  )
}

export default StoryRingCreateDrawer

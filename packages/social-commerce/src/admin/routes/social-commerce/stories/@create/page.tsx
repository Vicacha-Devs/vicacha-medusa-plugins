import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  KeyboundForm,
  RouteDrawer,
  useRouteModal,
} from "@medusajs/dashboard/components"
import { Button, Heading, Input, Select, Toaster } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { createStoryFormSchema } from "../../../../components/stories-tab.js"
import {
  useSocialDashboard,
  type CreateStoryFormState,
} from "../../../../hooks/use-social-dashboard.js"
import type { MediaType } from "../../../../../modules/social-commerce/types/index.js"

const CreateStoryDrawerContent = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { submitLocalStory, loading } = useSocialDashboard()

  const form = useForm<CreateStoryFormState>({
    resolver: zodResolver(createStoryFormSchema),
    defaultValues: {
      title: "",
      mediaUrl: "",
      mediaType: "story",
      linkUrl: "",
      durationSeconds: 15,
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    const ok = await submitLocalStory(values)
    if (ok) {
      handleSuccess()
    }
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto p-4">
          <Form.Field
            control={form.control}
            name="title"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("storiesTab.titlePlaceholder")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    placeholder={t("storiesTab.titlePlaceholder")}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="mediaUrl"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("storiesTab.mediaUrlPlaceholder")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    type="url"
                    placeholder={t("storiesTab.mediaUrlPlaceholder")}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="mediaType"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("storiesTab.mediaTypes.story")}</Form.Label>
                <Form.Control>
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val as MediaType)}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="story">
                        {t("storiesTab.mediaTypes.story")}
                      </Select.Item>
                      <Select.Item value="video">
                        {t("storiesTab.mediaTypes.video")}
                      </Select.Item>
                      <Select.Item value="image">
                        {t("storiesTab.mediaTypes.image")}
                      </Select.Item>
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="linkUrl"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("storiesTab.linkUrlPlaceholder")}
                </Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    type="url"
                    placeholder={t("storiesTab.linkUrlPlaceholder")}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="durationSeconds"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("storiesTab.durationAria")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={120}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>

        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" type="button">
                Cancel
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={loading}>
              {t("storiesTab.publishButton")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

const StoryCreateModal = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <Toaster />
      <RouteDrawer.Header>
        <Heading>{t("storiesTab.publishButton")}</Heading>
      </RouteDrawer.Header>
      <CreateStoryDrawerContent />
    </RouteDrawer>
  )
}

export default StoryCreateModal

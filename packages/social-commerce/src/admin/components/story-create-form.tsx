import type React from "react"
import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import { Button, Input, Select } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "@medusajs/framework/zod"
import type { MediaType } from "../../modules/social-commerce/types/index.js"
import type { CreateStoryFormState } from "../hooks/use-social-dashboard.js"

export const createStoryFormSchema = z.object({
  title: z.string().min(1),
  mediaUrl: z.string().url(),
  mediaType: z.enum(["story", "video", "image"]),
  linkUrl: z.string(),
  durationSeconds: z.number().int().min(1).max(120),
})

export interface StoryCreateFormProps {
  storyForm: CreateStoryFormState
  onStoryFormChange: React.Dispatch<React.SetStateAction<CreateStoryFormState>>
  onCreateStory: (e: React.FormEvent) => void
}

export const StoryCreateForm = ({
  storyForm,
  onStoryFormChange,
  onCreateStory,
}: StoryCreateFormProps) => {
  const { t } = useTranslation()
  const rhf = useForm<CreateStoryFormState>({
    resolver: zodResolver(createStoryFormSchema),
    defaultValues: storyForm,
  })

  useEffect(() => {
    rhf.reset(storyForm)
  }, [storyForm, rhf])

  return (
    <Form {...rhf}>
      <KeyboundForm
        onSubmit={onCreateStory}
        className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6"
      >
        <Form.Field
          control={rhf.control}
          name="title"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Input
                  {...field}
                  placeholder={t("storiesTab.titlePlaceholder")}
                  value={storyForm.title}
                  onChange={(e) => {
                    field.onChange(e)
                    onStoryFormChange((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }}
                />
              </Form.Control>
            </Form.Item>
          )}
        />

        <Form.Field
          control={rhf.control}
          name="mediaUrl"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Input
                  {...field}
                  type="url"
                  placeholder={t("storiesTab.mediaUrlPlaceholder")}
                  value={storyForm.mediaUrl}
                  onChange={(e) => {
                    field.onChange(e)
                    onStoryFormChange((prev) => ({
                      ...prev,
                      mediaUrl: e.target.value,
                    }))
                  }}
                />
              </Form.Control>
            </Form.Item>
          )}
        />

        <Form.Field
          control={rhf.control}
          name="mediaType"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Select
                  value={storyForm.mediaType}
                  onValueChange={(val) => {
                    field.onChange(val)
                    onStoryFormChange((prev) => ({
                      ...prev,
                      mediaType: val as MediaType,
                    }))
                  }}
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
            </Form.Item>
          )}
        />

        <Form.Field
          control={rhf.control}
          name="linkUrl"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Input
                  {...field}
                  type="url"
                  placeholder={t("storiesTab.linkUrlPlaceholder")}
                  value={storyForm.linkUrl}
                  onChange={(e) => {
                    field.onChange(e)
                    onStoryFormChange((prev) => ({
                      ...prev,
                      linkUrl: e.target.value,
                    }))
                  }}
                />
              </Form.Control>
            </Form.Item>
          )}
        />

        <Form.Field
          control={rhf.control}
          name="durationSeconds"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Input
                  {...field}
                  type="number"
                  aria-label={t("storiesTab.durationAria")}
                  min={1}
                  max={120}
                  value={storyForm.durationSeconds}
                  onChange={(e) => {
                    const num = Number(e.target.value)
                    field.onChange(num)
                    onStoryFormChange((prev) => ({
                      ...prev,
                      durationSeconds: num,
                    }))
                  }}
                />
              </Form.Control>
            </Form.Item>
          )}
        />

        <div className="flex items-center">
          <Button type="submit" variant="primary" size="small">
            {t("storiesTab.publishButton")}
          </Button>
        </div>
      </KeyboundForm>
    </Form>
  )
}

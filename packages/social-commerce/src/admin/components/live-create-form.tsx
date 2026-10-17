import type React from "react"
import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import { Button, Input, Select } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "@medusajs/framework/zod"
import type { SocialPlatform } from "../../modules/social-commerce/types/index.js"
import type { CreateLiveFormState } from "../hooks/use-social-dashboard.js"

export const createLiveFormSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "facebook", "local"]),
  title: z.string().min(1),
  streamUrl: z.string(),
})

export interface LiveCreateFormProps {
  liveForm: CreateLiveFormState
  onLiveFormChange: React.Dispatch<React.SetStateAction<CreateLiveFormState>>
  onCreateLiveSession: (e: React.FormEvent) => void
}

export const LiveCreateForm = ({
  liveForm,
  onLiveFormChange,
  onCreateLiveSession,
}: LiveCreateFormProps) => {
  const { t } = useTranslation()
  const rhf = useForm<CreateLiveFormState>({
    resolver: zodResolver(createLiveFormSchema),
    defaultValues: liveForm,
  })

  useEffect(() => {
    rhf.reset(liveForm)
  }, [liveForm, rhf])

  return (
    <Form {...rhf}>
      <KeyboundForm
        onSubmit={onCreateLiveSession}
        className="grid grid-cols-1 gap-4 md:grid-cols-4"
      >
        <Form.Field
          control={rhf.control}
          name="platform"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Select
                  value={liveForm.platform}
                  onValueChange={(val) => {
                    field.onChange(val)
                    onLiveFormChange((prev) => ({
                      ...prev,
                      platform: val as SocialPlatform,
                    }))
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="tiktok">
                      {t("liveTab.platforms.tiktok")}
                    </Select.Item>
                    <Select.Item value="instagram">
                      {t("liveTab.platforms.instagram")}
                    </Select.Item>
                    <Select.Item value="facebook">
                      {t("liveTab.platforms.facebook")}
                    </Select.Item>
                    <Select.Item value="local">
                      {t("liveTab.platforms.local")}
                    </Select.Item>
                  </Select.Content>
                </Select>
              </Form.Control>
            </Form.Item>
          )}
        />

        <Form.Field
          control={rhf.control}
          name="title"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Input
                  {...field}
                  placeholder={t("liveTab.titlePlaceholder")}
                  value={liveForm.title}
                  onChange={(e) => {
                    field.onChange(e)
                    onLiveFormChange((prev) => ({
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
          name="streamUrl"
          render={({ field }: any) => (
            <Form.Item>
              <Form.Control>
                <Input
                  {...field}
                  type="url"
                  placeholder={t("liveTab.streamUrlPlaceholder")}
                  value={liveForm.streamUrl}
                  onChange={(e) => {
                    field.onChange(e)
                    onLiveFormChange((prev) => ({
                      ...prev,
                      streamUrl: e.target.value,
                    }))
                  }}
                />
              </Form.Control>
            </Form.Item>
          )}
        />

        <div className="flex items-center">
          <Button type="submit" variant="primary" size="small">
            {t("liveTab.scheduleButton")}
          </Button>
        </div>
      </KeyboundForm>
    </Form>
  )
}

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
import { createLiveFormSchema } from "../../../../components/live-tab.js"
import {
  useSocialDashboard,
  type CreateLiveFormState,
} from "../../../../hooks/use-social-dashboard.js"
import type { SocialPlatform } from "../../../../../modules/social-commerce/types/index.js"

const CreateLiveDrawerContent = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { submitLiveSession, loading } = useSocialDashboard()

  const form = useForm<CreateLiveFormState>({
    resolver: zodResolver(createLiveFormSchema),
    defaultValues: {
      title: "",
      platform: "tiktok",
      streamUrl: "",
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    const ok = await submitLiveSession(values)
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
            name="platform"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("accountsTab.columns.platform")}</Form.Label>
                <Form.Control>
                  <Select
                    value={field.value}
                    onValueChange={(val) =>
                      field.onChange(val as SocialPlatform)
                    }
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
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="title"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("liveTab.titlePlaceholder")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    placeholder={t("liveTab.titlePlaceholder")}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="streamUrl"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("liveTab.streamUrlPlaceholder")}
                </Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    type="url"
                    placeholder={t("liveTab.streamUrlPlaceholder")}
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
              {t("liveTab.scheduleButton")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

const LiveCreateModal = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <Toaster />
      <RouteDrawer.Header>
        <Heading>{t("liveTab.scheduleButton")}</Heading>
      </RouteDrawer.Header>
      <CreateLiveDrawerContent />
    </RouteDrawer>
  )
}

export default LiveCreateModal

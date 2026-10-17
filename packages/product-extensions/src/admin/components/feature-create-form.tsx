import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm, RouteDrawer } from "@medusajs/dashboard/components"
import { Button, Input, Select } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "@medusajs/framework/zod"
import {
  type FeatureFormState,
  INITIAL_FEATURE_FORM,
} from "../hooks/use-product-ext-studio"

export const FEATURE_BADGE_COLORS = [
  "blue",
  "green",
  "purple",
  "orange",
  "red",
  "grey",
] as const

export const featureFormSchema = z.object({
  code: z.string(),
  title: z.string().min(1),
  subtitle: z.string(),
  icon_url: z.string(),
  badge_color: z.string().min(1),
})

export interface FeatureCreateFormProps {
  onSubmit: (values: FeatureFormState) => Promise<void>
  loading: boolean
}

export const FeatureCreateForm: React.FC<FeatureCreateFormProps> = ({
  onSubmit,
  loading,
}) => {
  const { t } = useTranslation()
  const form = useForm<FeatureFormState>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: INITIAL_FEATURE_FORM,
  })

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
                <Form.Label>{t("featuresTab.titleField")}</Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("featuresTab.titlePlaceholder")}
                    {...field}
                  />
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
                <Form.Label optional>
                  {t("featuresTab.subtitleField")}
                </Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("featuresTab.subtitlePlaceholder")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="icon_url"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("featuresTab.iconUrlField")}
                </Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("featuresTab.iconUrlPlaceholder")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="badge_color"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("featuresTab.badgeColorField")}</Form.Label>
                <Form.Control>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value
                        placeholder={t("featuresTab.badgeColorPlaceholder")}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {FEATURE_BADGE_COLORS.map((color) => (
                        <Select.Item key={color} value={color}>
                          {color}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
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
              {t("featuresTab.createButton")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

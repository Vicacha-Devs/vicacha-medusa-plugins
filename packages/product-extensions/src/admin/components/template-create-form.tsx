import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm, RouteDrawer } from "@medusajs/dashboard/components"
import { Button, Input, Textarea } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "@medusajs/framework/zod"
import {
  INITIAL_TEMPLATE_FORM,
  type TemplateFormState,
} from "../hooks/use-product-ext-studio"

export const templateFormSchema = z.object({
  code: z.string(),
  name: z.string().min(1),
  description: z.string(),
  category_ids_csv: z.string(),
  attribute_keys_csv: z.string(),
  section_title: z.string().min(1),
  item_title: z.string().min(1),
  item_markdown: z.string().min(1),
})

export interface TemplateCreateFormProps {
  onSubmit: (values: TemplateFormState) => Promise<void>
  loading: boolean
}

export const TemplateCreateForm: React.FC<TemplateCreateFormProps> = ({
  onSubmit,
  loading,
}) => {
  const { t } = useTranslation()
  const form = useForm<TemplateFormState>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: INITIAL_TEMPLATE_FORM,
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
            name="name"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("templatesTab.nameField")}</Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("templatesTab.namePlaceholder")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="category_ids_csv"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("templatesTab.categoryIdsField")}
                </Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("templatesTab.categoryIdsPlaceholder")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="attribute_keys_csv"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("templatesTab.attributeKeysField")}
                </Form.Label>
                <Form.Control>
                  <Input
                    placeholder={t("templatesTab.attributeKeysPlaceholder")}
                    {...field}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Field
              control={form.control}
              name="section_title"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label>{t("templatesTab.sectionTitleField")}</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="item_title"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label>{t("templatesTab.itemTitleField")}</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
          <Form.Field
            control={form.control}
            name="item_markdown"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("templatesTab.markdownField")}</Form.Label>
                <Form.Control>
                  <Textarea rows={4} {...field} />
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
              {t("templatesTab.createButton")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

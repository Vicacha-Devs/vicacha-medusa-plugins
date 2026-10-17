import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm, RouteDrawer } from "@medusajs/dashboard/components"
import { Button, Input, Select, Switch } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "@medusajs/framework/zod"
import type {
  AttributeValueType,
  UnitCode,
  UnitFamily,
} from "../../modules/product-ext/types"
import {
  type AttributeFormState,
  INITIAL_ATTRIBUTE_FORM,
} from "../hooks/use-product-ext-studio"

export const ATTRIBUTE_TYPES: AttributeValueType[] = [
  "text", "number", "boolean", "select", "multiselect", "unit", "color", "url",
]
export const UNIT_FAMILIES: UnitFamily[] = ["length", "mass", "volume", "area", "power"]
export const UNIT_CODES: UnitCode[] = [
  "mm", "cm", "m", "in", "ft", "g", "kg", "oz", "lb", "ml", "l", "fl_oz", "cm2", "m2", "in2", "w", "kw",
]

export const attributeDefinitionFormSchema = z.object({
  label: z.string().min(1),
  key: z.string(),
  description: z.string(),
  type: z.string().min(1),
  unit_family: z.string(),
  default_unit: z.string(),
  options_csv: z.string(),
  category_ids_csv: z.string(),
  is_filterable: z.boolean(),
  is_required: z.boolean(),
  is_global: z.boolean(),
})

export interface AttributeCreateFormProps {
  onSubmit: (values: AttributeFormState) => Promise<void>
  loading: boolean
}

export const AttributeCreateForm: React.FC<AttributeCreateFormProps> = ({
  onSubmit,
  loading,
}) => {
  const { t } = useTranslation()
  const form = useForm<AttributeFormState>({
    resolver: zodResolver(attributeDefinitionFormSchema),
    defaultValues: INITIAL_ATTRIBUTE_FORM,
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
            name="label"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("attributesTab.labelField")}</Form.Label>
                <Form.Control>
                  <Input placeholder={t("attributesTab.labelPlaceholder")} {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="key"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>{t("attributesTab.keyField")}</Form.Label>
                <Form.Control>
                  <Input placeholder={t("attributesTab.keyPlaceholder")} {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="type"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("attributesTab.typeField")}</Form.Label>
                <Form.Control>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <Select.Trigger><Select.Value /></Select.Trigger>
                    <Select.Content>
                      {ATTRIBUTE_TYPES.map((opt) => (
                        <Select.Item key={opt} value={opt}>{opt}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Field
              control={form.control}
              name="unit_family"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>{t("attributesTab.unitFamilyField")}</Form.Label>
                  <Form.Control>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <Select.Trigger><Select.Value /></Select.Trigger>
                      <Select.Content>
                        <Select.Item value="none">—</Select.Item>
                        {UNIT_FAMILIES.map((uf) => (
                          <Select.Item key={uf} value={uf}>{uf}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="default_unit"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label optional>{t("attributesTab.defaultUnitField")}</Form.Label>
                  <Form.Control>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <Select.Trigger><Select.Value /></Select.Trigger>
                      <Select.Content>
                        <Select.Item value="none">—</Select.Item>
                        {UNIT_CODES.map((uc) => (
                          <Select.Item key={uc} value={uc}>{uc}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              )}
            />
          </div>
          <Form.Field
            control={form.control}
            name="options_csv"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>{t("attributesTab.optionsCsvField")}</Form.Label>
                <Form.Control>
                  <Input placeholder={t("attributesTab.optionsCsvPlaceholder")} {...field} />
                </Form.Control>
              </Form.Item>
            )}
          />
          <div className="flex items-center gap-x-6 pt-2">
            <Form.Field
              control={form.control}
              name="is_filterable"
              render={({ field }: any) => (
                <Form.Item>
                  <div className="flex items-center gap-x-2">
                    <Form.Control><Switch checked={field.value} onCheckedChange={field.onChange} /></Form.Control>
                    <Form.Label>{t("attributesTab.filterableSwitch")}</Form.Label>
                  </div>
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="is_global"
              render={({ field }: any) => (
                <Form.Item>
                  <div className="flex items-center gap-x-2">
                    <Form.Control><Switch checked={field.value} onCheckedChange={field.onChange} /></Form.Control>
                    <Form.Label>{t("attributesTab.globalSwitch")}</Form.Label>
                  </div>
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">{t("header.dismiss")}</Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={loading}>{t("attributesTab.createButton")}</Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

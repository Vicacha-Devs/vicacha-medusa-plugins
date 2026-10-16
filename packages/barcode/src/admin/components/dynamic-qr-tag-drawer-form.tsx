import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  KeyboundForm,
  RouteDrawer,
} from "@medusajs/dashboard/components"
import { Button, Input, Select } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import type {
  BarcodeScanAction,
  BarcodeSymbology,
} from "../../modules/barcode/types"
import type { TagFormState } from "../hooks/use-barcode-studio"

export const tagFormSchema = z.object({
  target_id: z.string().min(1),
  label: z.string().optional(),
  symbology: z.enum([
    "qr",
    "datamatrix",
    "ean13",
    "upca",
    "code128",
    "code39",
  ]),
  scan_action: z.enum([
    "view",
    "add_to_cart",
    "verify",
    "gs1_digital_link",
  ]),
  gs1_gtin: z.string().optional(),
  batch_lot: z.string().optional(),
  serial_number: z.string().optional(),
})

export type TagFormSchemaValues = z.infer<typeof tagFormSchema>

export interface DynamicQrTagDrawerFormProps {
  defaultValues?: Partial<TagFormState>
  loading?: boolean
  onSubmit: (values: TagFormState) => Promise<void>
}

export const DynamicQrTagDrawerForm = ({
  defaultValues,
  loading = false,
  onSubmit,
}: DynamicQrTagDrawerFormProps) => {
  const { t } = useTranslation()

  const form = useForm<TagFormSchemaValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      target_id: defaultValues?.target_id ?? "prod_01",
      label: defaultValues?.label ?? "",
      symbology:
        (defaultValues?.symbology as TagFormSchemaValues["symbology"]) ?? "qr",
      scan_action:
        (defaultValues?.scan_action as TagFormSchemaValues["scan_action"]) ??
        "verify",
      gs1_gtin: defaultValues?.gs1_gtin ?? "",
      batch_lot: defaultValues?.batch_lot ?? "",
      serial_number: defaultValues?.serial_number ?? "",
    },
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            target_id: values.target_id,
            label: values.label ?? "",
            symbology: values.symbology as BarcodeSymbology,
            scan_action: values.scan_action as BarcodeScanAction,
            gs1_gtin: values.gs1_gtin ?? "",
            batch_lot: values.batch_lot ?? "",
            serial_number: values.serial_number ?? "",
          })
        )}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto p-6">
          <Form.Field
            control={form.control}
            name="target_id"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("tagsTab.targetIdPlaceholder")}</Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="label"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>{t("tagsTab.labelPlaceholder")}</Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="symbology"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("tagsTab.symbologyQr")}</Form.Label>
                <Form.Control>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="qr">
                        {t("tagsTab.symbologyQr")}
                      </Select.Item>
                      <Select.Item value="datamatrix">
                        {t("tagsTab.symbologyDatamatrix")}
                      </Select.Item>
                      <Select.Item value="ean13">
                        {t("tagsTab.symbologyEan13")}
                      </Select.Item>
                      <Select.Item value="upca">
                        {t("tagsTab.symbologyUpca")}
                      </Select.Item>
                      <Select.Item value="code128">
                        {t("tagsTab.symbologyCode128")}
                      </Select.Item>
                      <Select.Item value="code39">
                        {t("tagsTab.symbologyCode39")}
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
            name="scan_action"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label>{t("tagsTab.actionVerify")}</Form.Label>
                <Form.Control>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="view">
                        {t("tagsTab.actionView")}
                      </Select.Item>
                      <Select.Item value="add_to_cart">
                        {t("tagsTab.actionAddToCart")}
                      </Select.Item>
                      <Select.Item value="verify">
                        {t("tagsTab.actionVerify")}
                      </Select.Item>
                      <Select.Item value="gs1_digital_link">
                        {t("tagsTab.actionDigitalLink")}
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
            name="gs1_gtin"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("tagsTab.gs1GtinPlaceholder")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="batch_lot"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("tagsTab.batchLotPlaceholder")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="serial_number"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Label optional>
                  {t("tagsTab.serialNumberPlaceholder")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} />
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
              {t("tagsTab.generateButton")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}

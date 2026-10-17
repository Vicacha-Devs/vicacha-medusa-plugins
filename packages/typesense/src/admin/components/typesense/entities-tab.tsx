import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm, SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Switch,
  Text,
} from "@medusajs/ui"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

const entityConfigSchema = z.object({
  entityKey: z.string().min(1),
  graphEntity: z.string(),
  graphFieldsStr: z.string(),
  queryByStr: z.string().min(1),
  facetByStr: z.string(),
  enableEmbedder: z.boolean(),
  embedderModel: z.string(),
})

export type EntityConfigFormValues = z.infer<typeof entityConfigSchema>

export interface EntitiesTabProps {
  entityKey: string
  setEntityKey: (val: string) => void
  graphEntity: string
  setGraphEntity: (val: string) => void
  graphFieldsStr: string
  setGraphFieldsStr: (val: string) => void
  queryByStr: string
  setQueryByStr: (val: string) => void
  facetByStr: string
  setFacetByStr: (val: string) => void
  enableEmbedder: boolean
  setEnableEmbedder: (val: boolean) => void
  embedderModel: string
  setEmbedderModel: (val: string) => void
  saving?: boolean
  onSaveEntityConfig: (
    eOrValues?: React.FormEvent | EntityConfigFormValues
  ) => void
}

const EMBEDDER_MODELS = [
  { value: "ts/all-MiniLM-L6-v2", labelKey: "entities.modelMiniLM" },
  { value: "ts/e5-small", labelKey: "entities.modelE5Small" },
  { value: "ts/multilingual-e5-small", labelKey: "entities.modelMultilingualE5" },
  { value: "openai/text-embedding-3-small", labelKey: "entities.modelOpenAISmall" },
  { value: "openai/text-embedding-3-large", labelKey: "entities.modelOpenAILarge" },
] as const

export const EntitiesTab: React.FC<EntitiesTabProps> = (props) => {
  const { t } = useTranslation()
  const {
    entityKey,
    setEntityKey,
    graphEntity,
    setGraphEntity,
    graphFieldsStr,
    setGraphFieldsStr,
    queryByStr,
    setQueryByStr,
    facetByStr,
    setFacetByStr,
    enableEmbedder,
    setEnableEmbedder,
    embedderModel,
    setEmbedderModel,
    saving = false,
    onSaveEntityConfig,
  } = props

  const form = useForm<EntityConfigFormValues>({
    resolver: zodResolver(entityConfigSchema),
    defaultValues: { entityKey, graphEntity, graphFieldsStr, queryByStr, facetByStr, enableEmbedder, embedderModel },
  })

  useEffect(() => {
    form.reset({ entityKey, graphEntity, graphFieldsStr, queryByStr, facetByStr, enableEmbedder, embedderModel })
  }, [entityKey, graphEntity, graphFieldsStr, queryByStr, facetByStr, enableEmbedder, embedderModel, form])

  const textFields = [
    { name: "entityKey" as const, label: "entities.entityKeyLabel", ph: "entities.entityKeyPlaceholder", set: setEntityKey },
    { name: "graphEntity" as const, label: "entities.graphEntityLabel", ph: "entities.graphEntityPlaceholder", set: setGraphEntity },
    { name: "graphFieldsStr" as const, label: "entities.graphFieldsLabel", set: setGraphFieldsStr },
    { name: "queryByStr" as const, label: "entities.queryByLabel", set: setQueryByStr },
    { name: "facetByStr" as const, label: "entities.facetByLabel", optional: true, set: setFacetByStr },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("entities.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("entities.subtitle")}
        </Text>
      </div>

      <Form {...form}>
        <KeyboundForm
          onSubmit={form.handleSubmit((vals) => onSaveEntityConfig(vals))}
          className="divide-y"
        >
          <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
            {textFields.map((tf) => (
              <Form.Field
                key={tf.name}
                control={form.control}
                name={tf.name}
                render={({ field }: any) => (
                  <Form.Item>
                    <Form.Label optional={tf.optional}>{t(tf.label)}</Form.Label>
                    <Form.Control>
                      <Input
                        placeholder={tf.ph ? t(tf.ph) : undefined}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          tf.set(e.target.value)
                        }}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            ))}

            <div className="flex flex-col justify-end gap-y-3">
              <Form.Field
                control={form.control}
                name="enableEmbedder"
                render={({ field }: any) => (
                  <Form.Item>
                    <div className="flex items-center gap-x-2">
                      <Form.Control>
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            setEnableEmbedder(checked)
                          }}
                        />
                      </Form.Control>
                      <Form.Label>{t("entities.enableEmbedderLabel")}</Form.Label>
                    </div>
                  </Form.Item>
                )}
              />

              {enableEmbedder && (
                <Form.Field
                  control={form.control}
                  name="embedderModel"
                  render={({ field }: any) => (
                    <Form.Item>
                      <Form.Control>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val)
                            setEmbedderModel(val)
                          }}
                        >
                          <Select.Trigger>
                            <Select.Value placeholder={t("entities.selectEmbedderPlaceholder")} />
                          </Select.Trigger>
                          <Select.Content>
                            {EMBEDDER_MODELS.map((m) => (
                              <Select.Item key={m.value} value={m.value}>
                                {t(m.labelKey)}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              )}
            </div>
          </div>

          <SectionRow
            title={t("entities.entityKeyLabel")}
            value={<Badge size="xsmall" color="grey">{entityKey || "—"}</Badge>}
          />

          <div className="flex items-center justify-end px-6 py-4">
            <Button type="submit" variant="primary" size="small" isLoading={saving}>
              {t("entities.saveButton")}
            </Button>
          </div>
        </KeyboundForm>
      </Form>
    </Container>
  )
}

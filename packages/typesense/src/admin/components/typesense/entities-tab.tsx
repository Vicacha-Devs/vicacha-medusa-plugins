import {
  Button,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

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
  onSaveEntityConfig: (e: React.FormEvent) => void
}

export const EntitiesTab: React.FC<EntitiesTabProps> = ({
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
  onSaveEntityConfig,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-6">
      <div className="border-ui-border-base rounded-lg border p-4">
        <Heading level="h2" className="mb-1">
          {t("entities.title")}
        </Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">
          {t("entities.subtitle")}
        </Text>

        <form
          onSubmit={onSaveEntityConfig}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <Label htmlFor="entity-key">{t("entities.entityKeyLabel")}</Label>
            <Input
              id="entity-key"
              placeholder={t("entities.entityKeyPlaceholder")}
              value={entityKey}
              onChange={(e) => setEntityKey(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="graph-entity">
              {t("entities.graphEntityLabel")}
            </Label>
            <Input
              id="graph-entity"
              placeholder={t("entities.graphEntityPlaceholder")}
              value={graphEntity}
              onChange={(e) => setGraphEntity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="graph-fields">
              {t("entities.graphFieldsLabel")}
            </Label>
            <Input
              id="graph-fields"
              value={graphFieldsStr}
              onChange={(e) => setGraphFieldsStr(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="query-by">{t("entities.queryByLabel")}</Label>
            <Input
              id="query-by"
              value={queryByStr}
              onChange={(e) => setQueryByStr(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="facet-by">{t("entities.facetByLabel")}</Label>
            <Input
              id="facet-by"
              value={facetByStr}
              onChange={(e) => setFacetByStr(e.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end gap-y-2">
            <div className="flex items-center gap-x-2">
              <Switch
                id="enable-embedder"
                checked={enableEmbedder}
                onCheckedChange={setEnableEmbedder}
              />
              <Label htmlFor="enable-embedder">
                {t("entities.enableEmbedderLabel")}
              </Label>
            </div>
            {enableEmbedder && (
              <Select value={embedderModel} onValueChange={setEmbedderModel}>
                <Select.Trigger>
                  <Select.Value
                    placeholder={t("entities.selectEmbedderPlaceholder")}
                  />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="ts/all-MiniLM-L6-v2">
                    {t("entities.modelMiniLM")}
                  </Select.Item>
                  <Select.Item value="ts/e5-small">
                    {t("entities.modelE5Small")}
                  </Select.Item>
                  <Select.Item value="ts/multilingual-e5-small">
                    {t("entities.modelMultilingualE5")}
                  </Select.Item>
                  <Select.Item value="openai/text-embedding-3-small">
                    {t("entities.modelOpenAISmall")}
                  </Select.Item>
                  <Select.Item value="openai/text-embedding-3-large">
                    {t("entities.modelOpenAILarge")}
                  </Select.Item>
                </Select.Content>
              </Select>
            )}
          </div>

          <div className="md:col-span-2">
            <Button type="submit" variant="primary" size="small">
              {t("entities.saveButton")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

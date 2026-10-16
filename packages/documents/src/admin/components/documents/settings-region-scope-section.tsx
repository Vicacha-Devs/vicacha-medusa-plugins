import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

interface RegionItem {
  id: string
  name: string
}

interface SettingsRegionScopeSectionProps {
  regions: RegionItem[]
  selectedRegionId: string
  setSelectedRegionId: (id: string) => void
  isRegionalOverride: boolean
  saving: boolean
  onResetRegionalOverride: () => void
}

export const SettingsRegionScopeSection: React.FC<
  SettingsRegionScopeSectionProps
> = ({
  regions,
  selectedRegionId,
  setSelectedRegionId,
  isRegionalOverride,
  saving,
  onResetRegionalOverride,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("settings.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("settings.subtitle")}
          </Text>
        </div>
      </div>

      <SectionRow
        title={t("settings.regionScopePlaceholder")}
        value={
          <Select
            size="small"
            value={selectedRegionId}
            onValueChange={setSelectedRegionId}
          >
            <Select.Trigger>
              <Select.Value
                placeholder={t("settings.regionScopePlaceholder")}
              />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="global">
                {t("settings.globalDefault")}
              </Select.Item>
              {regions.map((r) => (
                <Select.Item key={r.id} value={r.id}>
                  {t("settings.regionPrefix", { name: r.name })}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        }
      />

      {selectedRegionId !== "global" && (
        <SectionRow
          title={t("hub.colStatus")}
          value={
            <div className="flex items-center gap-2">
              <Badge size="xsmall" color={isRegionalOverride ? "blue" : "grey"}>
                {isRegionalOverride
                  ? t("settings.regionalOverrideBadge")
                  : t("settings.inheritsGlobalBadge")}
              </Badge>
              {isRegionalOverride && (
                <Button
                  size="small"
                  type="button"
                  variant="secondary"
                  onClick={onResetRegionalOverride}
                >
                  {t("settings.resetToGlobal")}
                </Button>
              )}
            </div>
          }
        />
      )}

      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <Button
          size="small"
          type="button"
          variant="secondary"
          onClick={() => navigate("/documents")}
        >
          {t("settings.backToHub")}
        </Button>
        <Button
          size="small"
          type="submit"
          variant="primary"
          isLoading={saving}
        >
          {t("settings.saveButton")}
        </Button>
      </div>
    </Container>
  )
}

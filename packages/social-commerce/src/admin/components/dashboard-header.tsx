import { useEffect } from "react"
import { Button, Heading, Select, Text, Toaster, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface DashboardHeaderProps {
  platformFilter: string
  onPlatformFilterChange: (value: string) => void
  onSyncNow: () => void
  statusMessage?: string | null
  errorMessage?: string | null
}

export const DashboardHeader = ({
  platformFilter,
  onPlatformFilterChange,
  onSyncNow,
  statusMessage,
  errorMessage,
}: DashboardHeaderProps) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (statusMessage) {
      toast.success(statusMessage)
    }
  }, [statusMessage])

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage)
    }
  }, [errorMessage])

  return (
    <>
      <Toaster />
      <div className="flex flex-col gap-y-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading className="font-sans font-medium h1-core">
            {t("header.title")}
          </Heading>
          <Text className="text-ui-fg-subtle mt-1">
            {t("header.subtitle")}
          </Text>
        </div>

        <div className="flex items-center gap-x-2">
          <div className="w-44">
            <Select
              value={platformFilter}
              onValueChange={onPlatformFilterChange}
            >
              <Select.Trigger aria-label={t("header.platformFilterAria")}>
                <Select.Value placeholder={t("header.platforms.all")} />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">
                  {t("header.platforms.all")}
                </Select.Item>
                <Select.Item value="tiktok">
                  {t("header.platforms.tiktok")}
                </Select.Item>
                <Select.Item value="instagram">
                  {t("header.platforms.instagram")}
                </Select.Item>
                <Select.Item value="facebook">
                  {t("header.platforms.facebook")}
                </Select.Item>
                <Select.Item value="local">
                  {t("header.platforms.local")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>

          <Button
            type="button"
            variant="primary"
            size="small"
            onClick={onSyncNow}
          >
            {t("header.syncNow")}
          </Button>
        </div>
      </div>
    </>
  )
}


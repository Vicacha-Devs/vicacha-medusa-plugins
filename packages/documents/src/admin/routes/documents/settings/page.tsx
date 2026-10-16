import React, { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import {
  Form,
  KeyboundForm,
  LayoutComposer,
} from "@medusajs/dashboard/components"
import { CogSixTooth } from "@medusajs/icons"
import { toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  useDocumentRegions,
  useDocumentSettings,
  useResetRegionalDocumentSettings,
  useUpdateDocumentSettings,
} from "../../../../hooks"
import {
  DEFAULT_SETTINGS_VALUES,
  documentSettingsFormSchema,
  type DocumentSettingsFormValues,
  SettingsAutomationSection,
  SettingsCompanySection,
  SettingsNumberingSection,
  SettingsPreviewSection,
  SettingsRegionScopeSection,
} from "../../../components/documents"

const DocumentsSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [selectedRegionId, setSelectedRegionId] = useState<string>("global")
  const [isRegionalOverride, setIsRegionalOverride] = useState<boolean>(false)

  const form = useForm<DocumentSettingsFormValues>({
    resolver: zodResolver(documentSettingsFormSchema),
    defaultValues: DEFAULT_SETTINGS_VALUES,
  })
  const settings = form.watch()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const { data: regionsData } = useDocumentRegions()
  const regions = regionsData?.regions || []

  const { data: settingsData } = useDocumentSettings(selectedRegionId, {
    onError: () => {
      toast.error(t("settings.messages.loadError"))
    },
  })

  useEffect(() => {
    if (settingsData) {
      form.reset({
        ...DEFAULT_SETTINGS_VALUES,
        ...(settingsData.settings || {}),
      })
      setIsRegionalOverride(Boolean(settingsData.is_regional_override))
    }
  }, [settingsData, form])

  const updateSettingsMutation = useUpdateDocumentSettings()
  const resetSettingsMutation = useResetRegionalDocumentSettings()
  const saving = updateSettingsMutation.isPending

  const handleSave = form.handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        region_id: selectedRegionId === "global" ? null : selectedRegionId,
      }
      const json = await updateSettingsMutation.mutateAsync(payload)
      form.reset({
        ...DEFAULT_SETTINGS_VALUES,
        ...(json.settings || {}),
      })
      setIsRegionalOverride(Boolean(json.is_regional_override))
      toast.success(
        selectedRegionId === "global"
          ? t("settings.messages.savedGlobal")
          : t("settings.messages.savedRegional")
      )
    } catch (err: any) {
      toast.error(err.message || t("settings.messages.saveError"))
    }
  })

  const handleResetRegionalOverride = async () => {
    if (selectedRegionId === "global") return
    try {
      await resetSettingsMutation.mutateAsync({ regionId: selectedRegionId })
      toast.success(t("settings.messages.resetSuccess"))
    } catch {
      toast.error(t("settings.messages.resetError"))
    }
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"}>
      <Form {...form}>
        <KeyboundForm
          onSubmit={handleSave}
          className="flex flex-col gap-y-4"
        >
          <LayoutComposer
            widgetsZonePrefix="documents.settings"
            preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
            data={settings as any}
            sections={{
              main: (
                <>
                  <LayoutComposer.Entry id="SettingsCompanySection">
                    <SettingsCompanySection form={form} />
                  </LayoutComposer.Entry>
                  <LayoutComposer.Entry id="SettingsNumberingSection">
                    <SettingsNumberingSection form={form} />
                  </LayoutComposer.Entry>
                  <LayoutComposer.Entry id="SettingsPreviewSection">
                    <SettingsPreviewSection
                      defaultLocale={settings.default_locale || "en"}
                      selectedRegionId={selectedRegionId}
                    />
                  </LayoutComposer.Entry>
                </>
              ),
              side: (
                <>
                  <LayoutComposer.Entry id="SettingsRegionScopeSection">
                    <SettingsRegionScopeSection
                      regions={regions}
                      selectedRegionId={selectedRegionId}
                      setSelectedRegionId={setSelectedRegionId}
                      isRegionalOverride={isRegionalOverride}
                      saving={saving}
                      onResetRegionalOverride={() =>
                        void handleResetRegionalOverride()
                      }
                    />
                  </LayoutComposer.Entry>
                  <LayoutComposer.Entry id="SettingsAutomationSection">
                    <SettingsAutomationSection form={form} />
                  </LayoutComposer.Entry>
                </>
              ),
            }}
          />
        </KeyboundForm>
      </Form>
    </div>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("settings.title")
}

export const config = defineRouteConfig({
  label: "settings.title",
  icon: CogSixTooth,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default DocumentsSettingsPage

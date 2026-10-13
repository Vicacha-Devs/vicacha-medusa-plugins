import React, { useEffect, useState } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Textarea,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  useDocumentRegions,
  useDocumentSettings,
  useResetRegionalDocumentSettings,
  useUpdateDocumentSettings,
} from "../../../../hooks"
import { documentsAdminSdk } from "../../../../sdk"
import {
  type DocumentType,
  SUPPORTED_LOCALES,
} from "../../../../modules/documents/types"
import { formatDocumentNumber } from "../../../../modules/documents/utils/numbering"
import { SUPPORTED_UI_LOCALES } from "../../../components/documents/constants"

const DocumentsSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [selectedRegionId, setSelectedRegionId] = useState<string>("global")
  const [isRegionalOverride, setIsRegionalOverride] = useState<boolean>(false)
  const [settings, setSettings] = useState<Record<string, any>>({
    company_name: "My Store",
    company_address: "",
    company_tax_id: "",
    company_email: "",
    company_phone: "",
    company_logo: "",
    bank_details: "",
    invoice_prefix: "INV",
    invoice_number_format: "INV-{year}-{number}",
    next_invoice_number: 1,
    invoice_forced_next_number: null,
    packing_slip_prefix: "PS",
    packing_slip_number_format: "PS-{year}-{number}",
    next_packing_slip_number: 1,
    credit_note_prefix: "CN",
    credit_note_number_format: "CN-{year}-{number}",
    next_credit_note_number: 1,
    receipt_prefix: "RCP",
    receipt_number_format: "RCP-{year}-{number}",
    next_receipt_number: 1,
    invoice_template: "clean",
    packing_slip_template: "packing_slip",
    credit_note_template: "credit_note",
    receipt_template: "pos_80mm",
    primary_color: "#18181b",
    secondary_color: "#71717a",
    default_locale: "en",
    notes: "",
    footer_text: "",
    auto_generate_invoice: true,
    auto_generate_packing_slip: false,
    auto_generate_credit_note: true,
    auto_generate_receipt: false,
    auto_email_invoice: false,
    auto_email_packing_slip: false,
    auto_email_credit_note: false,
    auto_email_receipt: false,
    require_signature: false,
    docuseal_template_id: "",
    signature_role: "Customer",
  })

  const [previewDocType, setPreviewDocType] = useState<DocumentType>("invoice")
  const [previewOrderId, setPreviewOrderId] = useState<string>("")
  const [previewStressTest, setPreviewStressTest] = useState<boolean>(false)

  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").split(
    /[-_]/
  )[0]
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
      setSettings((prev) => ({ ...prev, ...(settingsData.settings || {}) }))
      setIsRegionalOverride(Boolean(settingsData.is_regional_override))
    }
  }, [settingsData])

  const updateSettingsMutation = useUpdateDocumentSettings()
  const resetSettingsMutation = useResetRegionalDocumentSettings()
  const saving = updateSettingsMutation.isPending

  const updateField = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...settings,
        region_id: selectedRegionId === "global" ? null : selectedRegionId,
      }
      const json = await updateSettingsMutation.mutateAsync(payload)
      setSettings(json.settings)
      setIsRegionalOverride(Boolean(json.is_regional_override))
      toast.success(
        selectedRegionId === "global"
          ? t("settings.messages.savedGlobal")
          : t("settings.messages.savedRegional")
      )
    } catch (err: any) {
      toast.error(err.message || t("settings.messages.saveError"))
    }
  }

  const handleResetRegionalOverride = async () => {
    if (selectedRegionId === "global") return
    try {
      await resetSettingsMutation.mutateAsync({ regionId: selectedRegionId })
      toast.success(t("settings.messages.resetSuccess"))
    } catch {
      toast.error(t("settings.messages.resetError"))
    }
  }

  const previewUrl = documentsAdminSdk.getPreviewPdfUrl({
    document_type: previewDocType,
    locale: settings.default_locale || "en",
    items: previewStressTest ? "75" : "4",
    region_id: selectedRegionId !== "global" ? selectedRegionId : undefined,
    order_id: previewOrderId.trim() || undefined,
  })

  const sampleInvoiceNumber = formatDocumentNumber(
    settings.invoice_number_format,
    {
      number: Number(
        settings.invoice_forced_next_number || settings.next_invoice_number || 1
      ),
      prefix: settings.invoice_prefix || "INV",
      order_display_id: 1042,
    },
    Number(settings.invoice_number_padding || 5)
  )

  return (
    <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header & Per-Region Selector (Phase 4) */}
      <Container className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Heading level="h1">{t("settings.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("settings.subtitle")}
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <Select
                size="small"
                value={currentLang}
                onValueChange={(lng) => void i18n.changeLanguage(lng)}
              >
                <Select.Trigger aria-label={t("hub.languageLabel")}>
                  <Select.Value placeholder={t("hub.languageLabel")} />
                </Select.Trigger>
                <Select.Content>
                  {SUPPORTED_UI_LOCALES.map((loc) => (
                    <Select.Item key={loc.code} value={loc.code}>
                      {loc.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

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

            {selectedRegionId !== "global" && (
              <Badge color={isRegionalOverride ? "blue" : "grey"}>
                {isRegionalOverride
                  ? t("settings.regionalOverrideBadge")
                  : t("settings.inheritsGlobalBadge")}
              </Badge>
            )}

            {selectedRegionId !== "global" && isRegionalOverride && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => void handleResetRegionalOverride()}
              >
                {t("settings.resetToGlobal")}
              </Button>
            )}

            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                window.location.href = "/app/documents"
              }}
            >
              {t("settings.backToHub")}
            </Button>

            <Button
              size="small"
              variant="primary"
              isLoading={saving}
              onClick={() => void handleSave()}
            >
              {t("settings.saveButton")}
            </Button>
          </div>
        </div>
      </Container>

      {/* Company Identity & Branding */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">
          {t("settings.companySectionTitle")}
        </Heading>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label size="small">{t("settings.companyName")}</Label>
            <Input
              size="small"
              value={settings.company_name || ""}
              onChange={(e) => updateField("company_name", e.target.value)}
            />
          </div>
          <div>
            <Label size="small">{t("settings.taxId")}</Label>
            <Input
              size="small"
              value={settings.company_tax_id || ""}
              onChange={(e) => updateField("company_tax_id", e.target.value)}
            />
          </div>
          <div>
            <Label size="small">{t("settings.defaultLocale")}</Label>
            <Select
              size="small"
              value={settings.default_locale || "en"}
              onValueChange={(v) => updateField("default_locale", v)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {SUPPORTED_LOCALES.map((loc) => (
                  <Select.Item key={loc} value={loc}>
                    {loc.toUpperCase()}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label size="small">{t("settings.companyAddress")}</Label>
            <Input
              size="small"
              value={settings.company_address || ""}
              onChange={(e) => updateField("company_address", e.target.value)}
            />
          </div>
          <div>
            <Label size="small">{t("settings.logoUrl")}</Label>
            <Input
              size="small"
              placeholder="https://..."
              value={settings.company_logo || ""}
              onChange={(e) => updateField("company_logo", e.target.value)}
            />
          </div>
          <div>
            <Label size="small">{t("settings.primaryColor")}</Label>
            <Input
              size="small"
              value={settings.primary_color || "#18181b"}
              onChange={(e) => updateField("primary_color", e.target.value)}
            />
          </div>
          <div>
            <Label size="small">{t("settings.invoicePreset")}</Label>
            <Select
              size="small"
              value={settings.invoice_template || "clean"}
              onValueChange={(v) => updateField("invoice_template", v)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="clean">
                  {t("settings.presetClean")}
                </Select.Item>
                <Select.Item value="classic">
                  {t("settings.presetClassic")}
                </Select.Item>
                <Select.Item value="compact">
                  {t("settings.presetCompact")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label size="small">{t("settings.posWidthPreset")}</Label>
            <Select
              size="small"
              value={settings.receipt_template || "pos_80mm"}
              onValueChange={(v) => updateField("receipt_template", v)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="pos_80mm">
                  {t("settings.pos80mm")}
                </Select.Item>
                <Select.Item value="pos_58mm">
                  {t("settings.pos58mm")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label size="small">{t("settings.documentNotes")}</Label>
            <Textarea
              rows={3}
              value={settings.notes || ""}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
          <div>
            <Label size="small">{t("settings.bankDetails")}</Label>
            <Textarea
              rows={3}
              value={settings.bank_details || ""}
              onChange={(e) => updateField("bank_details", e.target.value)}
            />
          </div>
        </div>
      </Container>

      {/* Numbering Sequences (Phase 1.1) */}
      <Container className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Heading level="h2">{t("settings.numberingSectionTitle")}</Heading>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("settings.numberingTokensHint")}
            </Text>
          </div>
          <Badge color="green">
            {t("settings.nextInvoicePreview", { sample: sampleInvoiceNumber })}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label size="small">{t("settings.invoiceFormat")}</Label>
            <Input
              size="small"
              value={settings.invoice_number_format || "INV-{year}-{number}"}
              onChange={(e) =>
                updateField("invoice_number_format", e.target.value)
              }
            />
          </div>
          <div>
            <Label size="small">{t("settings.forcedNextInvoice")}</Label>
            <Input
              size="small"
              type="number"
              placeholder={String(settings.next_invoice_number || 1)}
              value={settings.invoice_forced_next_number ?? ""}
              onChange={(e) =>
                updateField(
                  "invoice_forced_next_number",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            />
          </div>
          <div>
            <Label size="small">{t("settings.packingSlipFormat")}</Label>
            <Input
              size="small"
              value={
                settings.packing_slip_number_format || "PS-{year}-{number}"
              }
              onChange={(e) =>
                updateField("packing_slip_number_format", e.target.value)
              }
            />
          </div>
          <div>
            <Label size="small">{t("settings.creditNoteFormat")}</Label>
            <Input
              size="small"
              value={settings.credit_note_number_format || "CN-{year}-{number}"}
              onChange={(e) =>
                updateField("credit_note_number_format", e.target.value)
              }
            />
          </div>
        </div>
      </Container>

      {/* Automation, Email & Optional Docuseal Toggles */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">
          {t("settings.automationSectionTitle")}
        </Heading>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between rounded border p-3">
            <Label size="small">{t("settings.autoGenerateInvoice")}</Label>
            <Switch
              checked={Boolean(settings.auto_generate_invoice)}
              onCheckedChange={(v) => updateField("auto_generate_invoice", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label size="small">{t("settings.autoGeneratePackingSlip")}</Label>
            <Switch
              checked={Boolean(settings.auto_generate_packing_slip)}
              onCheckedChange={(v) =>
                updateField("auto_generate_packing_slip", v)
              }
            />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label size="small">{t("settings.autoGenerateCreditNote")}</Label>
            <Switch
              checked={Boolean(settings.auto_generate_credit_note)}
              onCheckedChange={(v) =>
                updateField("auto_generate_credit_note", v)
              }
            />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label size="small">{t("settings.autoEmailInvoice")}</Label>
            <Switch
              checked={Boolean(settings.auto_email_invoice)}
              onCheckedChange={(v) => updateField("auto_email_invoice", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label size="small">{t("settings.autoEmailCreditNote")}</Label>
            <Switch
              checked={Boolean(settings.auto_email_credit_note)}
              onCheckedChange={(v) => updateField("auto_email_credit_note", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label size="small">{t("settings.includeSignature")}</Label>
            <Switch
              checked={Boolean(settings.require_signature)}
              onCheckedChange={(v) => updateField("require_signature", v)}
            />
          </div>
        </div>
      </Container>

      {/* Live Order & Stress-Test PDF Preview (Phase 8.2) */}
      <Container className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Heading level="h2">{t("settings.previewSectionTitle")}</Heading>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("settings.previewSubtitle")}
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              size="small"
              value={previewDocType}
              onValueChange={(v) => setPreviewDocType(v as DocumentType)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="invoice">
                  {t("settings.previewTypePrefix", {
                    type: t("types.invoice"),
                  })}
                </Select.Item>
                <Select.Item value="packing_slip">
                  {t("settings.previewTypePrefix", {
                    type: t("types.packing_slip"),
                  })}
                </Select.Item>
                <Select.Item value="credit_note">
                  {t("settings.previewTypePrefix", {
                    type: t("types.credit_note"),
                  })}
                </Select.Item>
                <Select.Item value="receipt">
                  {t("settings.previewTypePrefix", {
                    type: t("types.receipt"),
                  })}
                </Select.Item>
              </Select.Content>
            </Select>

            <Input
              size="small"
              placeholder={t("settings.previewOrderPlaceholder")}
              value={previewOrderId}
              onChange={(e) => setPreviewOrderId(e.target.value)}
            />

            <Button
              size="small"
              variant="secondary"
              onClick={() => setPreviewStressTest((v) => !v)}
            >
              {previewStressTest
                ? t("settings.standardItemsButton")
                : t("settings.stressTestItemsButton")}
            </Button>

            <Button
              size="small"
              variant="secondary"
              onClick={() => window.open(previewUrl, "_blank")}
            >
              {t("settings.openFullPdf")}
            </Button>
          </div>
        </div>

        <iframe
          title={t("settings.previewSectionTitle")}
          src={previewUrl}
          className="h-[560px] w-full rounded border border-ui-border-base bg-ui-bg-subtle"
        />
      </Container>
    </div>
  )
}

export default DocumentsSettingsPage

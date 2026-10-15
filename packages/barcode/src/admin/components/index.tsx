import * as React from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type {
  BarcodeLookupChainResult,
  BarcodeScanAction,
  BarcodeSymbology,
  EnrichmentStrategy,
  LabelPrintOutput,
  LabelTemplateSpec,
} from "../../modules/barcode/types"
import { BarcodeImage } from "../../ui"
import type {
  CountSessionFormState,
  LookupFormState,
  PrintFormState,
  TagFormState,
} from "../hooks/use-barcode-studio"
import { SUPPORTED_UI_LOCALES } from "../i18n"

export interface BarcodeStudioHeaderProps {
  overview: Record<string, unknown>
  lastScanned: string | null
  bannerMessage: string | null
  bannerTone: "success" | "error"
  onDismissBanner: () => void
  onRefresh: () => void
  onBulkGenerate: () => void
}

export const BarcodeStudioHeader = ({
  overview,
  lastScanned,
  bannerMessage,
  bannerTone,
  onDismissBanner,
  onRefresh,
  onBulkGenerate,
}: BarcodeStudioHeaderProps) => {
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").split(
    /[-_]/
  )[0]

  const providers = Array.isArray(overview.active_providers)
    ? (overview.active_providers as string[])
    : []

  return (
    <Container className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h1">{t("header.title")}</Heading>
            <Badge color="green">{t("header.providersBadge")}</Badge>
            {lastScanned ? (
              <Badge color="blue">
                {t("header.lastHidScan", { code: lastScanned })}
              </Badge>
            ) : null}
          </div>
          <Text className="text-ui-fg-subtle mt-1">{t("header.subtitle")}</Text>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select
              value={currentLang}
              onValueChange={(lng) => void i18n.changeLanguage(lng)}
            >
              <Select.Trigger aria-label={t("header.languageLabel")}>
                <Select.Value placeholder={t("header.languageLabel")} />
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
          <Button variant="secondary" size="small" onClick={onBulkGenerate}>
            {t("header.bulkGenerateButton")}
          </Button>
          <Button variant="secondary" size="small" onClick={onRefresh}>
            {t("header.refreshButton")}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border p-3">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("header.linkedProductsStat")}
          </Text>
          <Heading level="h2">
            {String(overview.total_barcode_products ?? 0)}
          </Heading>
        </div>
        <div className="rounded-lg border p-3">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("header.dynamicTagsStat")}
          </Text>
          <Heading level="h2">
            {String(overview.total_barcode_tags ?? 0)}
          </Heading>
        </div>
        <div className="rounded-lg border p-3">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("header.totalScansStat")}
          </Text>
          <Heading level="h2">{String(overview.total_tag_scans ?? 0)}</Heading>
        </div>
        <div className="rounded-lg border p-3">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("header.cachedLookupsStat")}
          </Text>
          <Heading level="h2">
            {String(overview.total_cached_lookups ?? 0)} (
            {String(overview.total_cache_hits ?? 0)})
          </Heading>
        </div>
        <div className="rounded-lg border p-3">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("header.activeProvidersStat")}
          </Text>
          <Heading level="h2">{providers.length}</Heading>
        </div>
      </div>

      {bannerMessage ? (
        <div
          className={`mt-4 flex items-center justify-between rounded-md border px-4 py-2 text-sm ${
            bannerTone === "error"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          <span>{bannerMessage}</span>
          <Button variant="transparent" size="small" onClick={onDismissBanner}>
            {t("header.dismiss")}
          </Button>
        </div>
      ) : null}
    </Container>
  )
}

export interface GtinLookupTabProps {
  form: LookupFormState
  onFormChange: React.Dispatch<React.SetStateAction<LookupFormState>>
  lookupResult: BarcodeLookupChainResult | null
  barcodes: Array<Record<string, unknown>>
  onLookup: () => void
  onCreateProduct: () => void
  onBatchImport: () => void
}

export const GtinLookupTab = ({
  form,
  onFormChange,
  lookupResult,
  barcodes,
  onLookup,
  onCreateProduct,
  onBatchImport,
}: GtinLookupTabProps) => {
  const { t } = useTranslation()

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Container className="p-5">
        <Heading level="h2">{t("lookupTab.lookupTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("lookupTab.lookupSubtitle")}
        </Text>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={form.barcode}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, barcode: e.target.value }))
              }
              placeholder={t("lookupTab.barcodePlaceholder")}
            />
            <select
              value={form.strategy}
              onChange={(e) =>
                onFormChange((prev) => ({
                  ...prev,
                  strategy: e.target.value as EnrichmentStrategy,
                }))
              }
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="first-hit">
                {t("lookupTab.strategyFirstHit")}
              </option>
              <option value="deep-merge">
                {t("lookupTab.strategyDeepMerge")}
              </option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="small" onClick={onLookup}>
              {t("lookupTab.lookupOnlyButton")}
            </Button>
            <Button variant="primary" size="small" onClick={onCreateProduct}>
              {t("lookupTab.lookupAndCreateButton", { status: form.status })}
            </Button>
          </div>

          {lookupResult ? (
            <div className="mt-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Heading level="h3">
                  {lookupResult.product?.name ||
                    t("lookupTab.normalizedFallback", {
                      barcode: lookupResult.barcode,
                    })}
                </Heading>
                <Badge color={lookupResult.found ? "green" : "orange"}>
                  {lookupResult.found
                    ? t("lookupTab.matchedVia", {
                        provider: lookupResult.product?.provider ?? "",
                      })
                    : t("lookupTab.notFound")}
                </Badge>
              </div>
              <Text size="small" className="text-ui-fg-subtle mt-1">
                {t("lookupTab.resultDetails", {
                  symbology: lookupResult.parsed.type.toUpperCase(),
                  valid: lookupResult.parsed.isValid
                    ? t("lookupTab.yes")
                    : t("lookupTab.no"),
                  brand: lookupResult.product?.brand || t("lookupTab.na"),
                })}
              </Text>
              <div className="mt-3">
                <BarcodeImage
                  code={lookupResult.barcode}
                  symbology={lookupResult.parsed.type}
                />
              </div>
            </div>
          ) : null}
        </div>
      </Container>

      <Container className="p-5">
        <Heading level="h2">{t("lookupTab.batchTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("lookupTab.batchSubtitle")}
        </Text>
        <textarea
          rows={4}
          value={form.batchInput}
          onChange={(e) =>
            onFormChange((prev) => ({ ...prev, batchInput: e.target.value }))
          }
          className="mt-3 w-full rounded-md border p-2 font-mono text-xs"
        />
        <div className="mt-2">
          <Button variant="secondary" size="small" onClick={onBatchImport}>
            {t("lookupTab.batchRunButton")}
          </Button>
        </div>

        <div className="mt-5">
          <Heading level="h3">
            {t("lookupTab.recentlyLinkedTitle", { count: barcodes.length })}
          </Heading>
          <div className="mt-2 max-h-48 overflow-y-auto rounded border">
            {barcodes.length === 0 ? (
              <div className="p-3 text-xs text-gray-500">
                {t("lookupTab.noLinkedProducts")}
              </div>
            ) : (
              barcodes.map((row) => (
                <div
                  key={String(row.id)}
                  className="flex items-center justify-between border-b px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold">
                      {String(row.barcode)}
                    </span>{" "}
                    <span className="text-gray-500">
                      → {String(row.product_id)}
                    </span>
                  </div>
                  <Badge color="blue">{String(row.provider)}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}

export interface DynamicQrTagsTabProps {
  form: TagFormState
  onFormChange: React.Dispatch<React.SetStateAction<TagFormState>>
  tags: Array<Record<string, unknown>>
  onCreateTag: () => void
  onDeleteTag: (id: string) => void
}

export const DynamicQrTagsTab = ({
  form,
  onFormChange,
  tags,
  onCreateTag,
  onDeleteTag,
}: DynamicQrTagsTabProps) => {
  const { t } = useTranslation()

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Container className="p-5">
        <Heading level="h2">{t("tagsTab.createTitle")}</Heading>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            value={form.target_id}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, target_id: e.target.value }))
            }
            placeholder={t("tagsTab.targetIdPlaceholder")}
          />
          <Input
            value={form.label}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, label: e.target.value }))
            }
            placeholder={t("tagsTab.labelPlaceholder")}
          />
          <select
            value={form.symbology}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                symbology: e.target.value as BarcodeSymbology,
              }))
            }
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="qr">{t("tagsTab.symbologyQr")}</option>
            <option value="datamatrix">
              {t("tagsTab.symbologyDatamatrix")}
            </option>
            <option value="ean13">{t("tagsTab.symbologyEan13")}</option>
            <option value="upca">{t("tagsTab.symbologyUpca")}</option>
            <option value="code128">{t("tagsTab.symbologyCode128")}</option>
            <option value="code39">{t("tagsTab.symbologyCode39")}</option>
          </select>
          <select
            value={form.scan_action}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                scan_action: e.target.value as BarcodeScanAction,
              }))
            }
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="view">{t("tagsTab.actionView")}</option>
            <option value="add_to_cart">{t("tagsTab.actionAddToCart")}</option>
            <option value="verify">{t("tagsTab.actionVerify")}</option>
            <option value="gs1_digital_link">
              {t("tagsTab.actionDigitalLink")}
            </option>
          </select>
          <Input
            value={form.gs1_gtin}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, gs1_gtin: e.target.value }))
            }
            placeholder={t("tagsTab.gs1GtinPlaceholder")}
          />
          <Input
            value={form.batch_lot}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, batch_lot: e.target.value }))
            }
            placeholder={t("tagsTab.batchLotPlaceholder")}
          />
          <Input
            value={form.serial_number}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                serial_number: e.target.value,
              }))
            }
            placeholder={t("tagsTab.serialNumberPlaceholder")}
          />
        </div>
        <div className="mt-4">
          <Button variant="primary" size="small" onClick={onCreateTag}>
            {t("tagsTab.generateButton")}
          </Button>
        </div>
      </Container>

      <Container className="p-5">
        <Heading level="h2">
          {t("tagsTab.listTitle", { count: tags.length })}
        </Heading>
        <div className="mt-3 flex max-h-80 flex-col gap-3 overflow-y-auto">
          {tags.map((tag) => (
            <div
              key={String(tag.id)}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {String(tag.code)}
                  </span>
                  <Badge color="purple">{String(tag.symbology)}</Badge>
                  <Badge color="green">{String(tag.scan_action)}</Badge>
                </div>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("tagsTab.tagMeta", {
                    target: String(tag.target_id),
                    scans: String(tag.scan_count ?? 0),
                  })}
                </Text>
                {tag.hmac_signature ? (
                  <Text size="xsmall" className="font-mono text-gray-500">
                    {t("tagsTab.hmacLabel", {
                      signature: String(tag.hmac_signature).slice(0, 16),
                    })}
                  </Text>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {typeof tag.svg_markup === "string" ? (
                  <BarcodeImage
                    code={String(tag.code)}
                    symbology={tag.symbology as BarcodeSymbology}
                    svgMarkup={tag.svg_markup}
                    width={96}
                    height={56}
                  />
                ) : null}
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => onDeleteTag(String(tag.id))}
                >
                  {t("tagsTab.deleteButton")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}

export interface LabelPrintCenterTabProps {
  form: PrintFormState
  onFormChange: React.Dispatch<React.SetStateAction<PrintFormState>>
  templates: LabelTemplateSpec[]
  output: LabelPrintOutput | null
  onRenderLabels: () => void
}

export const LabelPrintCenterTab = ({
  form,
  onFormChange,
  templates,
  output,
  onRenderLabels,
}: LabelPrintCenterTabProps) => {
  const { t } = useTranslation()

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Container className="p-5">
        <Heading level="h2">{t("printTab.designerTitle")}</Heading>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={form.template_id}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, template_id: e.target.value }))
            }
            className="rounded-md border px-3 py-1.5 text-sm sm:col-span-2"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tpl.width_mm}×{tpl.height_mm}mm)
              </option>
            ))}
          </select>
          <Input
            value={form.title}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder={t("printTab.productTitlePlaceholder")}
          />
          <Input
            value={form.variant_title}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                variant_title: e.target.value,
              }))
            }
            placeholder={t("printTab.variantTitlePlaceholder")}
          />
          <Input
            value={form.barcode}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, barcode: e.target.value }))
            }
            placeholder={t("printTab.barcodePlaceholder")}
          />
          <Input
            value={form.sku}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, sku: e.target.value }))
            }
            placeholder={t("printTab.skuPlaceholder")}
          />
          <Input
            type="number"
            value={String(form.price)}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                price: Number(e.target.value || 0),
              }))
            }
            placeholder={t("printTab.salePricePlaceholder")}
          />
          <Input
            type="number"
            value={String(form.compare_at_price)}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                compare_at_price: Number(e.target.value || 0),
              }))
            }
            placeholder={t("printTab.compareAtPricePlaceholder")}
          />
          <Input
            value={form.currency_code}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                currency_code: e.target.value.toUpperCase(),
              }))
            }
            placeholder={t("printTab.currencyPlaceholder")}
          />
          <Input
            type="number"
            value={String(form.quantity)}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                quantity: Number(e.target.value || 1),
              }))
            }
            placeholder={t("printTab.quantityPlaceholder")}
          />
        </div>
        <div className="mt-4">
          <Button variant="primary" size="small" onClick={onRenderLabels}>
            {t("printTab.renderButton")}
          </Button>
        </div>
      </Container>

      <Container className="p-5">
        <Heading level="h2">{t("printTab.outputTitle")}</Heading>
        {output ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge color="green">
                {t("printTab.labelsReadyBadge", {
                  count: output.total_labels,
                  name: output.template.name,
                })}
              </Badge>
            </div>
            <div>
              <Text size="xsmall" className="font-semibold">
                {t("printTab.zplHeading")}
              </Text>
              <textarea
                readOnly
                rows={7}
                value={output.zpl}
                className="mt-1 w-full rounded border bg-gray-950 p-2 font-mono text-xs text-emerald-400"
              />
            </div>
            <div>
              <Text size="xsmall" className="font-semibold">
                {t("printTab.htmlHeading")}
              </Text>
              <textarea
                readOnly
                rows={5}
                value={output.html}
                className="mt-1 w-full rounded border bg-gray-50 p-2 font-mono text-xs"
              />
            </div>
          </div>
        ) : (
          <Text size="small" className="text-ui-fg-subtle mt-2">
            {t("printTab.emptyState")}
          </Text>
        )}
      </Container>
    </div>
  )
}

export interface WarehouseStockTakeTabProps {
  form: CountSessionFormState
  onFormChange: React.Dispatch<React.SetStateAction<CountSessionFormState>>
  sessions: Array<Record<string, unknown>>
  selectedSessionId: string | null
  onSelectSession: (id: string) => void
  onCreateSession: () => void
  onScanDelta: (delta: number) => void
  onApplySession: (id: string) => void
}

export const WarehouseStockTakeTab = ({
  form,
  onFormChange,
  sessions,
  selectedSessionId,
  onSelectSession,
  onCreateSession,
  onScanDelta,
  onApplySession,
}: WarehouseStockTakeTabProps) => {
  const { t } = useTranslation()
  const activeSession = sessions.find((s) => String(s.id) === selectedSessionId)
  const activeItems = Array.isArray(activeSession?.items)
    ? (activeSession.items as Array<Record<string, unknown>>)
    : []

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Container className="p-5">
        <Heading level="h2">{t("stockTakeTab.createTitle")}</Heading>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            value={form.name}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder={t("stockTakeTab.sessionNamePlaceholder")}
          />
          <Input
            value={form.location_id}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, location_id: e.target.value }))
            }
            placeholder={t("stockTakeTab.locationIdPlaceholder")}
          />
        </div>
        <div className="mt-3">
          <Button variant="secondary" size="small" onClick={onCreateSession}>
            {t("stockTakeTab.startSessionButton")}
          </Button>
        </div>

        <div className="mt-6 border-t pt-4">
          <Heading level="h3">{t("stockTakeTab.scannerTitle")}</Heading>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={form.scan_barcode}
              onChange={(e) =>
                onFormChange((prev) => ({
                  ...prev,
                  scan_barcode: e.target.value,
                }))
              }
              placeholder={t("stockTakeTab.scannedBarcodePlaceholder")}
            />
            <Input
              value={form.scan_title}
              onChange={(e) =>
                onFormChange((prev) => ({
                  ...prev,
                  scan_title: e.target.value,
                }))
              }
              placeholder={t("stockTakeTab.itemTitlePlaceholder")}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              size="small"
              onClick={() => onScanDelta(1)}
            >
              {t("stockTakeTab.scanPlusOneButton")}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => onScanDelta(-1)}
            >
              {t("stockTakeTab.adjustMinusOneButton")}
            </Button>
          </div>
        </div>
      </Container>

      <Container className="p-5">
        <Heading level="h2">
          {t("stockTakeTab.sessionsTitle", { count: sessions.length })}
        </Heading>
        <div className="mt-3 flex flex-wrap gap-2">
          {sessions.map((s) => (
            <Button
              key={String(s.id)}
              variant={
                String(s.id) === selectedSessionId ? "primary" : "secondary"
              }
              size="small"
              onClick={() => onSelectSession(String(s.id))}
            >
              {String(s.name)} ({String(s.status)})
            </Button>
          ))}
        </div>

        {activeSession ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Heading level="h3">{String(activeSession.name)}</Heading>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t("stockTakeTab.sessionSummary", {
                    expected: String(activeSession.total_expected ?? 0),
                    counted: String(activeSession.total_counted ?? 0),
                    variance: String(activeSession.total_variance ?? 0),
                  })}
                </Text>
              </div>
              {activeSession.status === "in_progress" ? (
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => onApplySession(String(activeSession.id))}
                >
                  {t("stockTakeTab.completeApplyButton")}
                </Button>
              ) : (
                <Badge color="green">{t("stockTakeTab.completedBadge")}</Badge>
              )}
            </div>

            <div className="mt-3 max-h-48 overflow-y-auto rounded border">
              {activeItems.map((item) => (
                <div
                  key={String(item.id)}
                  className="flex items-center justify-between border-b px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold">
                      {String(item.barcode)}
                    </span>{" "}
                    — {String(item.title)}
                  </div>
                  <div>
                    {t("stockTakeTab.expectedShort", {
                      expected: String(item.expected_quantity),
                    })}{" "}
                    | {t("stockTakeTab.countedShort")}{" "}
                    <strong>{String(item.counted_quantity)}</strong>{" "}
                    {t("stockTakeTab.varianceShort", {
                      variance: String(item.variance),
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Container>
    </div>
  )
}

export interface ProvidersCacheTabProps {
  overview: Record<string, unknown>
  cacheEntries: Array<Record<string, unknown>>
  onPurgeExpired: () => void
  onClearAllCache: () => void
}

export const ProvidersCacheTab = ({
  overview,
  cacheEntries,
  onPurgeExpired,
  onClearAllCache,
}: ProvidersCacheTabProps) => {
  const { t } = useTranslation()
  const providers = Array.isArray(overview.active_providers)
    ? (overview.active_providers as string[])
    : []

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Container className="p-5">
        <Heading level="h2">{t("providersTab.providersTitle")}</Heading>
        <div className="mt-3 flex flex-wrap gap-2">
          {providers.map((p) => (
            <Badge key={p} color="green">
              {p}
            </Badge>
          ))}
        </div>
      </Container>

      <Container className="p-5">
        <div className="flex items-center justify-between">
          <Heading level="h2">
            {t("providersTab.cacheTitle", { count: cacheEntries.length })}
          </Heading>
          <div className="flex gap-2">
            <Button variant="secondary" size="small" onClick={onPurgeExpired}>
              {t("providersTab.purgeExpiredButton")}
            </Button>
            <Button variant="secondary" size="small" onClick={onClearAllCache}>
              {t("providersTab.clearAllButton")}
            </Button>
          </div>
        </div>
        <div className="mt-3 max-h-60 overflow-y-auto rounded border">
          {cacheEntries.map((entry) => (
            <div
              key={String(entry.id)}
              className="flex items-center justify-between border-b px-3 py-2 text-xs"
            >
              <div>
                <span className="font-mono font-bold">
                  {String(entry.barcode)}
                </span>{" "}
                ({String(entry.provider)})
              </div>
              <Badge color={entry.found ? "green" : "orange"}>
                {t("providersTab.hitsBadge", {
                  count: String(entry.hit_count ?? 1),
                })}
              </Badge>
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}

export interface ProductBarcodeCardProps {
  productTitle?: string
  tags: Array<Record<string, unknown>>
  linkedBarcodes: Array<Record<string, unknown>>
  printPreview: LabelPrintOutput | null
  isBusy: boolean
  feedback: string | null
  onGenerateBarcodes: () => void
  onQuickPrintLabels: () => void
}

export const ProductBarcodeCard = ({
  productTitle,
  tags,
  linkedBarcodes,
  printPreview,
  isBusy,
  feedback,
  onGenerateBarcodes,
  onQuickPrintLabels,
}: ProductBarcodeCardProps) => {
  const { t, i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")
  const primaryTag = tags[0]

  return (
    <Container className="p-5" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level="h2">{t("widget.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("widget.subtitle", {
              productTitle: productTitle || t("widget.defaultProductTitle"),
              tagsCount: tags.length,
              barcodesCount: linkedBarcodes.length,
            })}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="small"
            disabled={isBusy}
            onClick={onGenerateBarcodes}
          >
            {t("widget.generateButton")}
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={isBusy}
            onClick={onQuickPrintLabels}
          >
            {t("widget.printButton")}
          </Button>
        </div>
      </div>

      {feedback ? (
        <Text size="small" className="mt-2 text-emerald-700">
          {feedback}
        </Text>
      ) : null}

      {primaryTag ? (
        <div className="mt-3 flex items-center gap-4 rounded border p-3">
          <BarcodeImage
            code={String(primaryTag.code)}
            symbology={(primaryTag.symbology as BarcodeSymbology) || "ean13"}
            svgMarkup={
              typeof primaryTag.svg_markup === "string"
                ? primaryTag.svg_markup
                : undefined
            }
          />
          <div className="text-xs">
            <div>
              <strong>{t("widget.codeLabel")}</strong>{" "}
              {String(primaryTag.code)}
            </div>
            <div>
              <strong>{t("widget.actionLabel")}</strong>{" "}
              {String(primaryTag.scan_action)}
            </div>
            <div>
              <strong>{t("widget.scansLabel")}</strong>{" "}
              {String(primaryTag.scan_count ?? 0)}
            </div>
          </div>
        </div>
      ) : null}

      {printPreview ? (
        <div className="mt-3">
          <Text size="xsmall" className="font-semibold">
            {t("widget.zplOutputLabel", { name: printPreview.template.name })}
          </Text>
          <textarea
            readOnly
            rows={4}
            value={printPreview.zpl}
            className="mt-1 w-full rounded border bg-gray-950 p-2 font-mono text-xs text-emerald-400"
          />
        </div>
      ) : null}
    </Container>
  )
}

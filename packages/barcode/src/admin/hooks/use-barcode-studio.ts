import { useCallback, useEffect, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useHidBarcodeScanner } from "../../hooks"
import type {
  BarcodeLookupChainResult,
  BarcodeScanAction,
  BarcodeSymbology,
  EnrichmentStrategy,
  LabelPrintOutput,
  LabelTemplateSpec,
} from "../../modules/barcode/types"
import { createBarcodeSdk } from "../../sdk"

const defaultAdminSdk = createBarcodeSdk()

export interface LookupFormState {
  barcode: string
  strategy: EnrichmentStrategy
  status: "draft" | "published"
  downloadImages: boolean
  batchInput: string
}

export interface TagFormState {
  target_id: string
  label: string
  symbology: BarcodeSymbology
  scan_action: BarcodeScanAction
  gs1_gtin: string
  batch_lot: string
  serial_number: string
}

export interface PrintFormState {
  template_id: string
  barcode: string
  title: string
  variant_title: string
  sku: string
  brand: string
  price: number
  compare_at_price: number
  currency_code: string
  quantity: number
}

export interface CountSessionFormState {
  name: string
  location_id: string
  notes: string
  scan_barcode: string
  scan_title: string
  expected_quantity: number
}

export const useBarcodeStudio = () => {
  const { t } = useTranslation()
  const [barcodes, setBarcodes] = useState<Array<Record<string, unknown>>>([])
  const [overview, setOverview] = useState<Record<string, unknown>>({})
  const [tags, setTags] = useState<Array<Record<string, unknown>>>([])
  const [templates, setTemplates] = useState<LabelTemplateSpec[]>([])
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([])
  const [cacheEntries, setCacheEntries] = useState<
    Array<Record<string, unknown>>
  >([])

  const [bannerMessage, setBannerMessage] = useState<string | null>(null)
  const [bannerTone, setBannerTone] = useState<"success" | "error">("success")
  const [isLoading, setIsLoading] = useState(false)

  const [lookupForm, setLookupForm] = useState<LookupFormState>({
    barcode: "3017620422003",
    strategy: "first-hit",
    status: "draft",
    downloadImages: false,
    batchInput: "3017620422003\n9780140328721",
  })
  const [lookupResult, setLookupResult] =
    useState<BarcodeLookupChainResult | null>(null)

  const [tagForm, setTagForm] = useState<TagFormState>({
    target_id: "prod_01",
    label: "Flagship Edition",
    symbology: "qr",
    scan_action: "verify",
    gs1_gtin: "09506000134352",
    batch_lot: "LOT-2026-A",
    serial_number: "SN-000192",
  })

  const [printForm, setPrintForm] = useState<PrintFormState>({
    template_id: "thermal_50x25",
    barcode: "2001234567893",
    title: "Organic Espresso Beans",
    variant_title: "250g Whole Bean",
    sku: "ESP-250-WB",
    brand: "Medusa Roasters",
    price: 14.5,
    compare_at_price: 18.0,
    currency_code: "USD",
    quantity: 4,
  })
  const [printOutput, setPrintOutput] = useState<LabelPrintOutput | null>(null)

  const [countForm, setCountForm] = useState<CountSessionFormState>({
    name: "Q4 Warehouse Cycle Count",
    location_id: "sloc_main_warehouse",
    notes: "Aisle 1-4 audit",
    scan_barcode: "2001234567893",
    scan_title: "Organic Espresso Beans",
    expected_quantity: 10,
  })
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  )

  const notify = useCallback(
    (msg: string, tone: "success" | "error" = "success") => {
      setBannerTone(tone)
      setBannerMessage(msg)
      if (tone === "error") {
        toast.error(msg)
      } else {
        toast.success(msg)
      }
    },
    []
  )

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [barcodesRes, tagsRes, templatesRes, sessionsRes, cacheRes] =
        await Promise.all([
          defaultAdminSdk.admin.listBarcodes(),
          defaultAdminSdk.admin.listTags(),
          defaultAdminSdk.admin.listTemplates(),
          defaultAdminSdk.admin.listCountSessions(),
          defaultAdminSdk.admin.listCache(),
        ])

      setBarcodes(barcodesRes.barcodes || [])
      setOverview(barcodesRes.overview || {})
      setTags(tagsRes.tags || [])
      setTemplates(templatesRes.templates || [])
      setSessions(sessionsRes.sessions || [])
      setCacheEntries(cacheRes.cache_entries || [])
      if (!selectedSessionId && sessionsRes.sessions?.[0]?.id) {
        setSelectedSessionId(String(sessionsRes.sessions[0].id))
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.loadStudioError"),
        "error"
      )
    } finally {
      setIsLoading(false)
    }
  }, [selectedSessionId, t])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  // Hardware USB HID keyboard-wedge scanner integration
  const { lastScanned } = useHidBarcodeScanner({
    enabled: true,
    onScan: (scannedBarcode) => {
      setLookupForm((prev) => ({ ...prev, barcode: scannedBarcode }))
      notify(t("messages.hidScanDetected", { barcode: scannedBarcode }))
    },
  })

  const handleLookupBarcode = async () => {
    if (!lookupForm.barcode.trim()) return
    try {
      const res = await defaultAdminSdk.admin.lookup({
        barcode: lookupForm.barcode.trim(),
        strategy: lookupForm.strategy,
      })
      setLookupResult(res)
      notify(
        res.found
          ? t("messages.lookupFound", {
              name: res.product?.name ?? "",
              provider: res.product?.provider ?? "",
            })
          : t("messages.lookupNotFound", { barcode: res.barcode }),
        res.found ? "success" : "error"
      )
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.lookupError"),
        "error"
      )
    }
  }

  const handleCreateProductFromBarcode = async () => {
    if (!lookupForm.barcode.trim()) return
    try {
      const res = await defaultAdminSdk.admin.createFromBarcode({
        barcode: lookupForm.barcode.trim(),
        status: lookupForm.status,
        strategy: lookupForm.strategy,
        downloadImages: lookupForm.downloadImages,
      })
      notify(
        t("messages.productCreated", {
          productId: String(res.product_id || ""),
          barcode: lookupForm.barcode,
        })
      )
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.productCreateError"),
        "error"
      )
    }
  }

  const handleBatchImport = async () => {
    const lines = lookupForm.batchInput
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) return

    try {
      const res = await defaultAdminSdk.admin.batchImport({
        barcodes: lines,
        status: lookupForm.status,
        strategy: lookupForm.strategy,
        createMissingAsDraft: true,
      })
      notify(
        t("messages.batchImportFinished", {
          imported: String(res.imported_count || 0),
          notFound: String(res.not_found_count || 0),
        })
      )
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.batchImportError"),
        "error"
      )
    }
  }

  const handleBulkGenerateBarcodes = async () => {
    try {
      const res = await defaultAdminSdk.admin.bulkGenerate({
        prefix: "200",
        overwrite: false,
      })
      notify(
        t("messages.bulkGenerated", {
          count: String(res.generated_count || 0),
        })
      )
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.bulkGenerateError"),
        "error"
      )
    }
  }

  const handleCreateTag = async (override?: Partial<TagFormState>) => {
    const payload = { ...tagForm, ...override }
    if (!payload.target_id.trim()) return
    try {
      const res = await defaultAdminSdk.admin.createTag({
        target_id: payload.target_id.trim(),
        label: payload.label.trim() || null,
        symbology: payload.symbology,
        scan_action: payload.scan_action,
        gs1_gtin: payload.gs1_gtin.trim() || null,
        batch_lot: payload.batch_lot.trim() || null,
        serial_number: payload.serial_number.trim() || null,
      })
      notify(t("messages.tagCreated", { code: String(res.tag?.code || "") }))
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.tagCreateError"),
        "error"
      )
    }
  }

  const handleDeleteTag = async (id: string) => {
    try {
      await defaultAdminSdk.admin.deleteTag(id)
      notify(t("messages.tagDeleted"))
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.tagDeleteError"),
        "error"
      )
    }
  }

  const handleRenderLabels = async () => {
    try {
      const res = await defaultAdminSdk.admin.printLabels({
        template_id: printForm.template_id,
        items: [
          {
            barcode: printForm.barcode,
            title: printForm.title,
            variant_title: printForm.variant_title || null,
            sku: printForm.sku || null,
            brand: printForm.brand || null,
            price: printForm.price,
            compare_at_price: printForm.compare_at_price,
            currency_code: printForm.currency_code,
            quantity: printForm.quantity,
          },
        ],
      })
      setPrintOutput(res)
      notify(
        t("messages.labelsRendered", {
          count: res.total_labels,
          name: res.template.name,
        })
      )
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.labelsRenderError"),
        "error"
      )
    }
  }

  const handleCreateCountSession = async () => {
    if (!countForm.name.trim()) return
    try {
      const res = await defaultAdminSdk.admin.createCountSession({
        name: countForm.name.trim(),
        location_id: countForm.location_id.trim() || null,
        notes: countForm.notes.trim() || null,
        expected_items: countForm.scan_barcode
          ? [
              {
                barcode: countForm.scan_barcode.trim(),
                title:
                  countForm.scan_title.trim() ||
                  t("messages.defaultCatalogItemTitle"),
                expected_quantity: countForm.expected_quantity,
              },
            ]
          : [],
      })
      const newSession = res.session as { id?: string } | undefined
      if (newSession?.id) {
        setSelectedSessionId(newSession.id)
      }
      notify(t("messages.sessionCreated", { name: countForm.name }))
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.sessionCreateError"),
        "error"
      )
    }
  }

  const handleScanIntoSession = async (delta = 1) => {
    if (!selectedSessionId || !countForm.scan_barcode.trim()) return
    try {
      await defaultAdminSdk.admin.recordCountScan(selectedSessionId, {
        barcode: countForm.scan_barcode.trim(),
        delta,
        title: countForm.scan_title.trim() || undefined,
        expected_quantity: countForm.expected_quantity,
      })
      notify(
        t("messages.scanRecorded", {
          delta: delta > 0 ? `+${delta}` : String(delta),
          barcode: countForm.scan_barcode,
        })
      )
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.scanError"),
        "error"
      )
    }
  }

  const handleApplyCountSession = async (sessionId: string) => {
    try {
      await defaultAdminSdk.admin.applyCountSession(sessionId, {
        location_id: countForm.location_id || null,
      })
      notify(t("messages.sessionApplied"))
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.sessionApplyError"),
        "error"
      )
    }
  }

  const handlePurgeCache = async (clearAll = false) => {
    try {
      const res = await defaultAdminSdk.admin.purgeCache(clearAll)
      notify(t("messages.cachePurged", { count: res.purged_count }))
      await refreshAll()
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t("messages.cachePurgeError"),
        "error"
      )
    }
  }

  return {
    barcodes,
    overview,
    tags,
    templates,
    sessions,
    cacheEntries,
    bannerMessage,
    bannerTone,
    isLoading,
    lastScanned,
    lookupForm,
    setLookupForm,
    lookupResult,
    tagForm,
    setTagForm,
    printForm,
    setPrintForm,
    printOutput,
    countForm,
    setCountForm,
    selectedSessionId,
    setSelectedSessionId,
    dismissBanner: () => setBannerMessage(null),
    onRefresh: () => void refreshAll(),
    handleLookupBarcode,
    handleCreateProductFromBarcode,
    handleBatchImport,
    handleBulkGenerateBarcodes,
    handleCreateTag,
    handleDeleteTag,
    handleRenderLabels,
    handleCreateCountSession,
    handleScanIntoSession,
    handleApplyCountSession,
    handlePurgeCache,
  }
}

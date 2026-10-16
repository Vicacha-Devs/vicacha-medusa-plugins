import { useCallback, useEffect, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { LabelPrintOutput } from "../../modules/barcode/types"
import { createBarcodeSdk } from "../../sdk"

const defaultAdminSdk = createBarcodeSdk()

export interface ProductBarcodeWidgetEntity {
  id?: string
  title?: string
  handle?: string
  variants?: Array<{
    id: string
    title?: string | null
    sku?: string | null
    barcode?: string | null
    ean?: string | null
    upc?: string | null
  }>
}

/**
 * Decoupled hook for the Product Detail Barcode & Label Widget (`product.details.after`).
 */
export const useProductBarcodes = (product?: ProductBarcodeWidgetEntity) => {
  const { t } = useTranslation()
  const productId = product?.id ?? ""
  const [tags, setTags] = useState<Array<Record<string, unknown>>>([])
  const [linkedBarcodes, setLinkedBarcodes] = useState<
    Array<Record<string, unknown>>
  >([])
  const [printPreview, setPrintPreview] = useState<LabelPrintOutput | null>(
    null
  )
  const [isBusy, setIsBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadProductBarcodeData = useCallback(async () => {
    if (!productId) return
    try {
      const [barcodesRes, tagsRes] = await Promise.all([
        defaultAdminSdk.admin.listBarcodes({ product_id: productId }),
        defaultAdminSdk.admin.listTags({ product_id: productId }),
      ])
      setLinkedBarcodes(barcodesRes.barcodes || [])
      setTags(tagsRes.tags || [])
    } catch {
      // Non-fatal widget load error
    }
  }, [productId])

  useEffect(() => {
    void loadProductBarcodeData()
  }, [loadProductBarcodeData])

  const handleGenerateProductBarcodes = async () => {
    if (!productId) return
    setIsBusy(true)
    try {
      const variantIds = (product?.variants || []).map((v) => v.id)
      const tagRes = await defaultAdminSdk.admin.createTag({
        target_type: "product",
        target_id: productId,
        product_id: productId,
        label: product?.title || productId,
        symbology: "ean13",
        scan_action: "view",
      })

      if (variantIds.length > 0) {
        await defaultAdminSdk.admin.bulkGenerate({
          variant_ids: variantIds,
          prefix: "200",
          overwrite: false,
        })
      }

      const msg = t("messages.widgetBarcodeGenerated", {
        code: String(tagRes.tag?.code || ""),
        title: product?.title || productId,
      })
      setFeedback(msg)
      toast.success(msg)
      await loadProductBarcodeData()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.widgetBarcodeError")
      setFeedback(msg)
      toast.error(msg)
    } finally {
      setIsBusy(false)
    }
  }

  const handleQuickPrintProductLabels = async () => {
    if (!productId) return
    setIsBusy(true)
    try {
      const firstTag = tags[0]
      const code = String(firstTag?.code || "2001234567893")
      const output = await defaultAdminSdk.admin.printLabels({
        template_id: "thermal_50x25",
        items: [
          {
            barcode: code,
            title: product?.title || t("messages.defaultProductLabelTitle"),
            sku: product?.variants?.[0]?.sku || null,
            price: 19.99,
            currency_code: "USD",
            quantity: 1,
          },
        ],
      })
      setPrintPreview(output)
      const msg = t("messages.widgetLabelPrepared", { code })
      setFeedback(msg)
      toast.success(msg)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("messages.widgetLabelError")
      setFeedback(msg)
      toast.error(msg)
    } finally {
      setIsBusy(false)
    }
  }

  return {
    tags,
    linkedBarcodes,
    printPreview,
    isBusy,
    feedback,
    handleGenerateProductBarcodes,
    handleQuickPrintProductLabels,
  }
}

import type {
  DianBuyerSnapshot,
  DianItemStandard,
  DianLineItemContext,
  DianSellerSnapshot,
  DianTaxCode,
  DianTaxLineBreakdown,
  DianWithholdingBreakdown,
} from "../../../types"

export interface TaxMapperConfig {
  default_iva_rate?: number // default 19
  enable_withholdings?: boolean
  retefuente_goods_rate?: number // default 2.5%
  reteiva_rate?: number // default 15% of IVA
  reteica_rate_per_thousand?: number // e.g. 11.04 per 1000 (1.104%)
}

const TAX_NAMES_BY_CODE: Record<DianTaxCode, string> = {
  "01": "IVA",
  "02": "IC",
  "03": "ICA",
  "04": "INC",
  "05": "ReteIVA",
  "06": "ReteFuente",
  "07": "ReteICA",
  "22": "Bolsas",
  ZZ: "No causa",
}

function roundTwo(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

/**
 * Resolves the DIAN tax code (`01` IVA, `04` INC, `22` Bolsas, `ZZ` Excluido)
 * from a Medusa tax line or item metadata.
 */
export function classifyColombianTaxCode(
  taxLine?: { code?: string | null; name?: string | null; rate?: number | null },
  itemMetadata?: Record<string, unknown> | null
): DianTaxCode {
  const explicitMeta = String(itemMetadata?.dian_tax_code ?? "")
    .trim()
    .toUpperCase()
  if (
    explicitMeta === "01" ||
    explicitMeta === "02" ||
    explicitMeta === "03" ||
    explicitMeta === "04" ||
    explicitMeta === "22" ||
    explicitMeta === "ZZ"
  ) {
    return explicitMeta as DianTaxCode
  }

  const codeAndName = `${taxLine?.code ?? ""} ${taxLine?.name ?? ""}`.toLowerCase()
  if (codeAndName.includes("inc") || codeAndName.includes("impoconsumo")) {
    return "04"
  }
  if (codeAndName.includes("bolsa")) {
    return "22"
  }
  if (codeAndName.includes("excluido") || codeAndName.includes("no causa")) {
    return "ZZ"
  }

  const rate = Number(taxLine?.rate ?? 0)
  if (rate === 8 || rate === 4) {
    if (codeAndName.includes("consumo")) {
      return "04"
    }
  }

  return "01"
}

/**
 * Resolves the DIAN item coding standard (`999` SKU default, `010` GTIN, or `001` UNSPSC)
 * for an order line item.
 */
export function resolveLineItemStandardCoding(
  item: Record<string, any>
): { standard_code_id: DianItemStandard; standard_item_id: string } {
  const meta = (item?.metadata ?? item?.variant?.metadata ?? {}) as Record<
    string,
    unknown
  >

  const unspsc = String(meta.dian_unspsc_code ?? meta.unspsc ?? "").trim()
  if (/^\d{8}$/.test(unspsc)) {
    return {
      standard_code_id: "001",
      standard_item_id: unspsc,
    }
  }

  const gtin = String(
    meta.dian_gtin ?? item?.barcode ?? item?.variant?.barcode ?? ""
  ).trim()
  if (/^\d{8,14}$/.test(gtin) && meta.dian_prefer_gtin === true) {
    return {
      standard_code_id: "010",
      standard_item_id: gtin,
    }
  }

  const sku =
    String(item?.sku ?? item?.variant?.sku ?? item?.id ?? "ITEM-001").trim() ||
    "ITEM-001"

  return {
    standard_code_id: "999",
    standard_item_id: sku,
  }
}

/**
 * Maps Medusa order items and totals into DIAN UBL 2.1 line items, aggregated tax breakdowns,
 * and informational withholding taxes (`WithholdingTaxTotal`: `05` ReteIVA, `06` ReteFuente, `07` ReteICA).
 */
export function mapOrderLinesAndTaxesForDian(
  order: Record<string, any>,
  seller: DianSellerSnapshot,
  buyer: DianBuyerSnapshot,
  config: TaxMapperConfig = {}
): {
  items: DianLineItemContext[]
  taxes: DianTaxLineBreakdown[]
  withholdings: DianWithholdingBreakdown[]
  line_extension_amount: number
  tax_exclusive_amount: number
  tax_inclusive_amount: number
  allowance_total_amount: number
  charge_total_amount: number
  payable_amount: number
} {
  const rawItems: Record<string, any>[] = Array.isArray(order?.items)
    ? order.items
    : []

  const items: DianLineItemContext[] = []
  const taxMap = new Map<string, DianTaxLineBreakdown>()

  let computedSubtotal = 0
  let computedDiscountTotal = 0
  let computedTaxTotal = 0

  rawItems.forEach((raw, idx) => {
    const quantity = Math.max(1, Number(raw.quantity ?? 1))
    const unitPrice = roundTwo(Number(raw.unit_price ?? 0))
    const discountAmount = roundTwo(Number(raw.discount_total ?? 0))
    const lineExtension = roundTwo(
      Number(raw.subtotal ?? quantity * unitPrice - discountAmount)
    )

    const { standard_code_id, standard_item_id } =
      resolveLineItemStandardCoding(raw)

    const itemTaxLines: Record<string, any>[] = Array.isArray(raw.tax_lines)
      ? raw.tax_lines
      : []

    const lineTaxes: DianTaxLineBreakdown[] = []

    if (itemTaxLines.length > 0) {
      for (const tl of itemTaxLines) {
        const taxCode = classifyColombianTaxCode(tl, raw.metadata)
        const rate = roundTwo(Number(tl.rate ?? 0))
        const taxAmount = roundTwo(
          Number(tl.total ?? (lineExtension * rate) / 100)
        )
        const entry: DianTaxLineBreakdown = {
          tax_code: taxCode,
          tax_name: TAX_NAMES_BY_CODE[taxCode],
          rate,
          taxable_amount: lineExtension,
          tax_amount: taxAmount,
        }
        lineTaxes.push(entry)
        computedTaxTotal = roundTwo(computedTaxTotal + taxAmount)

        const aggKey = `${taxCode}:${rate}`
        const existing = taxMap.get(aggKey)
        if (existing) {
          existing.taxable_amount = roundTwo(
            existing.taxable_amount + lineExtension
          )
          existing.tax_amount = roundTwo(existing.tax_amount + taxAmount)
        } else {
          taxMap.set(aggKey, { ...entry })
        }
      }
    } else {
      const itemTaxTotal = roundTwo(Number(raw.tax_total ?? 0))
      const taxCode = classifyColombianTaxCode(undefined, raw.metadata)
      const inferredRate =
        lineExtension > 0 && itemTaxTotal > 0
          ? roundTwo((itemTaxTotal / lineExtension) * 100)
          : 0
      const entry: DianTaxLineBreakdown = {
        tax_code: taxCode,
        tax_name: TAX_NAMES_BY_CODE[taxCode],
        rate: inferredRate,
        taxable_amount: lineExtension,
        tax_amount: itemTaxTotal,
      }
      lineTaxes.push(entry)
      computedTaxTotal = roundTwo(computedTaxTotal + itemTaxTotal)

      const aggKey = `${taxCode}:${inferredRate}`
      const existing = taxMap.get(aggKey)
      if (existing) {
        existing.taxable_amount = roundTwo(
          existing.taxable_amount + lineExtension
        )
        existing.tax_amount = roundTwo(existing.tax_amount + itemTaxTotal)
      } else {
        taxMap.set(aggKey, { ...entry })
      }
    }

    computedSubtotal = roundTwo(computedSubtotal + lineExtension)
    computedDiscountTotal = roundTwo(computedDiscountTotal + discountAmount)

    items.push({
      id: String(raw.id || `line_${idx + 1}`),
      line_number: idx + 1,
      title: String(raw.title || "Item"),
      description: raw.subtitle || raw.variant_title || null,
      sku: String(raw.sku || standard_item_id),
      standard_code_id,
      standard_item_id,
      unit_code: String(raw.metadata?.dian_unit_code || "94"), // 94 = Unidad estandar DIAN
      quantity,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      line_extension_amount: lineExtension,
      taxes: lineTaxes,
      is_free_sample: Boolean(raw.metadata?.dian_free_sample),
    })
  })

  // Include shipping as a line item or charge if present
  const shippingTotal = roundTwo(Number(order?.shipping_total ?? 0))
  const line_extension_amount = roundTwo(computedSubtotal)
  const tax_exclusive_amount = roundTwo(computedSubtotal)
  const totalTaxAmount = roundTwo(computedTaxTotal)
  const charge_total_amount = shippingTotal
  const allowance_total_amount = roundTwo(
    Number(order?.discount_total ?? computedDiscountTotal)
  )
  const tax_inclusive_amount = roundTwo(
    line_extension_amount + totalTaxAmount + charge_total_amount
  )
  const payable_amount = roundTwo(tax_inclusive_amount)

  // Compute informational Withholdings (Retenciones: 05 ReteIVA, 06 ReteFuente, 07 ReteICA)
  // Per DIAN Anexo 1.9, WithholdingTaxTotal is informational and does NOT reduce PayableAmount.
  const withholdings: DianWithholdingBreakdown[] = []

  const sellerIsAutoretenedor =
    seller.fiscal_responsibilities.includes("O-15") ||
    seller.fiscal_responsibilities.includes("O-47")
  const buyerIsRetentionAgent =
    buyer.is_b2b_legal_client ||
    buyer.fiscal_responsibilities.includes("O-13") ||
    buyer.fiscal_responsibilities.includes("O-23")

  if (
    config.enable_withholdings !== false &&
    buyerIsRetentionAgent &&
    !sellerIsAutoretenedor &&
    line_extension_amount > 0
  ) {
    const reteFuenteRate = Number(config.retefuente_goods_rate ?? 2.5)
    if (reteFuenteRate > 0) {
      withholdings.push({
        withholding_code: "06",
        withholding_name: "ReteFuente",
        rate: reteFuenteRate,
        taxable_amount: line_extension_amount,
        withholding_amount: roundTwo(
          (line_extension_amount * reteFuenteRate) / 100
        ),
      })
    }

    const totalIva = Array.from(taxMap.values())
      .filter((t) => t.tax_code === "01")
      .reduce((acc, t) => acc + t.tax_amount, 0)

    const buyerRetainsIva =
      buyer.fiscal_responsibilities.includes("O-13") ||
      buyer.fiscal_responsibilities.includes("O-23")
    const reteIvaRate = Number(config.reteiva_rate ?? 15)

    if (buyerRetainsIva && totalIva > 0 && reteIvaRate > 0) {
      withholdings.push({
        withholding_code: "05",
        withholding_name: "ReteIVA",
        rate: reteIvaRate,
        taxable_amount: roundTwo(totalIva),
        withholding_amount: roundTwo((totalIva * reteIvaRate) / 100),
      })
    }

    const reteIcaPerThousand = Number(config.reteica_rate_per_thousand ?? 0)
    if (reteIcaPerThousand > 0) {
      const reteIcaPercent = roundTwo(reteIcaPerThousand / 10)
      withholdings.push({
        withholding_code: "07",
        withholding_name: "ReteICA",
        rate: reteIcaPercent,
        taxable_amount: line_extension_amount,
        withholding_amount: roundTwo(
          (line_extension_amount * reteIcaPerThousand) / 1000
        ),
      })
    }
  }

  return {
    items,
    taxes: Array.from(taxMap.values()),
    withholdings,
    line_extension_amount,
    tax_exclusive_amount,
    tax_inclusive_amount,
    allowance_total_amount,
    charge_total_amount,
    payable_amount,
  }
}

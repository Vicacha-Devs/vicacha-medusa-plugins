import { MedusaError } from "@medusajs/framework/utils";

import type { BarcodeOpsContext } from "./context";
import type {
  BarcodeSymbology,
  LabelPresetId,
  LabelPrintItem,
  LabelPrintOutput,
  LabelTemplateSpec,
} from "../types";
import {
  BUILTIN_LABEL_TEMPLATES,
  renderPrintableLabels,
} from "../utils/label-printer";

/**
 * Lists all built-in + custom label templates.
 */
export async function listAllLabelTemplates(
  ctx: BarcodeOpsContext,
): Promise<LabelTemplateSpec[]> {
  const builtinList = Object.values(BUILTIN_LABEL_TEMPLATES);
  try {
    const customRows = await ctx.svc.listBarcodeLabelTemplates(
      {},
      { take: 100 },
    );
    const customMapped: LabelTemplateSpec[] = customRows.map((row) => ({
      id: row.id,
      name: row.name,
      preset_id: (row.preset_id as LabelPresetId) || "custom",
      layout_type: row.layout_type as "thermal_roll" | "a4_sheet",
      width_mm: Number(row.width_mm),
      height_mm: Number(row.height_mm),
      columns: Number(row.columns),
      rows: Number(row.rows),
      margin_top_mm: Number(row.margin_top_mm),
      margin_left_mm: Number(row.margin_left_mm),
      gap_x_mm: Number(row.gap_x_mm),
      gap_y_mm: Number(row.gap_y_mm),
      symbology: (row.symbology as BarcodeSymbology) || "ean13",
      show_title: Boolean(row.show_title),
      show_variant_title: Boolean(row.show_variant_title),
      show_sku: Boolean(row.show_sku),
      show_price: Boolean(row.show_price),
      show_compare_at_price: Boolean(row.show_compare_at_price),
      show_brand: Boolean(row.show_brand),
      show_qr: Boolean(row.show_qr),
      custom_header: row.custom_header ?? null,
      custom_footer: row.custom_footer ?? null,
      dpi: (Number(row.dpi) === 300 ? 300 : 203) as 203 | 300,
      is_default: Boolean(row.is_default),
    }));
    return [...builtinList, ...customMapped];
  } catch {
    return builtinList;
  }
}

/**
 * Renders printable HTML+SVG and Zebra ZPL II output for a list of label items.
 */
export async function renderLabels(
  ctx: BarcodeOpsContext,
  input: {
    items: LabelPrintItem[];
    template_id?: string;
    template_override?: Partial<LabelTemplateSpec>;
  },
): Promise<LabelPrintOutput> {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one label item is required for printing",
    );
  }

  const templates = await listAllLabelTemplates(ctx);
  const baseTemplate =
    templates.find(
      (t) => t.id === input.template_id || t.preset_id === input.template_id,
    ) || BUILTIN_LABEL_TEMPLATES.thermal_50x25;

  const mergedTemplate: LabelTemplateSpec = {
    ...baseTemplate,
    ...(input.template_override || {}),
  };

  return renderPrintableLabels(input.items, mergedTemplate);
}

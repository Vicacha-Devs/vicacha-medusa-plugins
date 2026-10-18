import { MedusaError } from "@medusajs/framework/utils";

import type { BarcodeOpsContext } from "./context";
import type { BarcodeSymbology, RenderBarcodeSvgOptions } from "../types";
import { generateInternalEan13 } from "../utils/barcode-parser";
import { renderBarcodeSvg } from "../utils/svg-renderer";

/**
 * Generates a valid GS1 in-store EAN-13 barcode (prefix 200-299).
 */
export async function generateInternalVariantBarcode(
  ctx: BarcodeOpsContext,
  input: {
    seed: string;
    sequence?: number;
    prefix?: string;
  },
): Promise<{
  barcode: string;
  ean: string;
  upc: string;
  symbology: BarcodeSymbology;
  svg: string;
}> {
  const prefix = input.prefix || ctx.options.internalBarcodePrefix || "200";
  const ean13 = generateInternalEan13(input.seed, prefix, input.sequence);
  const upc = ean13.slice(1); // 12-digit representation
  const svg = renderBarcodeSvg({
    code: ean13,
    symbology: "ean13",
    includeText: true,
  });

  return {
    barcode: ean13,
    ean: ean13,
    upc,
    symbology: "ean13",
    svg,
  };
}

/**
 * Renders any supported 1D/2D barcode symbology into a standalone SVG string.
 */
export async function renderSvg(
  ctx: BarcodeOpsContext,
  options: RenderBarcodeSvgOptions,
): Promise<string> {
  if (!options.code || !String(options.code).trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Barcode value is required to render SVG",
    );
  }
  return renderBarcodeSvg(options);
}

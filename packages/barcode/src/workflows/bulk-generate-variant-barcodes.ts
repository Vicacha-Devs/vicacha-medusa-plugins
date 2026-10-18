import { Modules } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import type { BarcodeModuleService } from "../modules/barcode/service";
import { BARCODE_MODULE } from "../modules/barcode/types";
import { parseBarcode } from "../modules/barcode/utils/barcode-parser";
import { tryResolveService } from "./helpers";

export interface BulkGenerateVariantBarcodesInput {
  variant_ids?: string[];
  product_ids?: string[];
  prefix?: string;
  overwrite?: boolean;
}

const bulkGenerateVariantBarcodesStep = createStep(
  "bulk-generate-variant-barcodes",
  async (input: BulkGenerateVariantBarcodesInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;
    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ]);

    const generated: Array<{
      variant_id: string;
      product_id: string | null;
      barcode: string;
      ean: string;
      upc: string;
    }> = [];
    const createdTagIds: string[] = [];
    const previousVariants: Array<{
      id: string;
      barcode: string | null;
      ean: string | null;
      upc: string | null;
    }> = [];

    const targetVariants: Array<{
      id: string;
      product_id?: string | null;
      title?: string | null;
      barcode?: string | null;
      ean?: string | null;
      upc?: string | null;
    }> = [];

    if (
      productService &&
      typeof productService.listProductVariants === "function"
    ) {
      const filter: Record<string, unknown> = {};
      if (input.variant_ids && input.variant_ids.length > 0) {
        filter.id = input.variant_ids;
      }
      if (input.product_ids && input.product_ids.length > 0) {
        filter.product_id = input.product_ids;
      }
      const rows = (await productService.listProductVariants(filter, {
        take: 250,
      })) as typeof targetVariants;
      if (Array.isArray(rows)) {
        const filteredRows = rows.filter((r) => {
          if (
            input.variant_ids &&
            input.variant_ids.length > 0 &&
            !input.variant_ids.includes(r.id)
          ) {
            return false;
          }
          if (
            input.product_ids &&
            input.product_ids.length > 0 &&
            r.product_id &&
            !input.product_ids.includes(r.product_id)
          ) {
            return false;
          }
          return true;
        });
        targetVariants.push(...filteredRows);
      }
    } else if (input.variant_ids && input.variant_ids.length > 0) {
      for (const vid of input.variant_ids) {
        targetVariants.push({ id: vid, product_id: null });
      }
    }

    let seq = 1;
    for (const variant of targetVariants) {
      if (variant.barcode && !input.overwrite) {
        // Ensure a BarcodeTag exists even when variant already has an assigned barcode
        const existingTags = await barcodeService.listBarcodeTags(
          { code: variant.barcode },
          { take: 1 },
        );
        if (!existingTags[0]) {
          const parsedExisting = parseBarcode(variant.barcode);
          const tag = await barcodeService.createOrUpdateBarcodeTag({
            code: variant.barcode,
            target_type: "variant",
            target_id: variant.id,
            product_id: variant.product_id ?? null,
            variant_id: variant.id,
            label: variant.title ?? variant.id,
            symbology:
              parsedExisting.type === "unknown"
                ? "code128"
                : parsedExisting.type,
            scan_action: "view",
          });
          createdTagIds.push(tag.id);
        }
        continue;
      }

      previousVariants.push({
        id: variant.id,
        barcode: variant.barcode ?? null,
        ean: variant.ean ?? null,
        upc: variant.upc ?? null,
      });

      const codeInfo = await barcodeService.generateInternalVariantBarcode({
        seed: variant.id,
        sequence: seq++,
        prefix: input.prefix,
      });

      if (
        productService &&
        typeof productService.upsertProductVariants === "function"
      ) {
        await productService.upsertProductVariants([
          {
            id: variant.id,
            barcode: codeInfo.barcode,
            ean: codeInfo.ean,
            upc: codeInfo.upc,
          },
        ]);
      }

      const tag = await barcodeService.createOrUpdateBarcodeTag({
        code: codeInfo.barcode,
        target_type: "variant",
        target_id: variant.id,
        product_id: variant.product_id ?? null,
        variant_id: variant.id,
        label: variant.title ?? variant.id,
        symbology: "ean13",
        scan_action: "view",
      });
      createdTagIds.push(tag.id);

      generated.push({
        variant_id: variant.id,
        product_id: variant.product_id ?? null,
        barcode: codeInfo.barcode,
        ean: codeInfo.ean,
        upc: codeInfo.upc,
      });
    }

    return new StepResponse(
      {
        generated_count: generated.length,
        generated,
      },
      {
        createdTagIds,
        previousVariants,
      },
    );
  },
  async (compInput, { container }) => {
    if (!compInput) return;
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;

    if (compInput.createdTagIds.length > 0) {
      await barcodeService.deleteBarcodeTags(compInput.createdTagIds);
    }

    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ]);
    if (
      productService &&
      typeof productService.upsertProductVariants === "function" &&
      compInput.previousVariants.length > 0
    ) {
      await productService.upsertProductVariants(compInput.previousVariants);
    }
  },
);

export const bulkGenerateVariantBarcodesWorkflow = createWorkflow(
  "bulk-generate-variant-barcodes",
  (input: BulkGenerateVariantBarcodesInput) => {
    const result = bulkGenerateVariantBarcodesStep(input);
    return new WorkflowResponse(result);
  },
);

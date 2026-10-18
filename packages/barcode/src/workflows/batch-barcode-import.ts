import { Modules } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import type { BarcodeModuleService } from "../modules/barcode/service";
import {
  BARCODE_EVENTS,
  BARCODE_MODULE,
  type EnrichmentStrategy,
  type NormalizedBarcodeProduct,
  type VariantPriceInput,
} from "../modules/barcode/types";
import { mapToMedusaCreateProduct } from "../modules/barcode/utils/normalize-product";
import { tryResolveService } from "./helpers";

export interface BatchBarcodeImportInput {
  barcodes: string[];
  status?: "draft" | "published";
  publishImmediately?: boolean;
  strategy?: EnrichmentStrategy;
  createMissingAsDraft?: boolean;
  prices?: VariantPriceInput[];
  salesChannelIds?: string[];
  categoryIds?: string[];
  collectionId?: string | null;
}

const batchBarcodeImportStep = createStep(
  "batch-barcode-import",
  async (input: BatchBarcodeImportInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;
    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ]);
    const eventBus = tryResolveService(container, [
      Modules.EVENT_BUS,
      "event_bus",
    ]);

    const imported: Array<{
      barcode: string;
      product_id: string;
      variant_id: string | null;
      name: string;
      provider: string;
    }> = [];
    const notFound: string[] = [];
    const errors: Array<{ barcode: string; error: string }> = [];
    const createdBarcodeProductIds: string[] = [];
    const createdMedusaProductIds: string[] = [];

    const uniqueBarcodes = Array.from(
      new Set(input.barcodes.map((b) => String(b).trim()).filter(Boolean)),
    ).slice(0, 100);

    for (const rawBarcode of uniqueBarcodes) {
      try {
        const lookup = await barcodeService.lookupBarcode(rawBarcode, {
          strategy: input.strategy,
        });

        if (!lookup.found && !input.createMissingAsDraft) {
          notFound.push(lookup.barcode);
          continue;
        }

        const normalized: NormalizedBarcodeProduct = lookup.product || {
          barcode: lookup.barcode,
          barcode_type: lookup.parsed.type,
          name: `Draft Product ${lookup.barcode}`,
          description: null,
          brand: null,
          manufacturer: null,
          categories: [],
          images: [],
          weight: null,
          weight_unit: null,
          dimensions: null,
          quantity_label: null,
          ingredients: null,
          nutrition: null,
          country_of_origin: null,
          suggested_price: null,
          currency_code: "USD",
          isbn: null,
          authors: [],
          publisher: null,
          published_date: null,
          page_count: null,
          provider: "manual",
          raw_data: {},
        };

        const createPayload = mapToMedusaCreateProduct(normalized, {
          status: input.status || "draft",
          publishImmediately: input.publishImmediately,
          prices: input.prices,
          salesChannelIds: input.salesChannelIds,
          categoryIds: input.categoryIds,
          collectionId: input.collectionId ?? undefined,
        });

        let productId = `prod_${lookup.barcode}`;
        let variantId: string | null = `variant_${lookup.barcode}`;

        if (
          productService &&
          typeof productService.createProducts === "function"
        ) {
          const created = await productService.createProducts([createPayload]);
          const first = Array.isArray(created) ? created[0] : created;
          if (first && typeof first === "object" && "id" in first) {
            productId = String((first as { id: string }).id);
            const variants = (first as { variants?: Array<{ id?: string }> })
              .variants;
            variantId = variants?.[0]?.id ? String(variants[0].id) : null;
            createdMedusaProductIds.push(productId);
          }
        }

        const link = await barcodeService.upsertBarcodeProductLink({
          barcode: lookup.barcode,
          product_id: productId,
          variant_id: variantId,
          provider: normalized.provider,
          product_data: normalized,
          status: "created",
        });
        createdBarcodeProductIds.push(link.id);

        if (eventBus && typeof eventBus.emit === "function") {
          try {
            await eventBus.emit({
              name: BARCODE_EVENTS.PRODUCT_CREATED,
              data: {
                barcode: lookup.barcode,
                product_id: productId,
                variant_id: variantId,
                provider: normalized.provider,
              },
            });
          } catch {
            // Non-fatal
          }
        }

        imported.push({
          barcode: lookup.barcode,
          product_id: productId,
          variant_id: variantId,
          name: normalized.name,
          provider: normalized.provider,
        });
      } catch (err) {
        errors.push({
          barcode: rawBarcode,
          error: err instanceof Error ? err.message : "Import failed",
        });
      }
    }

    return new StepResponse(
      {
        total_requested: uniqueBarcodes.length,
        imported_count: imported.length,
        not_found_count: notFound.length,
        error_count: errors.length,
        imported,
        not_found: notFound,
        errors,
      },
      {
        createdBarcodeProductIds,
        createdMedusaProductIds,
      },
    );
  },
  async (compInput, { container }) => {
    if (!compInput) return;
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;

    if (compInput.createdBarcodeProductIds.length > 0) {
      await barcodeService.deleteBarcodeProducts(
        compInput.createdBarcodeProductIds,
      );
    }

    if (compInput.createdMedusaProductIds.length > 0) {
      const productService = tryResolveService(container, [
        Modules.PRODUCT,
        "product",
      ]);
      if (
        productService &&
        typeof productService.deleteProducts === "function"
      ) {
        await productService.deleteProducts(compInput.createdMedusaProductIds);
      }
    }
  },
);

export const batchBarcodeImportWorkflow = createWorkflow(
  "batch-barcode-import",
  (input: BatchBarcodeImportInput) => {
    const result = batchBarcodeImportStep(input);
    return new WorkflowResponse(result);
  },
);

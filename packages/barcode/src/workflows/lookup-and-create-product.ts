import { Modules } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { downloadProductImageBuffer } from "../modules/barcode/providers";
import type { BarcodeModuleService } from "../modules/barcode/service";
import {
  BARCODE_EVENTS,
  BARCODE_MODULE,
  type BarcodeLookupChainResult,
  type CreateProductPayload,
  type LookupAndCreateProductInput,
  type NormalizedBarcodeProduct,
} from "../modules/barcode/types";
import { mapToMedusaCreateProduct } from "../modules/barcode/utils/normalize-product";
import { tryResolveService } from "./helpers";

export type { LookupAndCreateProductInput };

type LookupAndCreateProductOutput = {
  created: boolean;
  existing: boolean;
  product: Record<string, unknown> | null;
  lookup: BarcodeLookupChainResult;
  product_id: string;
  variant_id: string | null;
  product_payload: CreateProductPayload | null;
  barcode_product: Awaited<
    ReturnType<BarcodeModuleService["upsertBarcodeProductLink"]>
  >;
};

type LookupAndCreateProductCompensation = {
  barcodeProductId: string | null;
  createdProductId: string | null;
};

const lookupAndCreateProductStep = createStep(
  "lookup-and-create-product",
  async (
    input: LookupAndCreateProductInput,
    { container },
  ): Promise<
    StepResponse<
      LookupAndCreateProductOutput,
      LookupAndCreateProductCompensation
    >
  > => {
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;
    const moduleOptions = await barcodeService.getModuleOptions();
    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ]);

    // Self-healing existing product check
    if (input.skipExistingCheck !== true) {
      const existingMapping = await barcodeService.findBarcodeProduct(
        input.barcode,
      );
      if (existingMapping) {
        if (
          productService &&
          typeof productService.listProducts === "function"
        ) {
          const existingProducts = (await productService.listProducts({
            id: [existingMapping.product_id],
          })) as Array<Record<string, unknown>>;
          const foundExisting = Array.isArray(existingProducts)
            ? (existingProducts.find(
                (p) => p.id === existingMapping.product_id,
              ) ?? existingProducts[0])
            : null;
          if (foundExisting) {
            const parsed = await barcodeService.parseAndValidateBarcode(
              input.barcode,
            );
            const cachedProduct =
              (existingMapping.product_data as unknown as NormalizedBarcodeProduct) ||
              null;
            return new StepResponse(
              {
                created: false,
                existing: true,
                product: foundExisting,
                product_id: existingMapping.product_id,
                variant_id: existingMapping.variant_id ?? null,
                product_payload: null,
                barcode_product: existingMapping,
                lookup: {
                  barcode: existingMapping.barcode,
                  parsed,
                  found: Boolean(cachedProduct),
                  cached: true,
                  strategy:
                    input.strategy ||
                    moduleOptions.enrichmentStrategy ||
                    "first-hit",
                  product: cachedProduct,
                  outcomes: [],
                },
              },
              {
                barcodeProductId: null,
                createdProductId: null,
              },
            );
          }
          // Product was deleted in Medusa — self-heal stale BarcodeProduct link
          await barcodeService.removeBarcodeProduct(input.barcode);
        }
      }
    }

    const lookupResult = await barcodeService.lookupBarcode(input.barcode, {
      skipCache: input.skipCache,
      strategy: input.strategy || moduleOptions.enrichmentStrategy,
    });

    const normalized: NormalizedBarcodeProduct = lookupResult.product || {
      barcode: lookupResult.barcode,
      barcode_type: lookupResult.parsed.type,
      name: input.overrideTitle || `Product ${lookupResult.barcode}`,
      description: input.overrideDescription || null,
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
      suggested_price: input.overridePrice ?? null,
      currency_code: input.currencyCode || "USD",
      isbn: lookupResult.parsed.isIsbn ? lookupResult.barcode : null,
      authors: [],
      publisher: null,
      published_date: null,
      page_count: null,
      provider: "manual",
      raw_data: {},
    };

    // Optional File Module image upload
    const shouldDownload =
      input.downloadImages ?? moduleOptions.downloadProductImages ?? false;
    if (shouldDownload && normalized.images.length > 0) {
      const fileService = tryResolveService(container, [Modules.FILE, "file"]);
      if (fileService && typeof fileService.createFiles === "function") {
        const uploadedUrls: string[] = [];
        for (const imageUrl of normalized.images.slice(0, 3)) {
          const downloaded = await downloadProductImageBuffer(imageUrl);
          if (downloaded) {
            try {
              const createdFiles = (await fileService.createFiles([
                {
                  filename: downloaded.filename,
                  mimeType: downloaded.mimeType,
                  content: downloaded.buffer.toString("base64"),
                  access: "public",
                },
              ])) as Array<{ url?: string }>;
              if (createdFiles?.[0]?.url) {
                uploadedUrls.push(createdFiles[0].url);
              }
            } catch {
              uploadedUrls.push(imageUrl);
            }
          }
        }
        if (uploadedUrls.length > 0) {
          normalized.images = uploadedUrls;
        }
      }
    }

    const createPayload = mapToMedusaCreateProduct(normalized, {
      status: input.status || moduleOptions.defaultProductStatus || "draft",
      publishImmediately: input.publishImmediately,
      skuPrefix: input.skuPrefix || "GTIN",
      overrideTitle: input.overrideTitle,
      overrideDescription: input.overrideDescription,
      overridePrice: input.overridePrice,
      currencyCode: input.currencyCode,
      prices: input.prices,
      salesChannelIds: input.salesChannelIds,
      categoryIds: input.categoryIds,
      collectionId: input.collectionId,
    });

    let createdProductId = `prod_${lookupResult.barcode}`;
    let createdVariantId: string | null = `variant_${lookupResult.barcode}`;
    let createdProductObj: Record<string, unknown> | null = null;
    let createdInProductModule = false;

    if (productService && typeof productService.createProducts === "function") {
      const created = await productService.createProducts([createPayload]);
      const firstProduct = Array.isArray(created) ? created[0] : created;
      if (
        firstProduct &&
        typeof firstProduct === "object" &&
        "id" in firstProduct
      ) {
        createdProductObj = firstProduct as Record<string, unknown>;
        createdProductId = String((firstProduct as { id: string }).id);
        const variants = (firstProduct as { variants?: Array<{ id?: string }> })
          .variants;
        createdVariantId = variants?.[0]?.id ? String(variants[0].id) : null;
        createdInProductModule = true;
      }
    }

    const barcodeProduct = await barcodeService.upsertBarcodeProductLink({
      barcode: lookupResult.barcode,
      product_id: createdProductId,
      variant_id: createdVariantId,
      provider: normalized.provider,
      product_data: normalized,
      status: "created",
    });

    const eventBus = tryResolveService(container, [
      Modules.EVENT_BUS,
      "event_bus",
    ]);
    if (eventBus && typeof eventBus.emit === "function") {
      try {
        await eventBus.emit({
          name: BARCODE_EVENTS.PRODUCT_CREATED,
          data: {
            barcode: lookupResult.barcode,
            product_id: createdProductId,
            variant_id: createdVariantId,
            provider: normalized.provider,
          },
        });
      } catch {
        // Non-fatal if event bus fails
      }
    }

    return new StepResponse(
      {
        created: true,
        existing: false,
        product: createdProductObj,
        lookup: lookupResult,
        product_id: createdProductId,
        variant_id: createdVariantId,
        product_payload: createPayload,
        barcode_product: barcodeProduct,
      },
      {
        barcodeProductId: barcodeProduct.id,
        createdProductId: createdInProductModule ? createdProductId : null,
      },
    );
  },
  async (compInput, { container }) => {
    if (!compInput) return;
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;

    if (compInput.barcodeProductId) {
      await barcodeService.deleteBarcodeProducts([compInput.barcodeProductId]);
    }
    if (compInput.createdProductId) {
      const productService = tryResolveService(container, [
        Modules.PRODUCT,
        "product",
      ]);
      if (
        productService &&
        typeof productService.deleteProducts === "function"
      ) {
        await productService.deleteProducts([compInput.createdProductId]);
      }
    }
  },
);

export const lookupAndCreateProductWorkflow = createWorkflow(
  "lookup-and-create-product",
  (input: LookupAndCreateProductInput) => {
    const result = lookupAndCreateProductStep(input);
    return new WorkflowResponse(result);
  },
);

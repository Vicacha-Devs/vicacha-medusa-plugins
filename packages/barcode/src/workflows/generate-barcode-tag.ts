import { Modules } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import type { BarcodeModuleService } from "../modules/barcode/service";
import {
  BARCODE_MODULE,
  type BarcodeScanAction,
  type BarcodeSymbology,
} from "../modules/barcode/types";
import { tryResolveService } from "./helpers";

export interface GenerateBarcodeTagInput {
  code?: string;
  target_type?: "product" | "variant" | "order" | "custom";
  target_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  label?: string | null;
  symbology?: BarcodeSymbology;
  scan_action?: BarcodeScanAction;
  gs1_gtin?: string | null;
  batch_lot?: string | null;
  serial_number?: string | null;
  target_url?: string | null;
  upload_svg_to_file_module?: boolean;
  metadata?: Record<string, unknown> | null;
}

const generateBarcodeTagStep = createStep(
  "generate-barcode-tag",
  async (input: GenerateBarcodeTagInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;

    const tag = await barcodeService.createOrUpdateBarcodeTag(input);

    if (input.upload_svg_to_file_module && tag.svg_markup) {
      const fileService = tryResolveService(container, [Modules.FILE, "file"]);
      if (fileService && typeof fileService.createFiles === "function") {
        try {
          const uploaded = (await fileService.createFiles([
            {
              filename: `${tag.code}.svg`,
              mimeType: "image/svg+xml",
              content: Buffer.from(tag.svg_markup, "utf-8").toString("base64"),
              access: "public",
            },
          ])) as Array<{ url?: string }>;
          if (uploaded?.[0]?.url) {
            const updated = await barcodeService.updateBarcodeTags({
              id: tag.id,
              svg_url: uploaded[0].url,
            });
            return new StepResponse(updated, { tagId: updated.id });
          }
        } catch {
          // Non-fatal if File Module is not configured
        }
      }
    }

    return new StepResponse(tag, { tagId: tag.id });
  },
  async (compInput, { container }) => {
    if (!compInput?.tagId) return;
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;
    await barcodeService.deleteBarcodeTags([compInput.tagId]);
  },
);

export const generateBarcodeTagWorkflow = createWorkflow(
  "generate-barcode-tag",
  (input: GenerateBarcodeTagInput) => {
    const tag = generateBarcodeTagStep(input);
    return new WorkflowResponse(tag);
  },
);

import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import type { BarcodeModuleService } from "../modules/barcode/service";
import { BARCODE_MODULE } from "../modules/barcode/types";

export interface ScanInventoryCountInput {
  session_id: string;
  barcode: string;
  delta?: number;
  set_quantity?: number;
  variant_id?: string | null;
  product_id?: string | null;
  title?: string;
  variant_title?: string | null;
  sku?: string | null;
  expected_quantity?: number;
}

const scanInventoryCountStep = createStep(
  "scan-inventory-count",
  async (input: ScanInventoryCountInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;

    const result = await barcodeService.recordCountSessionScan(input);
    return new StepResponse(result, {
      sessionId: input.session_id,
      itemId: result.item.id,
    });
  },
);

export const scanInventoryCountWorkflow = createWorkflow(
  "scan-inventory-count",
  (input: ScanInventoryCountInput) => {
    const result = scanInventoryCountStep(input);
    return new WorkflowResponse(result);
  },
);

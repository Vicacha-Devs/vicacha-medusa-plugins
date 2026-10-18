import { Modules } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import type { BarcodeModuleService } from "../modules/barcode/service";
import { BARCODE_MODULE } from "../modules/barcode/types";
import { tryResolveService } from "./helpers";

export interface ApplyInventoryCountInput {
  session_id: string;
  location_id?: string | null;
}

const applyInventoryCountStep = createStep(
  "apply-inventory-count",
  async (input: ApplyInventoryCountInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;

    const completed = await barcodeService.completeCountSession(
      input.session_id,
    );
    const inventoryService = tryResolveService(container, [
      Modules.INVENTORY,
      "inventory",
    ]);

    const adjustments: Array<{
      barcode: string;
      variant_id: string | null;
      expected_quantity: number;
      counted_quantity: number;
      variance: number;
      applied_to_inventory_module: boolean;
    }> = [];

    const locationId =
      input.location_id || completed.session.location_id || null;

    for (const item of completed.items) {
      const variance = Number(item.variance || 0);
      let applied = false;

      if (
        variance !== 0 &&
        locationId &&
        item.sku &&
        inventoryService &&
        typeof inventoryService.listInventoryItems === "function" &&
        typeof inventoryService.updateInventoryLevels === "function"
      ) {
        try {
          const invItems = (await inventoryService.listInventoryItems(
            { sku: item.sku },
            { take: 1 },
          )) as Array<{ id: string }>;
          if (invItems?.[0]?.id) {
            await inventoryService.updateInventoryLevels([
              {
                inventory_item_id: invItems[0].id,
                location_id: locationId,
                stocked_quantity: Number(item.counted_quantity || 0),
              },
            ]);
            applied = true;
          }
        } catch {
          applied = false;
        }
      }

      adjustments.push({
        barcode: item.barcode,
        variant_id: item.variant_id ?? null,
        expected_quantity: Number(item.expected_quantity || 0),
        counted_quantity: Number(item.counted_quantity || 0),
        variance,
        applied_to_inventory_module: applied,
      });
    }

    return new StepResponse(
      {
        session: completed.session,
        adjustments_count: adjustments.length,
        adjustments,
      },
      { sessionId: input.session_id },
    );
  },
  async (compInput, { container }) => {
    if (!compInput?.sessionId) return;
    const barcodeService = container.resolve(
      BARCODE_MODULE,
    ) as BarcodeModuleService;
    await barcodeService.updateBarcodeCountSessions({
      id: compInput.sessionId,
      status: "in_progress",
      completed_at: null,
    });
  },
);

export const applyInventoryCountWorkflow = createWorkflow(
  "apply-inventory-count",
  (input: ApplyInventoryCountInput) => {
    const result = applyInventoryCountStep(input);
    return new WorkflowResponse(result);
  },
);

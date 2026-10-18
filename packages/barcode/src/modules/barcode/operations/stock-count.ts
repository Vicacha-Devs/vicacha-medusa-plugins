import { MedusaError } from "@medusajs/framework/utils";

import type { BarcodeOpsContext } from "./context";
import { parseBarcode } from "../utils/barcode-parser";

/**
 * Creates a new stock-take inventory count session (`BarcodeCountSession`).
 */
export async function createStockCountSession(
  ctx: BarcodeOpsContext,
  input: {
    name: string;
    location_id?: string | null;
    notes?: string | null;
    created_by?: string | null;
    expected_items?: Array<{
      barcode: string;
      variant_id?: string | null;
      product_id?: string | null;
      title: string;
      variant_title?: string | null;
      sku?: string | null;
      expected_quantity: number;
    }>;
  },
) {
  if (!input.name || !input.name.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Session name is required",
    );
  }

  const expectedItems = input.expected_items || [];
  const totalExpected = expectedItems.reduce(
    (sum, item) => sum + Math.max(0, Number(item.expected_quantity || 0)),
    0,
  );

  const session = await ctx.svc.createBarcodeCountSessions({
    name: input.name.trim(),
    location_id: input.location_id ?? null,
    status: "in_progress",
    notes: input.notes ?? null,
    total_expected: totalExpected,
    total_counted: 0,
    total_variance: -totalExpected,
    total_scans: 0,
    created_by: input.created_by ?? null,
  });

  const createdItems: Array<
    Awaited<ReturnType<typeof ctx.svc.createBarcodeCountItems>>[number]
  > = [];
  for (const item of expectedItems) {
    const parsed = parseBarcode(item.barcode);
    const expectedQty = Math.max(0, Number(item.expected_quantity || 0));
    const created = await ctx.svc.createBarcodeCountItems({
      session_id: session.id,
      barcode: parsed.normalized,
      variant_id: item.variant_id ?? null,
      product_id: item.product_id ?? null,
      title: item.title,
      variant_title: item.variant_title ?? null,
      sku: item.sku ?? null,
      expected_quantity: expectedQty,
      counted_quantity: 0,
      variance: -expectedQty,
    });
    createdItems.push(created);
  }

  return {
    session,
    items: createdItems,
  };
}

/**
 * Records a barcode scan inside a `BarcodeCountSession` and recalculates session variance totals.
 */
export async function recordCountSessionScan(
  ctx: BarcodeOpsContext,
  input: {
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
  },
) {
  const sessions = await ctx.svc.listBarcodeCountSessions(
    { id: input.session_id },
    { take: 1 },
  );
  const session = sessions[0];
  if (!session) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Count session ${input.session_id} not found`,
    );
  }
  if (session.status !== "in_progress") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Count session ${input.session_id} is already ${session.status}`,
    );
  }

  const parsed = parseBarcode(input.barcode);
  const existingItems = await ctx.svc.listBarcodeCountItems(
    { session_id: input.session_id, barcode: parsed.normalized },
    { take: 1 },
  );

  let item = existingItems[0];
  if (item) {
    const nextCounted =
      typeof input.set_quantity === "number"
        ? Math.max(0, input.set_quantity)
        : Math.max(0, Number(item.counted_quantity || 0) + (input.delta ?? 1));
    const expected = Number(item.expected_quantity || 0);
    item = await ctx.svc.updateBarcodeCountItems({
      id: item.id,
      counted_quantity: nextCounted,
      variance: nextCounted - expected,
      last_scanned_at: new Date(),
    });
  } else {
    const expected = Math.max(0, Number(input.expected_quantity || 0));
    const counted =
      typeof input.set_quantity === "number"
        ? Math.max(0, input.set_quantity)
        : Math.max(0, input.delta ?? 1);
    item = await ctx.svc.createBarcodeCountItems({
      session_id: input.session_id,
      barcode: parsed.normalized,
      variant_id: input.variant_id ?? null,
      product_id: input.product_id ?? null,
      title: input.title || `Scanned Item (${parsed.normalized})`,
      variant_title: input.variant_title ?? null,
      sku: input.sku ?? null,
      expected_quantity: expected,
      counted_quantity: counted,
      variance: counted - expected,
      last_scanned_at: new Date(),
    });
  }

  const allItems = await ctx.svc.listBarcodeCountItems(
    { session_id: input.session_id },
    { take: 1000 },
  );
  const totalExpected = allItems.reduce(
    (sum, row) => sum + Number(row.expected_quantity || 0),
    0,
  );
  const totalCounted = allItems.reduce(
    (sum, row) => sum + Number(row.counted_quantity || 0),
    0,
  );
  const totalVariance = totalCounted - totalExpected;
  const updatedSession = await ctx.svc.updateBarcodeCountSessions({
    id: session.id,
    total_expected: totalExpected,
    total_counted: totalCounted,
    total_variance: totalVariance,
    total_scans: Number(session.total_scans || 0) + 1,
  });

  return {
    session: updatedSession,
    item,
    items: allItems,
  };
}

/**
 * Marks a count session as completed.
 */
export async function completeCountSession(
  ctx: BarcodeOpsContext,
  sessionId: string,
) {
  const sessions = await ctx.svc.listBarcodeCountSessions(
    { id: sessionId },
    { take: 1 },
  );
  const session = sessions[0];
  if (!session) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Count session ${sessionId} not found`,
    );
  }

  const items = await ctx.svc.listBarcodeCountItems(
    { session_id: sessionId },
    { take: 1000 },
  );

  const updated = await ctx.svc.updateBarcodeCountSessions({
    id: sessionId,
    status: "completed",
    completed_at: new Date(),
  });

  return {
    session: updated,
    items,
  };
}

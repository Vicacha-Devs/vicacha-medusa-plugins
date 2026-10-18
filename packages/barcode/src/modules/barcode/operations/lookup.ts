import { MedusaError } from "@medusajs/framework/utils";

import type { BarcodeOpsContext } from "./context";
import { runProviderLookupChain } from "../providers";
import type {
  BarcodeLookupChainResult,
  EnrichmentStrategy,
  NormalizedBarcodeProduct,
} from "../types";
import { parseBarcode } from "../utils/barcode-parser";

export async function parseAndValidateBarcode(rawBarcode: string) {
  if (!rawBarcode || !String(rawBarcode).trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Barcode value is required",
    );
  }
  return parseBarcode(rawBarcode);
}

/**
 * Looks up a barcode across the configured provider chain with caching.
 */
export async function lookupBarcode(
  ctx: BarcodeOpsContext,
  rawBarcode: string,
  lookupOptions: {
    skipCache?: boolean;
    strategy?: EnrichmentStrategy;
    providers?: string[];
  } = {},
): Promise<BarcodeLookupChainResult> {
  const parsed = await parseAndValidateBarcode(rawBarcode);
  const strategy =
    lookupOptions.strategy || ctx.options.enrichmentStrategy || "first-hit";

  const useCache =
    ctx.options.cacheEnabled !== false && !lookupOptions.skipCache;

  if (useCache) {
    try {
      const cachedRows = await ctx.svc.listBarcodeCaches(
        { barcode: parsed.normalized },
        { take: 1 },
      );
      const cached = cachedRows[0];
      if (cached && cached.expires_at) {
        const expiresAt = new Date(cached.expires_at);
        if (expiresAt.getTime() > Date.now()) {
          const nextHits = Number(cached.hit_count || 0) + 1;
          await ctx.svc.updateBarcodeCaches({
            id: cached.id,
            hit_count: nextHits,
          });

          const cachedProduct = cached.found
            ? (cached.response_data as unknown as NormalizedBarcodeProduct)
            : null;

          return {
            barcode: parsed.normalized,
            parsed,
            found: Boolean(cached.found && cachedProduct),
            cached: true,
            strategy,
            product: cachedProduct,
            outcomes: [
              {
                provider: cached.provider || "cache",
                found: Boolean(cached.found && cachedProduct),
                durationMs: 0,
                product: cachedProduct,
              },
            ],
          };
        }
      }
    } catch {
      // Fallback to live lookup if cache query fails
    }
  }

  const result = await runProviderLookupChain(parsed.normalized, ctx.registry, {
    strategy,
    preferredProviders: lookupOptions.providers,
  });

  if (ctx.options.cacheEnabled !== false) {
    const ttlSeconds = ctx.options.cacheTtlSeconds ?? 86400;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    try {
      const existing = await ctx.svc.listBarcodeCaches(
        { barcode: parsed.normalized },
        { take: 1 },
      );
      const payload = {
        barcode: parsed.normalized,
        barcode_type: parsed.type,
        provider:
          result.product?.provider ||
          result.outcomes.map((o) => o.provider).join(",") ||
          "none",
        found: result.found,
        response_data: (result.product || {}) as unknown as Record<
          string,
          unknown
        >,
        expires_at: expiresAt,
        hit_count: existing[0] ? Number(existing[0].hit_count || 0) + 1 : 1,
      };

      if (existing[0]) {
        await ctx.svc.updateBarcodeCaches({
          id: existing[0].id,
          ...payload,
        });
      } else {
        await ctx.svc.createBarcodeCaches(payload);
      }
    } catch {
      // Non-fatal cache write failure
    }
  }

  return result;
}

/**
 * Finds an existing `BarcodeProduct` mapping for a normalized barcode.
 */
export async function findBarcodeProduct(
  ctx: BarcodeOpsContext,
  rawBarcode: string,
) {
  const parsed = await parseAndValidateBarcode(rawBarcode);
  const rows = await ctx.svc.listBarcodeProducts(
    { barcode: parsed.normalized },
    { take: 1 },
  );
  return rows[0] || null;
}

/**
 * Removes `BarcodeProduct` mapping(s) for a normalized barcode.
 */
export async function removeBarcodeProduct(
  ctx: BarcodeOpsContext,
  rawBarcode: string,
): Promise<{ deleted_count: number }> {
  const parsed = await parseAndValidateBarcode(rawBarcode);
  const rows = await ctx.svc.listBarcodeProducts(
    { barcode: parsed.normalized },
    { take: 50 },
  );
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    await ctx.svc.deleteBarcodeProducts(ids);
  }
  return { deleted_count: ids.length };
}

/**
 * Creates or updates a `BarcodeProduct` mapping between a GTIN/barcode and a Medusa Product/Variant.
 */
export async function upsertBarcodeProductLink(
  ctx: BarcodeOpsContext,
  input: {
    barcode: string;
    product_id: string;
    variant_id?: string | null;
    provider: string;
    product_data: NormalizedBarcodeProduct;
    status?: "created" | "linked" | "updated";
  },
) {
  const parsed = parseBarcode(input.barcode);
  const existing = await ctx.svc.listBarcodeProducts(
    { barcode: parsed.normalized },
    { take: 1 },
  );

  const payload = {
    barcode: parsed.normalized,
    barcode_type: parsed.type,
    product_id: input.product_id,
    variant_id: input.variant_id ?? null,
    provider: input.provider,
    product_data: input.product_data as unknown as Record<string, unknown>,
    last_synced_at: new Date(),
    status: input.status || (existing[0] ? "updated" : "created"),
  };

  if (existing[0]) {
    return await ctx.svc.updateBarcodeProducts({
      id: existing[0].id,
      ...payload,
    });
  }

  return await ctx.svc.createBarcodeProducts(payload);
}

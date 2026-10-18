import type { BarcodeOpsContext } from "./context";

/**
 * Purges expired entries from `BarcodeCache`.
 */
export async function purgeExpiredCache(
  ctx: BarcodeOpsContext,
): Promise<{ purged_count: number }> {
  const allCache = await ctx.svc.listBarcodeCaches({}, { take: 1000 });
  const now = Date.now();
  const expiredIds = allCache
    .filter(
      (row) => row.expires_at && new Date(row.expires_at).getTime() <= now,
    )
    .map((row) => row.id);

  if (expiredIds.length > 0) {
    await ctx.svc.deleteBarcodeCaches(expiredIds);
  }

  return { purged_count: expiredIds.length };
}

/**
 * Returns a dashboard analytics overview across products, tags, cache, and stock-take sessions.
 */
export async function getAnalyticsOverview(ctx: BarcodeOpsContext) {
  const [products, tags, caches, sessions] = await Promise.all([
    ctx.svc.listBarcodeProducts({}, { take: 1000 }),
    ctx.svc.listBarcodeTags({}, { take: 1000 }),
    ctx.svc.listBarcodeCaches({}, { take: 1000 }),
    ctx.svc.listBarcodeCountSessions({}, { take: 200 }),
  ]);

  const totalTagScans = tags.reduce(
    (sum, t) => sum + Number(t.scan_count || 0),
    0,
  );
  const totalCacheHits = caches.reduce(
    (sum, c) => sum + Number(c.hit_count || 0),
    0,
  );

  return {
    total_barcode_products: products.length,
    total_barcode_tags: tags.length,
    total_tag_scans: totalTagScans,
    total_cached_lookups: caches.length,
    total_cache_hits: totalCacheHits,
    total_count_sessions: sessions.length,
    active_providers: ctx.registry.getProviderNames(),
  };
}

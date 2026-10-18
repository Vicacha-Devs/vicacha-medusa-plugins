import { MedusaError, Modules } from "@medusajs/framework/utils";

import type { BarcodeOpsContext } from "./context";
import type { BarcodeScanAction, BarcodeSymbology } from "../types";
import {
  buildGs1DigitalLink,
  generateInternalEan13,
  parseBarcode,
} from "../utils/barcode-parser";
import {
  createAuthenticityHmac,
  generateShortScanCode,
  verifyAuthenticityHmac,
} from "../utils/security";
import { renderBarcodeSvg } from "../utils/svg-renderer";

/**
 * Creates or updates a dynamic `BarcodeTag` (1D barcode or 2D QR/DataMatrix token)
 * with storefront scan action, optional GS1 Digital Link, and HMAC-SHA256 anti-counterfeit signature.
 */
export async function createOrUpdateBarcodeTag(
  ctx: BarcodeOpsContext,
  input: {
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
    svg_url?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  if (!input.target_id || !String(input.target_id).trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "target_id is required to create a BarcodeTag",
    );
  }

  const symbology: BarcodeSymbology = input.symbology || "qr";
  const scanAction: BarcodeScanAction = input.scan_action || "view";
  const targetType = input.target_type || "product";

  let code = input.code?.trim() || "";
  if (!code) {
    if (symbology === "ean13") {
      code = generateInternalEan13(
        `${targetType}:${input.target_id}`,
        ctx.options.internalBarcodePrefix || "200",
      );
    } else {
      code = generateShortScanCode("mpb");
    }
  }

  const hmacSignature = createAuthenticityHmac(
    {
      code,
      targetId: input.target_id,
      serialNumber: input.serial_number ?? null,
      batchLot: input.batch_lot ?? null,
    },
    ctx.hmacSecret,
  );

  const baseUrl = (
    ctx.options.storefrontBaseUrl || "https://store.example.com"
  ).replace(/\/$/, "");

  let resolvedUrl = input.target_url || null;
  if (!resolvedUrl) {
    if (scanAction === "gs1_digital_link" && (input.gs1_gtin || code)) {
      resolvedUrl = buildGs1DigitalLink({
        baseUrl,
        gtin: input.gs1_gtin || code,
        batchLot: input.batch_lot,
        serial: input.serial_number,
      });
    } else if (scanAction === "verify") {
      resolvedUrl = `${baseUrl}/barcodes/${encodeURIComponent(
        code,
      )}/verify?sig=${encodeURIComponent(hmacSignature)}`;
    } else if (scanAction === "add_to_cart") {
      const variantParam = input.variant_id || input.target_id;
      resolvedUrl = `${baseUrl}/cart/add?variant_id=${encodeURIComponent(
        variantParam,
      )}&code=${encodeURIComponent(code)}`;
    } else {
      resolvedUrl = `${baseUrl}/products/${encodeURIComponent(
        input.product_id || input.target_id,
      )}?code=${encodeURIComponent(code)}`;
    }
  }

  const encodedPayload =
    symbology === "qr" || symbology === "datamatrix" ? resolvedUrl : code;

  const svgMarkup = renderBarcodeSvg({
    code: encodedPayload,
    symbology,
    title: input.label || undefined,
    includeText: symbology !== "qr" && symbology !== "datamatrix",
  });

  const existing = await ctx.svc.listBarcodeTags({ code }, { take: 1 });
  const payload = {
    code,
    target_type: targetType,
    target_id: input.target_id,
    product_id: input.product_id ?? null,
    variant_id: input.variant_id ?? null,
    label: input.label ?? null,
    symbology,
    scan_action: scanAction,
    gs1_gtin: input.gs1_gtin ?? null,
    batch_lot: input.batch_lot ?? null,
    serial_number: input.serial_number ?? null,
    hmac_signature: hmacSignature,
    target_url: resolvedUrl,
    svg_markup: svgMarkup,
    svg_url: input.svg_url ?? null,
    is_active: true,
    metadata: input.metadata ?? null,
  };

  if (existing[0]) {
    return await ctx.svc.updateBarcodeTags({
      id: existing[0].id,
      ...payload,
    });
  }

  return await ctx.svc.createBarcodeTags({
    ...payload,
    scan_count: 0,
    last_scanned_at: null,
  });
}

/**
 * Resolves a storefront or admin scan against `BarcodeTag`, `BarcodeProduct`,
 * and optionally Medusa's `ProductVariant` table (`barcode` / `ean` / `upc`),
 * incrementing scan analytics when a tag is matched and optionally hydrating the variant and product.
 */
export async function resolveBarcodeScan(
  ctx: BarcodeOpsContext,
  codeOrBarcode: string,
  options?: {
    scope?: { resolve: (key: string) => unknown };
    hydrateVariant?: boolean;
  },
) {
  const clean = String(codeOrBarcode || "").trim();
  if (!clean) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Scan code is required",
    );
  }

  const parsed = parseBarcode(clean);
  const tags = await ctx.svc.listBarcodeTags({ code: clean }, { take: 1 });
  let tag = tags[0] || null;

  if (tag) {
    const nextCount = Number(tag.scan_count || 0) + 1;
    tag = await ctx.svc.updateBarcodeTags({
      id: tag.id,
      scan_count: nextCount,
      last_scanned_at: new Date(),
    });
  }

  const barcodeProducts = await ctx.svc.listBarcodeProducts(
    { barcode: parsed.normalized },
    { take: 1 },
  );
  const barcodeProduct = barcodeProducts[0] || null;

  let resolvedProductId: string | null =
    tag?.product_id || barcodeProduct?.product_id || null;
  let resolvedVariantId: string | null =
    tag?.variant_id || barcodeProduct?.variant_id || null;
  let hydratedVariant: Record<string, unknown> | null = null;
  let hydratedProduct: Record<string, unknown> | null = null;

  type ProductModuleLike = {
    listProductVariants?: (
      filter: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<Array<Record<string, unknown>>>;
    listProducts?: (
      filter: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<Array<Record<string, unknown>>>;
  };

  let productService: ProductModuleLike | null = null;
  if (options?.scope && typeof options.scope.resolve === "function") {
    for (const key of [Modules.PRODUCT, "product"]) {
      try {
        const svc = options.scope.resolve(key);
        if (svc && typeof svc === "object") {
          productService = svc as ProductModuleLike;
          break;
        }
      } catch {
        // ignore if Product module is not registered in scope
      }
    }
  }

  // Fallback: if neither BarcodeTag nor BarcodeProduct matched, query ProductVariant by barcode/ean/upc
  if (
    !tag &&
    !barcodeProduct &&
    productService &&
    typeof productService.listProductVariants === "function"
  ) {
    const candidateCodes = Array.from(new Set([parsed.normalized, clean]));
    const candidateFields = ["barcode", "ean", "upc"] as const;

    outer: for (const codeCandidate of candidateCodes) {
      for (const field of candidateFields) {
        try {
          const variants = await productService.listProductVariants(
            { [field]: codeCandidate },
            { take: 10 },
          );
          if (Array.isArray(variants) && variants.length > 0) {
            const matched = variants.find(
              (v) =>
                v.barcode === parsed.normalized ||
                v.barcode === clean ||
                v.ean === parsed.normalized ||
                v.ean === clean ||
                v.upc === parsed.normalized ||
                v.upc === clean ||
                (variants.length === 1 &&
                  v.barcode === undefined &&
                  v.ean === undefined &&
                  v.upc === undefined),
            );
            if (matched) {
              hydratedVariant = matched;
              if (matched.id) {
                resolvedVariantId = String(matched.id);
              }
              if (matched.product_id) {
                resolvedProductId = String(matched.product_id);
              }
              break outer;
            }
          }
        } catch {
          // continue trying next field
        }
      }
    }
  }

  // Hydrate variant and product if requested (default true when scope is passed)
  if (productService && options?.hydrateVariant !== false) {
    if (
      !hydratedVariant &&
      resolvedVariantId &&
      typeof productService.listProductVariants === "function"
    ) {
      try {
        const variants = await productService.listProductVariants(
          { id: [resolvedVariantId] },
          { take: 10 },
        );
        if (Array.isArray(variants) && variants.length > 0) {
          hydratedVariant =
            variants.find((v) => v.id === resolvedVariantId) ||
            variants[0] ||
            null;
          if (
            hydratedVariant &&
            !resolvedProductId &&
            hydratedVariant.product_id
          ) {
            resolvedProductId = String(hydratedVariant.product_id);
          }
        }
      } catch {
        // non-fatal hydration error
      }
    }

    if (
      !hydratedProduct &&
      resolvedProductId &&
      typeof productService.listProducts === "function"
    ) {
      try {
        const products = await productService.listProducts(
          { id: [resolvedProductId] },
          { take: 10 },
        );
        if (Array.isArray(products) && products.length > 0) {
          hydratedProduct =
            products.find((p) => p.id === resolvedProductId) ||
            products[0] ||
            null;
          if (
            hydratedProduct &&
            !hydratedVariant &&
            Array.isArray(hydratedProduct.variants)
          ) {
            const productVariants = hydratedProduct.variants as Array<
              Record<string, unknown>
            >;
            const matchedVar =
              (resolvedVariantId
                ? productVariants.find((v) => v.id === resolvedVariantId)
                : undefined) ||
              productVariants.find(
                (v) =>
                  v.barcode === parsed.normalized ||
                  v.barcode === clean ||
                  v.ean === parsed.normalized ||
                  v.upc === parsed.normalized,
              ) ||
              productVariants[0] ||
              null;
            if (matchedVar) {
              hydratedVariant = matchedVar;
              if (!resolvedVariantId && matchedVar.id) {
                resolvedVariantId = String(matchedVar.id);
              }
            }
          }
        }
      } catch {
        // non-fatal hydration error
      }
    }
  }

  return {
    code: clean,
    parsed,
    found: Boolean(tag || barcodeProduct || hydratedVariant || hydratedProduct),
    action: (tag?.scan_action as BarcodeScanAction) || "view",
    target_url: tag?.target_url || null,
    product_id: resolvedProductId,
    variant_id: resolvedVariantId,
    variant: hydratedVariant,
    product: hydratedProduct,
    tag,
    barcode_product: barcodeProduct,
  };
}

/**
 * Verifies an anti-counterfeit HMAC-SHA256 signature for a `BarcodeTag`.
 */
export async function verifyAuthenticityToken(
  ctx: BarcodeOpsContext,
  code: string,
  providedSignature: string,
) {
  const cleanCode = String(code || "").trim();
  if (!cleanCode || !providedSignature) {
    return {
      valid: false,
      code: cleanCode,
      reason: "Missing code or signature",
      tag: null,
    };
  }

  const tags = await ctx.svc.listBarcodeTags({ code: cleanCode }, { take: 1 });
  const tag = tags[0];
  if (!tag || !tag.is_active) {
    return {
      valid: false,
      code: cleanCode,
      reason: "Tag not found or inactive",
      tag: null,
    };
  }

  const isValid = verifyAuthenticityHmac(
    {
      code: tag.code,
      targetId: tag.target_id,
      serialNumber: tag.serial_number,
      batchLot: tag.batch_lot,
    },
    providedSignature,
    ctx.hmacSecret,
  );

  if (isValid) {
    const nextCount = Number(tag.scan_count || 0) + 1;
    const updated = await ctx.svc.updateBarcodeTags({
      id: tag.id,
      scan_count: nextCount,
      last_scanned_at: new Date(),
    });
    return {
      valid: true,
      code: cleanCode,
      reason: "Authentic verified tag",
      tag: updated,
    };
  }

  return {
    valid: false,
    code: cleanCode,
    reason: "Invalid HMAC signature",
    tag: null,
  };
}

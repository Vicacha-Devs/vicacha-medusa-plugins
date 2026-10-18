import {
  BarcodeCache,
  BarcodeCountItem,
  BarcodeCountSession,
  BarcodeLabelTemplate,
  BarcodeProduct,
  BarcodeTag,
} from "./models";
import {
  parseAndValidateBarcode,
  lookupBarcode,
  findBarcodeProduct,
  removeBarcodeProduct,
  upsertBarcodeProductLink,
} from "./operations/lookup";
import {
  generateInternalVariantBarcode,
  renderSvg,
} from "./operations/generation";
import {
  createOrUpdateBarcodeTag,
  resolveBarcodeScan,
  verifyAuthenticityToken,
} from "./operations/tags";
import { listAllLabelTemplates, renderLabels } from "./operations/labels";
import {
  createStockCountSession,
  recordCountSessionScan,
  completeCountSession,
} from "./operations/stock-count";
import {
  purgeExpiredCache,
  getAnalyticsOverview,
} from "./operations/maintenance";
import { type BarcodeOpsContext } from "./operations/context";
import { BarcodeDataService } from "./operations/data-service";
import { createDefaultProviderRegistry, ProviderRegistry } from "./providers";
import type { BarcodeModuleOptions } from "./types";
import { getBarcodeHmacSecret } from "./utils/security";

type InjectedDependencies = Record<string, unknown>;

/** Drops the leading `ctx` parameter of an operation. */
type OpArgs<F> = F extends (ctx: BarcodeOpsContext, ...rest: infer R) => unknown
  ? R
  : never;

/**
 * Public module service. Generated CRUD methods come from `BarcodeDataService`;
 * the business logic lives in `./operations/*` and is exposed here as thin
 * delegating methods.
 */
export class BarcodeModuleService extends BarcodeDataService {
  protected readonly options_: BarcodeModuleOptions;
  protected readonly registry_: ProviderRegistry;
  protected readonly hmacSecret_: string;

  constructor(
    container: InjectedDependencies = {},
    options: BarcodeModuleOptions = {},
  ) {
    super(container, options);
    this.options_ = {
      cacheEnabled: true,
      cacheTtlSeconds: 86400,
      enrichmentStrategy: "first-hit",
      autoGenerateVariantBarcode: true,
      internalBarcodePrefix: "200",
      defaultProductStatus: "draft",
      downloadProductImages: false,
      requestTimeoutMs: 5000,
      storefrontBaseUrl:
        process.env.STOREFRONT_URL ||
        process.env.MEDUSA_STOREFRONT_URL ||
        "https://store.example.com",
      ...options,
    };
    this.registry_ = createDefaultProviderRegistry(this.options_);
    this.hmacSecret_ = getBarcodeHmacSecret(this.options_.hmacSecret);
  }

  protected ctx_(): BarcodeOpsContext {
    return {
      svc: this,
      options: this.options_,
      registry: this.registry_,
      hmacSecret: this.hmacSecret_,
    };
  }

  async getModuleOptions(): Promise<BarcodeModuleOptions> {
    return this.options_;
  }

  async getProviderRegistry(): Promise<ProviderRegistry> {
    return this.registry_;
  }

  async parseAndValidateBarcode(
    ...args: Parameters<typeof parseAndValidateBarcode>
  ) {
    return parseAndValidateBarcode(...args);
  }

  /**
   * Looks up a barcode across the configured provider chain with caching.
   */
  async lookupBarcode(...args: OpArgs<typeof lookupBarcode>) {
    return lookupBarcode(this.ctx_(), ...args);
  }

  /**
   * Finds an existing `BarcodeProduct` mapping for a normalized barcode.
   */
  async findBarcodeProduct(...args: OpArgs<typeof findBarcodeProduct>) {
    return findBarcodeProduct(this.ctx_(), ...args);
  }

  /**
   * Removes `BarcodeProduct` mapping(s) for a normalized barcode.
   */
  async removeBarcodeProduct(...args: OpArgs<typeof removeBarcodeProduct>) {
    return removeBarcodeProduct(this.ctx_(), ...args);
  }

  /**
   * Creates or updates a `BarcodeProduct` mapping between a GTIN/barcode and a Medusa Product/Variant.
   */
  async upsertBarcodeProductLink(
    ...args: OpArgs<typeof upsertBarcodeProductLink>
  ) {
    return upsertBarcodeProductLink(this.ctx_(), ...args);
  }

  /**
   * Generates a valid GS1 in-store EAN-13 barcode (prefix 200-299).
   */
  async generateInternalVariantBarcode(
    ...args: OpArgs<typeof generateInternalVariantBarcode>
  ) {
    return generateInternalVariantBarcode(this.ctx_(), ...args);
  }

  /**
   * Renders any supported 1D/2D barcode symbology into a standalone SVG string.
   */
  async renderSvg(...args: OpArgs<typeof renderSvg>) {
    return renderSvg(this.ctx_(), ...args);
  }

  /**
   * Creates or updates a dynamic `BarcodeTag` (1D barcode or 2D QR/DataMatrix token)
   * with storefront scan action, optional GS1 Digital Link, and HMAC-SHA256 anti-counterfeit signature.
   */
  async createOrUpdateBarcodeTag(
    ...args: OpArgs<typeof createOrUpdateBarcodeTag>
  ) {
    return createOrUpdateBarcodeTag(this.ctx_(), ...args);
  }

  /**
   * Resolves a storefront or admin scan against `BarcodeTag`, `BarcodeProduct`,
   * and optionally Medusa's `ProductVariant` table (`barcode` / `ean` / `upc`),
   * incrementing scan analytics when a tag is matched and optionally hydrating the variant and product.
   */
  async resolveBarcodeScan(...args: OpArgs<typeof resolveBarcodeScan>) {
    return resolveBarcodeScan(this.ctx_(), ...args);
  }

  /**
   * Verifies an anti-counterfeit HMAC-SHA256 signature for a `BarcodeTag`.
   */
  async verifyAuthenticityToken(
    ...args: OpArgs<typeof verifyAuthenticityToken>
  ) {
    return verifyAuthenticityToken(this.ctx_(), ...args);
  }

  /**
   * Lists all built-in + custom label templates.
   */
  async listAllLabelTemplates(...args: OpArgs<typeof listAllLabelTemplates>) {
    return listAllLabelTemplates(this.ctx_(), ...args);
  }

  /**
   * Renders printable HTML+SVG and Zebra ZPL II output for a list of label items.
   */
  async renderLabels(...args: OpArgs<typeof renderLabels>) {
    return renderLabels(this.ctx_(), ...args);
  }

  /**
   * Creates a new stock-take inventory count session (`BarcodeCountSession`).
   */
  async createStockCountSession(
    ...args: OpArgs<typeof createStockCountSession>
  ) {
    return createStockCountSession(this.ctx_(), ...args);
  }

  /**
   * Records a barcode scan inside a `BarcodeCountSession` and recalculates session variance totals.
   */
  async recordCountSessionScan(...args: OpArgs<typeof recordCountSessionScan>) {
    return recordCountSessionScan(this.ctx_(), ...args);
  }

  /**
   * Marks a count session as completed.
   */
  async completeCountSession(...args: OpArgs<typeof completeCountSession>) {
    return completeCountSession(this.ctx_(), ...args);
  }

  /**
   * Purges expired entries from `BarcodeCache`.
   */
  async purgeExpiredCache(...args: OpArgs<typeof purgeExpiredCache>) {
    return purgeExpiredCache(this.ctx_(), ...args);
  }

  /**
   * Returns a dashboard analytics overview across products, tags, cache, and stock-take sessions.
   */
  async getAnalyticsOverview(...args: OpArgs<typeof getAnalyticsOverview>) {
    return getAnalyticsOverview(this.ctx_(), ...args);
  }
}

export {
  BarcodeCache,
  BarcodeCountItem,
  BarcodeCountSession,
  BarcodeLabelTemplate,
  BarcodeProduct,
  BarcodeTag,
};

/**
 * Alias for backward compatibility with `@bambiste/medusa-barcode`.
 */
export const BarcodeService = BarcodeModuleService;

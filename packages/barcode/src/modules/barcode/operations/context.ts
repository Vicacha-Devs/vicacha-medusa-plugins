import type { ProviderRegistry } from "../providers";
import type { BarcodeModuleOptions } from "../types";
import type { BarcodeDataService } from "./data-service";

/**
 * Dependencies shared by every barcode operation: the generated CRUD service
 * plus the resolved module options, provider registry and HMAC secret.
 */
export type BarcodeOpsContext = {
  svc: BarcodeDataService;
  options: BarcodeModuleOptions;
  registry: ProviderRegistry;
  hmacSecret: string;
};

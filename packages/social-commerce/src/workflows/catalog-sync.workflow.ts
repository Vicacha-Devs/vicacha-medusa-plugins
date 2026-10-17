import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  SOCIAL_COMMERCE_MODULE,
  type CatalogFeedProductItem,
  type SocialCommerceService,
} from "../modules/social-commerce/index.js"

export interface CatalogSyncWorkflowInput {
  account_id: string
  items: CatalogFeedProductItem[]
  external_catalog_id?: string
}

export const syncCatalogBatchStep = createStep(
  "sync-catalog-batch",
  async (input: CatalogSyncWorkflowInput, { container }) => {
    const socialService = container.resolve<SocialCommerceService>(
      SOCIAL_COMMERCE_MODULE
    )

    const result = await socialService.syncProductsToSocialCatalog(
      input.account_id,
      input.items,
      {
        externalCatalogId: input.external_catalog_id,
      }
    )

    return new StepResponse(result)
  }
)

export const catalogSyncWorkflow = createWorkflow(
  "catalog-sync",
  (input: CatalogSyncWorkflowInput) => {
    const result = syncCatalogBatchStep(input)
    return new WorkflowResponse(result)
  }
)

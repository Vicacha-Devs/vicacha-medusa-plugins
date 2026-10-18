import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  resolveSocialCommerceService,
  type CatalogFeedProductItem,
} from "../modules/social-commerce/index"

export interface CatalogSyncWorkflowInput {
  account_id: string
  external_catalog_id?: string
  items: CatalogFeedProductItem[]
}

const pushSocialCatalogItemsStep = createStep(
  "push-social-catalog-items",
  async (input: CatalogSyncWorkflowInput, { container }) => {
    const socialService = resolveSocialCommerceService(container)

    const result = await socialService.syncProductsToSocialCatalog(
      input.account_id,
      input.items,
      { externalCatalogId: input.external_catalog_id }
    )

    return new StepResponse(result)
  }
)

export const catalogSyncWorkflow = createWorkflow(
  "catalog-sync",
  (input: CatalogSyncWorkflowInput) => {
    const syncResult = pushSocialCatalogItemsStep(input)
    return new WorkflowResponse(syncResult)
  }
)

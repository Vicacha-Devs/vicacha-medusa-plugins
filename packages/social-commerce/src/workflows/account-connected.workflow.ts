import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  MedusaError,
  resolveSocialCommerceService,
  type SocialPlatform,
} from "../modules/social-commerce/index"

export interface AccountConnectedWorkflowInput {
  account_id: string
  platform: SocialPlatform
  auto_sync_media?: boolean
  required_scopes?: string[]
}

function parseScopesList(scopes: string[] | string | null | undefined): string[] {
  if (!scopes) return []
  if (Array.isArray(scopes)) {
    return scopes.map((s) => String(s).trim()).filter(Boolean)
  }
  return String(scopes)
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export const verifyAccountScopesStep = createStep(
  "verify-account-scopes",
  async (input: AccountConnectedWorkflowInput, { container }) => {
    const socialService = resolveSocialCommerceService(container)
    const account = await socialService.getAccount(input.account_id)
    const grantedScopes = parseScopesList(account.scopes)

    if (Array.isArray(input.required_scopes) && input.required_scopes.length > 0) {
      const missing = input.required_scopes.filter(
        (reqScope) => !grantedScopes.includes(reqScope)
      )
      if (missing.length > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `SocialAccount "${input.account_id}" is missing required OAuth scopes: ${missing.join(", ")}`
        )
      }
    }

    return new StepResponse({
      account,
      granted_scopes: grantedScopes,
    })
  }
)

export const initialAccountSyncStep = createStep(
  "initial-account-sync",
  async (input: AccountConnectedWorkflowInput, { container }) => {
    const socialService = resolveSocialCommerceService(container)
    const existingAccount = await socialService.getAccount(input.account_id)
    const previousMetadata = existingAccount.metadata
      ? { ...existingAccount.metadata }
      : null

    const grantedScopes = parseScopesList(existingAccount.scopes)
    if (Array.isArray(input.required_scopes) && input.required_scopes.length > 0) {
      const missing = input.required_scopes.filter(
        (reqScope) => !grantedScopes.includes(reqScope)
      )
      if (missing.length > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `SocialAccount "${input.account_id}" is missing required OAuth scopes: ${missing.join(", ")}`
        )
      }
    }

    await socialService.updateAccountMetadata(input.account_id, {
      ...(existingAccount.metadata ?? {}),
      connection_verified_at: new Date().toISOString(),
      workflow: "account-connected",
    })

    if (input.auto_sync_media === false || input.platform === "local") {
      const account = await socialService.getAccount(input.account_id)
      return new StepResponse(
        {
          account,
          synced_posts: 0,
          synced_stories: 0,
        },
        {
          accountId: input.account_id,
          previousMetadata,
        }
      )
    }

    const syncResult = await socialService.syncAccountMedia(input.account_id, {
      includeStories: true,
    })
    const account = await socialService.getAccount(input.account_id)

    return new StepResponse(
      {
        account,
        synced_posts: syncResult.synced_posts,
        synced_stories: syncResult.synced_stories,
      },
      {
        accountId: input.account_id,
        previousMetadata,
      }
    )
  },
  async (
    compensationData:
      | { accountId: string; previousMetadata: Record<string, unknown> | null }
      | undefined,
    { container }
  ) => {
    if (!compensationData?.accountId) return
    const socialService = resolveSocialCommerceService(container)
    await socialService.updateAccountMetadata(
      compensationData.accountId,
      compensationData.previousMetadata
    )
  }
)

export const accountConnectedWorkflow = createWorkflow(
  "account-connected",
  (input: AccountConnectedWorkflowInput) => {
    const result = initialAccountSyncStep(input)
    return new WorkflowResponse(result)
  }
)

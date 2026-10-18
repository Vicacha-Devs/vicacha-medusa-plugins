import { randomUUID } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"
import {
  createPkceChallenge,
  createSignedOAuthState,
  decryptToken,
  encryptToken,
  resolveEncryptionPassphrase,
  verifySignedOAuthState,
} from "../utils/security"
import type {
  SocialAccountPublicDTO,
  SocialAccountRecord,
  SocialAccountStatus,
  SocialCommerceModuleOptions,
  SocialPlatform,
  SocialPlatformProvider,
} from "../types/index"
import type { SocialCommerceRepository } from "./social-commerce.repository"
import { toPublicAccountDTO } from "./social-commerce-normalizers"

/**
 * Handles OAuth 2.0 PKCE flows, AES-256-GCM token encryption/decryption,
 * automatic token rotation, and multi-platform social account lifecycle.
 */
export class SocialAccountService {
  private readonly pkceVerifiers = new Map<string, string>()
  private readonly repo: SocialCommerceRepository
  private readonly moduleOptions: SocialCommerceModuleOptions
  private readonly resolveProvider: (platform: SocialPlatform) => SocialPlatformProvider
  private readonly getOptionalProvider: (
    platform: SocialPlatform
  ) => SocialPlatformProvider | undefined

  constructor(
    repo: SocialCommerceRepository,
    moduleOptions: SocialCommerceModuleOptions,
    resolveProvider: (platform: SocialPlatform) => SocialPlatformProvider,
    getOptionalProvider: (
      platform: SocialPlatform
    ) => SocialPlatformProvider | undefined
  ) {
    this.repo = repo
    this.moduleOptions = moduleOptions
    this.resolveProvider = resolveProvider
    this.getOptionalProvider = getOptionalProvider
  }

  private getEncryptionSecret(): string {
    return resolveEncryptionPassphrase(this.moduleOptions.encryption_key)
  }

  /**
   * Strips encrypted `access_token` and `refresh_token` before returning account data to API callers.
   */
  async sanitizeAccount(account: SocialAccountRecord): Promise<SocialAccountPublicDTO> {
    return toPublicAccountDTO(account)
  }

  /**
   * Generates a CSRF-protected and PKCE-enabled OAuth authorization URL for TikTok, Instagram, or Facebook.
   */
  async buildOAuthConnectUrl(input: {
    platform: SocialPlatform
    redirect_uri?: string
    scopes?: string[]
  }): Promise<{
    url: string
    state: string
    platform: SocialPlatform
  }> {
    if (input.platform === "local") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Platform "local" does not require external OAuth authorization.'
      )
    }

    const provider = this.resolveProvider(input.platform)
    const { codeVerifier, codeChallenge } = createPkceChallenge()
    const secret = this.getEncryptionSecret()

    const state = createSignedOAuthState(
      {
        platform: input.platform,
        nonce: randomUUID(),
        issuedAt: Date.now(),
        codeVerifier,
        redirectUri: input.redirect_uri,
      },
      secret
    )

    this.pkceVerifiers.set(state, codeVerifier)

    const url = provider.getAuthUrl({
      state,
      codeChallenge,
      redirectUri: input.redirect_uri,
      scopes: input.scopes,
    })

    return {
      url,
      state,
      platform: input.platform,
    }
  }

  /**
   * Verifies the signed OAuth state, exchanges the authorization code for tokens,
   * encrypts tokens with AES-256-GCM, and creates or updates the `SocialAccount`.
   */
  async exchangeOAuthCallback(input: {
    code: string
    state: string
    redirect_uri?: string
  }): Promise<SocialAccountPublicDTO> {
    if (!input.code?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "OAuth authorization code is required."
      )
    }
    if (!input.state?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "OAuth state parameter is required."
      )
    }

    const secret = this.getEncryptionSecret()
    const verifiedState = verifySignedOAuthState(input.state, secret)
    const codeVerifier =
      this.pkceVerifiers.get(input.state) || verifiedState.codeVerifier
    this.pkceVerifiers.delete(input.state)

    const provider = this.resolveProvider(verifiedState.platform)
    const tokenResult = await provider.exchangeCodeForToken({
      code: input.code.trim(),
      codeVerifier,
      redirectUri: input.redirect_uri || verifiedState.redirectUri,
    })

    const encryptedAccess = encryptToken(tokenResult.access_token, secret)
    const encryptedRefresh = tokenResult.refresh_token
      ? encryptToken(tokenResult.refresh_token, secret)
      : null

    const expiresAt = tokenResult.expires_in
      ? new Date(Date.now() + tokenResult.expires_in * 1000)
      : null

    const existingList = await this.repo.listAccounts({
      platform: verifiedState.platform,
      platform_user_id: tokenResult.platform_user_id,
    })

    if (existingList.length > 0) {
      const updated = await this.repo.updateAccount(existingList[0].id, {
        platform_username: tokenResult.platform_username,
        username: tokenResult.platform_username,
        display_name: tokenResult.display_name ?? existingList[0].display_name,
        avatar_url: tokenResult.avatar_url ?? existingList[0].avatar_url,
        access_token: encryptedAccess,
        encrypted_access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        encrypted_refresh_token: encryptedRefresh,
        token_expires_at: expiresAt,
        scopes: tokenResult.scopes,
        external_catalog_id:
          tokenResult.external_catalog_id ?? existingList[0].external_catalog_id,
        external_shop_id:
          tokenResult.external_shop_id ?? existingList[0].external_shop_id,
        status: "active",
        is_active: true,
        metadata: {
          ...(existingList[0].metadata ?? {}),
          ...(tokenResult.metadata ?? {}),
        },
      })
      return toPublicAccountDTO(updated)
    }

    const created = await this.repo.createAccount({
      platform: verifiedState.platform,
      platform_user_id: tokenResult.platform_user_id,
      external_id: tokenResult.platform_user_id,
      platform_username: tokenResult.platform_username,
      username: tokenResult.platform_username,
      display_name: tokenResult.display_name ?? tokenResult.platform_username,
      avatar_url: tokenResult.avatar_url ?? null,
      access_token: encryptedAccess,
      encrypted_access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      encrypted_refresh_token: encryptedRefresh,
      token_expires_at: expiresAt,
      scopes: tokenResult.scopes,
      external_catalog_id: tokenResult.external_catalog_id ?? null,
      external_shop_id: tokenResult.external_shop_id ?? null,
      status: "active",
      is_active: true,
      last_synced_at: null,
      metadata: tokenResult.metadata ?? null,
    })

    return toPublicAccountDTO(created)
  }

  /**
   * Lists connected social accounts with encrypted credentials stripped.
   */
  async listAccounts(filters?: {
    platform?: SocialPlatform
    status?: SocialAccountStatus
  }): Promise<SocialAccountPublicDTO[]> {
    const accounts = await this.repo.listAccounts(
      filters as Record<string, unknown> | undefined
    )
    return accounts.map((a) => toPublicAccountDTO(a))
  }

  /**
   * Retrieves a single social account (sanitized).
   */
  async getAccount(accountId: string): Promise<SocialAccountPublicDTO> {
    const account = await this.repo.retrieveAccount(accountId)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${accountId}" was not found.`
      )
    }
    return toPublicAccountDTO(account)
  }

  /**
   * Updates the `metadata` field of a `SocialAccount` (used by workflows and compensation).
   */
  async updateAccountMetadata(
    accountId: string,
    metadata: Record<string, unknown> | null
  ): Promise<SocialAccountPublicDTO> {
    const updated = await this.repo.updateAccount(accountId, { metadata })
    return toPublicAccountDTO(updated)
  }

  /**
   * Decrypts and returns the raw access token for internal provider API calls.
   * Automatically refreshes tokens when `token_expires_at` is within 5 minutes and a `refresh_token` is present.
   */
  async getDecryptedAccountWithToken(
    accountId: string,
    options?: { skipAutoRefresh?: boolean }
  ): Promise<{
    account: SocialAccountRecord
    accessToken: string
    refreshToken: string | null
  }> {
    let account = await this.repo.retrieveAccount(accountId)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${accountId}" was not found.`
      )
    }
    if (account.status === "disconnected" || account.is_active === false) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `SocialAccount "${accountId}" is disconnected.`
      )
    }

    const secret = this.getEncryptionSecret()
    const rawEncryptedAccess = account.access_token || account.encrypted_access_token
    const rawEncryptedRefresh =
      account.refresh_token ?? account.encrypted_refresh_token ?? null

    let accessToken = decryptToken(rawEncryptedAccess ?? "", secret)
    let refreshToken = rawEncryptedRefresh
      ? decryptToken(rawEncryptedRefresh, secret)
      : null

    if (
      !options?.skipAutoRefresh &&
      account.platform !== "local" &&
      refreshToken &&
      account.token_expires_at
    ) {
      const expiresAtMs = new Date(account.token_expires_at).getTime()
      if (
        Number.isFinite(expiresAtMs) &&
        expiresAtMs - Date.now() < 5 * 60 * 1000
      ) {
        await this.refreshAccountTokens(account.id)
        const refreshedAccount = await this.repo.retrieveAccount(accountId)
        if (refreshedAccount) {
          account = refreshedAccount
          accessToken = decryptToken(
            account.access_token || account.encrypted_access_token || "",
            secret
          )
          const updatedRefresh =
            account.refresh_token ?? account.encrypted_refresh_token ?? null
          refreshToken = updatedRefresh ? decryptToken(updatedRefresh, secret) : null
        }
      }
    }

    return { account, accessToken, refreshToken }
  }

  /**
   * Refreshes OAuth tokens for a specific social account and re-encrypts at rest.
   */
  async refreshAccountTokens(accountId: string): Promise<SocialAccountPublicDTO> {
    const { account, accessToken, refreshToken } =
      await this.getDecryptedAccountWithToken(accountId, { skipAutoRefresh: true })
    const provider = this.resolveProvider(account.platform)

    const tokenForRefresh = refreshToken || accessToken
    const refreshed = await provider.refreshAccessToken(tokenForRefresh)

    const secret = this.getEncryptionSecret()
    const encryptedAccess = encryptToken(refreshed.access_token, secret)
    const encryptedRefresh = refreshed.refresh_token
      ? encryptToken(refreshed.refresh_token, secret)
      : account.refresh_token

    const expiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : account.token_expires_at

    const updated = await this.repo.updateAccount(account.id, {
      access_token: encryptedAccess,
      encrypted_access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      encrypted_refresh_token: encryptedRefresh,
      token_expires_at: expiresAt,
      status: "active",
      is_active: true,
    })

    return toPublicAccountDTO(updated)
  }

  /**
   * Proactively refreshes tokens for all active accounts expiring within `thresholdMinutes`.
   */
  async refreshExpiringAccounts(thresholdMinutes: number = 60): Promise<{
    refreshed: string[]
    failed: Array<{ account_id: string; error: string }>
  }> {
    const activeAccounts = await this.repo.listAccounts({ status: "active" })
    const cutoff = Date.now() + thresholdMinutes * 60 * 1000
    const refreshed: string[] = []
    const failed: Array<{ account_id: string; error: string }> = []

    for (const acc of activeAccounts) {
      if (acc.platform === "local") continue
      const expiresMs = acc.token_expires_at
        ? new Date(acc.token_expires_at).getTime()
        : null
      if (expiresMs !== null && expiresMs <= cutoff) {
        try {
          await this.refreshAccountTokens(acc.id)
          refreshed.push(acc.id)
        } catch (err) {
          failed.push({
            account_id: acc.id,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    return { refreshed, failed }
  }

  /**
   * Disconnects or deletes a social account.
   * Performs a best-effort remote `revokeToken` call on the provider before marking disconnected or deleting.
   */
  async disconnectAccount(
    accountId: string,
    hardDelete: boolean = false
  ): Promise<{ id: string; status: "disconnected" | "deleted" }> {
    const account = await this.repo.retrieveAccount(accountId)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${accountId}" was not found.`
      )
    }

    if (account.platform !== "local") {
      try {
        const secret = this.getEncryptionSecret()
        const rawEncrypted =
          account.access_token || account.encrypted_access_token || ""
        if (rawEncrypted) {
          const accessToken = decryptToken(rawEncrypted, secret)
          const provider = this.getOptionalProvider(account.platform)
          if (provider && typeof provider.revokeToken === "function") {
            await provider.revokeToken(accessToken)
          }
        }
      } catch {
        // Best-effort token revocation; do not block local disconnect
      }
    }

    if (hardDelete) {
      await this.repo.deleteAccount(accountId)
      return { id: accountId, status: "deleted" }
    }

    await this.repo.updateAccount(accountId, {
      status: "disconnected",
      is_active: false,
    })
    return { id: accountId, status: "disconnected" }
  }
}

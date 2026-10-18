import { randomUUID } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  CatalogSyncItemRecord,
  LiveProductRecord,
  LiveSessionRecord,
  SocialAccountRecord,
  SocialMediaPostRecord,
  SocialProductTagRecord,
} from "../types/index"
import {
  matchesFilter,
  normalizeAccountRecord,
  normalizeCatalogItemRecord,
  normalizeLiveProductRecord,
  normalizeLiveSessionRecord,
  normalizePostRecord,
  normalizeTagRecord,
} from "./social-commerce-normalizers"

/**
 * Minimal host contract satisfied by a `MedusaService({...})` subclass instance.
 */
export interface SocialCommerceOrmHost {
  __container__?: Record<string, unknown>
  createSocialAccounts(data: unknown): Promise<unknown>
  updateSocialAccounts(data: unknown): Promise<unknown>
  retrieveSocialAccount(id: string): Promise<unknown>
  listSocialAccounts(filters?: unknown): Promise<unknown>
  deleteSocialAccounts(ids: string[]): Promise<unknown>

  createSocialMediaPosts(data: unknown): Promise<unknown>
  updateSocialMediaPosts(data: unknown): Promise<unknown>
  retrieveSocialMediaPost(id: string): Promise<unknown>
  listSocialMediaPosts(filters?: unknown): Promise<unknown>
  deleteSocialMediaPosts(ids: string[]): Promise<unknown>

  createSocialProductTags(data: unknown): Promise<unknown>
  listSocialProductTags(filters?: unknown): Promise<unknown>
  deleteSocialProductTags(ids: string[]): Promise<unknown>

  createLiveSessions(data: unknown): Promise<unknown>
  updateLiveSessions(data: unknown): Promise<unknown>
  retrieveLiveSession(id: string): Promise<unknown>
  listLiveSessions(filters?: unknown): Promise<unknown>

  createLiveProducts(data: unknown): Promise<unknown>
  updateLiveProducts(data: unknown): Promise<unknown>
  listLiveProducts(filters?: unknown): Promise<unknown>

  createCatalogSyncItems(data: unknown): Promise<unknown>
  updateCatalogSyncItems(data: unknown): Promise<unknown>
  listCatalogSyncItems(filters?: unknown): Promise<unknown>
}

/**
 * Dual-mode Repository Abstraction (MedusaService MikroORM + Standalone In-Memory Fallback).
 */
export class SocialCommerceRepository {
  private readonly host: SocialCommerceOrmHost
  private readonly memAccounts = new Map<string, SocialAccountRecord>()
  private readonly memPosts = new Map<string, SocialMediaPostRecord>()
  private readonly memTags = new Map<string, SocialProductTagRecord>()
  private readonly memLiveSessions = new Map<string, LiveSessionRecord>()
  private readonly memLiveProducts = new Map<string, LiveProductRecord>()
  private readonly memCatalogItems = new Map<string, CatalogSyncItemRecord>()

  constructor(host: SocialCommerceOrmHost) {
    this.host = host
  }

  private hasInjectedOrmService(internalServiceKey: string): boolean {
    const container = this.host.__container__
    return Boolean(container && internalServiceKey in container)
  }

  // ---------------------------------------------------------------------------
  // SocialAccount
  // ---------------------------------------------------------------------------

  async createAccount(
    data: Omit<SocialAccountRecord, "id" | "created_at" | "updated_at">
  ): Promise<SocialAccountRecord> {
    const now = new Date()
    const normalizedInput = normalizeAccountRecord({
      ...data,
      id: "temp",
      created_at: now,
      updated_at: now,
    })
    const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = normalizedInput
    if (this.hasInjectedOrmService("socialAccountService")) {
      const res = await this.host.createSocialAccounts(payload)
      return normalizeAccountRecord(
        (Array.isArray(res) ? res[0] : res) as SocialAccountRecord
      )
    }
    const record = normalizeAccountRecord({
      ...payload,
      id: `sacc_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    })
    this.memAccounts.set(record.id, record)
    return { ...record }
  }

  async updateAccount(
    id: string,
    patch: Partial<SocialAccountRecord>
  ): Promise<SocialAccountRecord> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      const res = await this.host.updateSocialAccounts({ id, ...patch })
      return normalizeAccountRecord(
        (Array.isArray(res) ? res[0] : res) as SocialAccountRecord
      )
    }
    const existing = this.memAccounts.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount with id "${id}" was not found.`
      )
    }
    const updated = normalizeAccountRecord({
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    })
    this.memAccounts.set(id, updated)
    return { ...updated }
  }

  async retrieveAccount(id: string): Promise<SocialAccountRecord | null> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      try {
        const res = (await this.host.retrieveSocialAccount(id)) as SocialAccountRecord
        return res ? normalizeAccountRecord(res) : null
      } catch {
        return null
      }
    }
    const found = this.memAccounts.get(id)
    return found ? normalizeAccountRecord({ ...found }) : null
  }

  async listAccounts(filters?: Record<string, unknown>): Promise<SocialAccountRecord[]> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      const list = (await this.host.listSocialAccounts(
        filters ?? {}
      )) as SocialAccountRecord[]
      return list.map((a) => normalizeAccountRecord(a))
    }
    return Array.from(this.memAccounts.values())
      .map((a) => normalizeAccountRecord({ ...a }))
      .filter((a) => matchesFilter(a as unknown as Record<string, unknown>, filters))
  }

  async deleteAccount(id: string): Promise<void> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      await this.host.deleteSocialAccounts([id])
      return
    }
    this.memAccounts.delete(id)
  }

  // ---------------------------------------------------------------------------
  // SocialMediaPost
  // ---------------------------------------------------------------------------

  async createPost(
    data: Omit<SocialMediaPostRecord, "id" | "created_at" | "updated_at">
  ): Promise<SocialMediaPostRecord> {
    const now = new Date()
    const normalizedInput = normalizePostRecord({
      ...data,
      id: "temp",
      created_at: now,
      updated_at: now,
    })
    const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = normalizedInput
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      const res = await this.host.createSocialMediaPosts(payload)
      return normalizePostRecord(
        (Array.isArray(res) ? res[0] : res) as SocialMediaPostRecord
      )
    }
    const record = normalizePostRecord({
      ...payload,
      id: `spost_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    })
    this.memPosts.set(record.id, record)
    return { ...record }
  }

  async updatePost(
    id: string,
    patch: Partial<SocialMediaPostRecord>
  ): Promise<SocialMediaPostRecord> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      const res = await this.host.updateSocialMediaPosts({ id, ...patch })
      return normalizePostRecord(
        (Array.isArray(res) ? res[0] : res) as SocialMediaPostRecord
      )
    }
    const existing = this.memPosts.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost with id "${id}" was not found.`
      )
    }
    const updated = normalizePostRecord({
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    })
    this.memPosts.set(id, updated)
    return { ...updated }
  }

  async retrievePost(id: string): Promise<SocialMediaPostRecord | null> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      try {
        const res = (await this.host.retrieveSocialMediaPost(
          id
        )) as SocialMediaPostRecord
        return res ? normalizePostRecord(res) : null
      } catch {
        return null
      }
    }
    const found = this.memPosts.get(id)
    return found ? normalizePostRecord({ ...found }) : null
  }

  async listPosts(filters?: Record<string, unknown>): Promise<SocialMediaPostRecord[]> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      const list = (await this.host.listSocialMediaPosts(
        filters ?? {}
      )) as SocialMediaPostRecord[]
      return list.map((p) => normalizePostRecord(p))
    }
    return Array.from(this.memPosts.values())
      .map((p) => normalizePostRecord({ ...p }))
      .filter((p) => matchesFilter(p as unknown as Record<string, unknown>, filters))
  }

  async deletePost(id: string): Promise<void> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      await this.host.deleteSocialMediaPosts([id])
      return
    }
    this.memPosts.delete(id)
  }

  // ---------------------------------------------------------------------------
  // SocialProductTag
  // ---------------------------------------------------------------------------

  async createTag(
    data: Omit<SocialProductTagRecord, "id" | "created_at" | "updated_at">
  ): Promise<SocialProductTagRecord> {
    const now = new Date()
    const normalizedInput = normalizeTagRecord({
      ...data,
      id: "temp",
      created_at: now,
      updated_at: now,
    })
    const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = normalizedInput
    if (this.hasInjectedOrmService("socialProductTagService")) {
      const res = await this.host.createSocialProductTags(payload)
      return normalizeTagRecord(
        (Array.isArray(res) ? res[0] : res) as SocialProductTagRecord
      )
    }
    const record = normalizeTagRecord({
      ...payload,
      id: `stag_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    })
    this.memTags.set(record.id, record)
    return { ...record }
  }

  async listTags(filters?: Record<string, unknown>): Promise<SocialProductTagRecord[]> {
    if (this.hasInjectedOrmService("socialProductTagService")) {
      const list = (await this.host.listSocialProductTags(
        filters ?? {}
      )) as SocialProductTagRecord[]
      return list.map((t) => normalizeTagRecord(t))
    }
    return Array.from(this.memTags.values())
      .map((t) => normalizeTagRecord({ ...t }))
      .filter((t) => matchesFilter(t as unknown as Record<string, unknown>, filters))
  }

  async deleteTag(id: string): Promise<void> {
    if (this.hasInjectedOrmService("socialProductTagService")) {
      await this.host.deleteSocialProductTags([id])
      return
    }
    this.memTags.delete(id)
  }

  // ---------------------------------------------------------------------------
  // LiveSession
  // ---------------------------------------------------------------------------

  async createLiveSession(
    data: Omit<LiveSessionRecord, "id" | "created_at" | "updated_at">
  ): Promise<LiveSessionRecord> {
    const now = new Date()
    const normalizedInput = normalizeLiveSessionRecord({
      ...data,
      id: "temp",
      created_at: now,
      updated_at: now,
    })
    const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = normalizedInput
    if (this.hasInjectedOrmService("liveSessionService")) {
      const res = await this.host.createLiveSessions(payload)
      return normalizeLiveSessionRecord(
        (Array.isArray(res) ? res[0] : res) as LiveSessionRecord
      )
    }
    const record = normalizeLiveSessionRecord({
      ...payload,
      id: `lsess_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    })
    this.memLiveSessions.set(record.id, record)
    return { ...record }
  }

  async updateLiveSession(
    id: string,
    patch: Partial<LiveSessionRecord>
  ): Promise<LiveSessionRecord> {
    if (this.hasInjectedOrmService("liveSessionService")) {
      const res = await this.host.updateLiveSessions({ id, ...patch })
      return normalizeLiveSessionRecord(
        (Array.isArray(res) ? res[0] : res) as LiveSessionRecord
      )
    }
    const existing = this.memLiveSessions.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession with id "${id}" was not found.`
      )
    }
    const updated = normalizeLiveSessionRecord({
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    })
    this.memLiveSessions.set(id, updated)
    return { ...updated }
  }

  async retrieveLiveSession(id: string): Promise<LiveSessionRecord | null> {
    if (this.hasInjectedOrmService("liveSessionService")) {
      try {
        const res = (await this.host.retrieveLiveSession(id)) as LiveSessionRecord
        return res ? normalizeLiveSessionRecord(res) : null
      } catch {
        return null
      }
    }
    const found = this.memLiveSessions.get(id)
    return found ? normalizeLiveSessionRecord({ ...found }) : null
  }

  async listLiveSessions(
    filters?: Record<string, unknown>
  ): Promise<LiveSessionRecord[]> {
    if (this.hasInjectedOrmService("liveSessionService")) {
      const list = (await this.host.listLiveSessions(
        filters ?? {}
      )) as LiveSessionRecord[]
      return list.map((s) => normalizeLiveSessionRecord(s))
    }
    return Array.from(this.memLiveSessions.values())
      .map((s) => normalizeLiveSessionRecord({ ...s }))
      .filter((s) => matchesFilter(s as unknown as Record<string, unknown>, filters))
  }

  // ---------------------------------------------------------------------------
  // LiveProduct
  // ---------------------------------------------------------------------------

  async createLiveProduct(
    data: Omit<LiveProductRecord, "id" | "created_at" | "updated_at">
  ): Promise<LiveProductRecord> {
    const now = new Date()
    const normalizedInput = normalizeLiveProductRecord({
      ...data,
      id: "temp",
      created_at: now,
      updated_at: now,
    })
    const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = normalizedInput
    if (this.hasInjectedOrmService("liveProductService")) {
      const res = await this.host.createLiveProducts(payload)
      return normalizeLiveProductRecord(
        (Array.isArray(res) ? res[0] : res) as LiveProductRecord
      )
    }
    const record = normalizeLiveProductRecord({
      ...payload,
      id: `lprod_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    })
    this.memLiveProducts.set(record.id, record)
    return { ...record }
  }

  async updateLiveProduct(
    id: string,
    patch: Partial<LiveProductRecord>
  ): Promise<LiveProductRecord> {
    if (this.hasInjectedOrmService("liveProductService")) {
      const res = await this.host.updateLiveProducts({ id, ...patch })
      return normalizeLiveProductRecord(
        (Array.isArray(res) ? res[0] : res) as LiveProductRecord
      )
    }
    const existing = this.memLiveProducts.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveProduct with id "${id}" was not found.`
      )
    }
    const updated = normalizeLiveProductRecord({
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    })
    this.memLiveProducts.set(id, updated)
    return { ...updated }
  }

  async listLiveProducts(
    filters?: Record<string, unknown>
  ): Promise<LiveProductRecord[]> {
    if (this.hasInjectedOrmService("liveProductService")) {
      const list = (await this.host.listLiveProducts(
        filters ?? {}
      )) as LiveProductRecord[]
      return list.map((p) => normalizeLiveProductRecord(p))
    }
    return Array.from(this.memLiveProducts.values())
      .map((p) => normalizeLiveProductRecord({ ...p }))
      .filter((p) => matchesFilter(p as unknown as Record<string, unknown>, filters))
  }

  // ---------------------------------------------------------------------------
  // CatalogSyncItem
  // ---------------------------------------------------------------------------

  async createCatalogItem(
    data: Omit<CatalogSyncItemRecord, "id" | "created_at" | "updated_at">
  ): Promise<CatalogSyncItemRecord> {
    const now = new Date()
    const normalizedInput = normalizeCatalogItemRecord({
      ...data,
      id: "temp",
      created_at: now,
      updated_at: now,
    })
    const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = normalizedInput
    if (this.hasInjectedOrmService("catalogSyncItemService")) {
      const res = await this.host.createCatalogSyncItems(payload)
      return normalizeCatalogItemRecord(
        (Array.isArray(res) ? res[0] : res) as CatalogSyncItemRecord
      )
    }
    const record = normalizeCatalogItemRecord({
      ...payload,
      id: `csync_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    })
    this.memCatalogItems.set(record.id, record)
    return { ...record }
  }

  async updateCatalogItem(
    id: string,
    patch: Partial<CatalogSyncItemRecord>
  ): Promise<CatalogSyncItemRecord> {
    if (this.hasInjectedOrmService("catalogSyncItemService")) {
      const res = await this.host.updateCatalogSyncItems({ id, ...patch })
      return normalizeCatalogItemRecord(
        (Array.isArray(res) ? res[0] : res) as CatalogSyncItemRecord
      )
    }
    const existing = this.memCatalogItems.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `CatalogSyncItem with id "${id}" was not found.`
      )
    }
    const updated = normalizeCatalogItemRecord({
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    })
    this.memCatalogItems.set(id, updated)
    return { ...updated }
  }

  async listCatalogItems(
    filters?: Record<string, unknown>
  ): Promise<CatalogSyncItemRecord[]> {
    if (this.hasInjectedOrmService("catalogSyncItemService")) {
      const list = (await this.host.listCatalogSyncItems(
        filters ?? {}
      )) as CatalogSyncItemRecord[]
      return list.map((i) => normalizeCatalogItemRecord(i))
    }
    return Array.from(this.memCatalogItems.values())
      .map((i) => normalizeCatalogItemRecord({ ...i }))
      .filter((i) => matchesFilter(i as unknown as Record<string, unknown>, filters))
  }
}

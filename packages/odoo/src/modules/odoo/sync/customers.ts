import {
  Modules,
} from "@medusajs/framework/utils"
import type {
  OdooCustomerSyncSettings,
  OdooSyncDirection,
  OdooSyncResult,
} from "../types"
import type { OdooModuleService } from "../service"
import { errorMessage } from "../utils/errors"
import { resolveFromScope, resolveQueryGraph } from "../utils/scope"

export async function syncCustomers(this: OdooModuleService, params?: {
  scope?: unknown
  customerIds?: string[]
  directionOverride?: OdooSyncDirection
  medusaCustomers?: Array<{
    id: string
    email: string
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    company_name?: string | null
    addresses?: Array<{
      address_1?: string | null
      city?: string | null
      postal_code?: string | null
      country_code?: string | null
    }> | null
  }>
  onUpsertMedusaCustomer?: (partner: {
    odooId: number
    email: string
    firstName: string
    lastName: string
    phone?: string | null
  }) => Promise<string>
  trigger?: string
}): Promise<OdooSyncResult> {
  const started = Date.now()
  const settings =
    await this.getSectionSettings<OdooCustomerSyncSettings>("customers")
  const direction =
    params?.directionOverride ?? settings.direction ?? "bidirectional"
  const trigger = params?.trigger ?? "manual"

  if (settings.enableCustomerSync === false) {
    return {
      ok: true,
      entity: "customer",
      direction,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      durationMs: Date.now() - started,
      message: "Customer sync is disabled.",
    }
  }

  try {
    const client = await this.getOdooClient()
    let created = 0
    let updated = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    if (
      direction === "odoo_to_medusa" ||
      direction === "bidirectional"
    ) {
      const partners = await client.fetchCustomers(500)
      for (const p of partners) {
        const email =
          typeof p.email === "string" ? p.email.trim().toLowerCase() : ""
        if (!email) {
          skipped++
          continue
        }
        const parts = (p.name || email).trim().split(/\s+/)
        const firstName = parts[0] || ""
        const lastName = parts.slice(1).join(" ")

        try {
          const existingMedusaId = await this.getMedusaId("customer", p.id)
          let medusaId = existingMedusaId ?? `cus_odoo_${p.id}`
          if (params?.onUpsertMedusaCustomer) {
            medusaId = await params.onUpsertMedusaCustomer({
              odooId: p.id,
              email,
              firstName,
              lastName,
              phone: typeof p.phone === "string" ? p.phone : null,
            })
          } else {
            const customerMod = resolveFromScope<{
              listCustomers?: (
                filters: Record<string, unknown>,
                config?: Record<string, unknown>
              ) => Promise<Array<{ id: string }>>
              createCustomers?: (
                data: Record<string, unknown>
              ) => Promise<{ id: string } | Array<{ id: string }>>
              updateCustomers?: (
                idOrSelector: unknown,
                data?: Record<string, unknown>
              ) => Promise<unknown>
            }>(this.container_, Modules.CUSTOMER, params?.scope)

            if (
              customerMod?.listCustomers &&
              customerMod?.createCustomers &&
              customerMod?.updateCustomers
            ) {
              try {
                if (existingMedusaId) {
                  await customerMod.updateCustomers(existingMedusaId, {
                    first_name: firstName,
                    last_name: lastName,
                    phone: typeof p.phone === "string" ? p.phone : undefined,
                  })
                  medusaId = existingMedusaId
                } else {
                  const byEmail = await customerMod.listCustomers(
                    { email },
                    { take: 1 }
                  )
                  if (byEmail?.[0]?.id) {
                    medusaId = byEmail[0].id
                    await customerMod.updateCustomers(medusaId, {
                      first_name: firstName,
                      last_name: lastName,
                      phone:
                        typeof p.phone === "string" ? p.phone : undefined,
                    })
                  } else {
                    const createdCust = await customerMod.createCustomers({
                      email,
                      first_name: firstName,
                      last_name: lastName,
                      phone:
                        typeof p.phone === "string" ? p.phone : undefined,
                      metadata: { odoo_partner_id: p.id },
                    })
                    const custObj = Array.isArray(createdCust)
                      ? createdCust[0]
                      : createdCust
                    if (custObj?.id) {
                      medusaId = custObj.id
                    }
                  }
                }
              } catch {
                // Fallback to synthetic ID if Medusa customer module unavailable
              }
            }
          }
          await this.upsertMapping({
            entityType: "customer",
            medusaId,
            odooId: p.id,
            direction: "odoo_to_medusa",
            odooModel: "res.partner",
          })
          if (existingMedusaId) updated++
          else created++
        } catch (err) {
          failed++
          const msg = errorMessage(err)
          errors.push(`Partner ${p.id}: ${msg}`)
          await this.recordFailure({
            entityType: "customer",
            odooId: p.id,
            direction: "odoo_to_medusa",
            trigger,
            errorMessage: msg,
          })
        }
      }
    }

    if (
      direction === "medusa_to_odoo" ||
      direction === "bidirectional"
    ) {
      let medusaCustomers = params?.medusaCustomers
      if (!medusaCustomers) {
        const query = resolveQueryGraph(this.container_, params?.scope)
        if (query) {
          try {
            const filters: Record<string, unknown> = {}
            if (params?.customerIds?.length) {
              filters.id = params.customerIds
            }
            const { data: queriedCustomers } = await query.graph({
              entity: "customer",
              fields: [
                "id",
                "email",
                "first_name",
                "last_name",
                "phone",
                "company_name",
                "addresses.*",
              ],
              filters,
            })
            medusaCustomers = (queriedCustomers ?? []) as NonNullable<
              typeof medusaCustomers
            >
          } catch {
            medusaCustomers = []
          }
        }
      }

      for (const c of medusaCustomers ?? []) {
        if (!c.email) {
          skipped++
          continue
        }
        try {
          const existingOdooId = await this.getOdooId("customer", c.id)
          const name =
            [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email
          const primaryAddr = Array.isArray(c.addresses)
            ? c.addresses[0]
            : undefined
          const res = await client.upsertCustomer(
            c.id,
            {
              name,
              email: c.email.trim().toLowerCase(),
              ...(c.phone ? { phone: c.phone } : {}),
              ...(c.company_name ? { company_name: c.company_name } : {}),
              ...(primaryAddr?.address_1
                ? { street: primaryAddr.address_1 }
                : {}),
              ...(primaryAddr?.city ? { city: primaryAddr.city } : {}),
              ...(primaryAddr?.postal_code
                ? { zip: primaryAddr.postal_code }
                : {}),
            },
            existingOdooId
          )
          await this.upsertMapping({
            entityType: "customer",
            medusaId: c.id,
            odooId: res.id,
            direction: "medusa_to_odoo",
            odooModel: "res.partner",
          })
          if (res.created) created++
          else updated++
        } catch (err) {
          failed++
          const msg = errorMessage(err)
          errors.push(`Customer ${c.id}: ${msg}`)
          await this.recordFailure({
            entityType: "customer",
            medusaId: c.id,
            direction: "medusa_to_odoo",
            trigger,
            errorMessage: msg,
          })
        }
      }
    }

    const durationMs = Date.now() - started
    const message = `Customer sync (${direction}): ${created} created, ${updated} updated, ${skipped} skipped${failed ? `, ${failed} failed` : ""}.`
    const log = await this.logSync({
      entityType: "customer",
      direction,
      trigger,
      status: failed > 0 ? "failed" : "success",
      created,
      updated,
      skipped,
      failed,
      durationMs,
      message,
      errorDetails: errors.length ? { errors } : null,
    })

    return {
      ok: failed === 0,
      entity: "customer",
      direction,
      created,
      updated,
      skipped,
      failed,
      durationMs,
      message,
      errors: errors.length ? errors : undefined,
      logId: log.id,
    }
  } catch (err) {
    const durationMs = Date.now() - started
    const msg = err instanceof Error ? err.message : String(err)
    await this.logSync({
      entityType: "customer",
      direction,
      trigger,
      status: "failed",
      failed: 1,
      durationMs,
      message: msg,
    })
    return {
      ok: false,
      entity: "customer",
      direction,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 1,
      durationMs,
      message: msg,
    }
  }
}

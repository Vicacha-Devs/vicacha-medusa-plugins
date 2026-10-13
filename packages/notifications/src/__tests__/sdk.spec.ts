import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  NotificationsApiClient,
  notificationsQueryKeys,
  invalidateNotificationsQueries,
  matchesNotificationsQueryKeyPrefix,
  subscribeNotificationsQueryInvalidation,
} from "../sdk"

describe("NotificationsApiClient SDK & Query Keys", () => {
  it("builds query keys and notifies invalidation subscribers", () => {
    assert.deepEqual(notificationsQueryKeys.all, ["notifications"])
    assert.deepEqual(notificationsQueryKeys.orderLogs("order_42"), [
      "notifications",
      "logs",
      "order",
      "order_42",
    ])
    assert.equal(
      matchesNotificationsQueryKeyPrefix(
        notificationsQueryKeys.orderLogs("order_42"),
        notificationsQueryKeys.logsAll()
      ),
      true
    )

    const invalidated: Array<readonly unknown[]> = []
    const unsubscribe = subscribeNotificationsQueryInvalidation((prefix) => {
      invalidated.push(prefix)
    })
    invalidateNotificationsQueries(notificationsQueryKeys.templatesAll())
    unsubscribe()
    assert.equal(invalidated.length, 1)
    assert.deepEqual(invalidated[0], ["notifications", "templates"])
  })

  it("executes typed Admin MPN and Store Consent requests via NotificationsApiClient", async () => {
    const requests: Array<{ url: string; method?: string; headers?: any }> = []
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      requests.push({ url, method: init?.method, headers: init?.headers })
      if (url.endsWith("/mpn/consent")) {
        return new Response(
          JSON.stringify({
            success: true,
            consent: {
              id: "con_1",
              channel: "sms",
              identifier_masked: "+1415***2671",
              status: "opted_in",
            },
          }),
          { status: 200 }
        )
      }
      if (url.includes("/mpn/channels")) {
        return new Response(
          JSON.stringify({ message: "Gateway unreachable" }),
          { status: 502 }
        )
      }
      return new Response(
        JSON.stringify({
          success: true,
          templates: [{ id: "system_email_order_placed", label: "Order Placed" }],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const adminSdk = new NotificationsApiClient("/admin", "http://localhost:9000", {
      fetchImpl: mockFetch,
    })
    const storeSdk = new NotificationsApiClient("/store", "http://localhost:9000", {
      fetchImpl: mockFetch,
      publishableApiKey: "pk_live_abc",
    })

    const tplRes = await adminSdk.listTemplates({ channel: "email" })
    assert.equal(tplRes.templates.length, 1)
    assert.equal(
      requests[0].url,
      "http://localhost:9000/admin/mpn/templates?channel=email"
    )

    const consentRes = await storeSdk.updateConsent({
      identifier: "+14155552671",
      channel: "sms",
      action: "opt_in",
    })
    assert.equal(consentRes.consent.status, "opted_in")
    assert.equal(requests[1].headers["x-publishable-api-key"], "pk_live_abc")

    await assert.rejects(
      () =>
        adminSdk.saveOrVerifyChannel({
          channel: "whatsapp",
          driver: "openwa",
          action: "verify",
        }),
      /Gateway unreachable/
    )
  })

  it("exports unified constants, enums, and error maps from src/types", async () => {
    const typesMod = await import("../types")
    assert.equal(typesMod.NOTIFICATIONS_MODULE, "notificationsModuleService")
    assert.equal(typesMod.ENotificationChannel.WHATSAPP, "whatsapp")
    assert.equal(typesMod.EDeliveryStatus.DELIVERED, "delivered")
    assert.equal(typesMod.EConsentStatus.OPTED_IN, "opted_in")
    assert.ok(typesMod.NOTIFICATIONS_ERROR_MAP.TEMPLATE_NOT_FOUND)
    assert.equal(
      typesMod.NOTIFICATIONS_ERROR_MAP.RATE_LIMIT_EXCEEDED.retryable,
      true
    )
  })
})


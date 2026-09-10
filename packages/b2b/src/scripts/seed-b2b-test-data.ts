import {
  beginOrderEditOrderWorkflow,
  createOrdersWorkflow,
} from "@medusajs/core-flows"
import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, OrderStatus } from "@medusajs/framework/utils"

import { APPROVAL_MODULE } from "../modules/approval"
import { QUOTE_MODULE } from "../modules/quote"
import { EQuoteStatus, ESpendingLimitResetFrequency } from "../types/enums"
import { createCompaniesWorkflow } from "../workflows/company/workflows/create-companies"
import { createEmployeesWorkflow } from "../workflows/employee/workflows/create-employees"
import { merchantSendQuoteWorkflow } from "../workflows/quote/workflows/merchant-send-quote"
import { merchantRejectQuoteWorkflow } from "../workflows/quote/workflows/merchant-reject-quote"
import { customerRejectQuoteWorkflow } from "../workflows/quote/workflows/customer-reject-quote"
import { customerAcceptQuoteWorkflow } from "../workflows/quote/workflows/customer-accept-quote"

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type ItemInput = { title: string; sku?: string; quantity: number; unit_price: number }

async function createDraftOrderWithChange(
  container: MedusaContainer,
  {
    customer,
    currency_code,
    region_id,
    sales_channel_id,
    items,
  }: {
    customer: { id: string; email: string; first_name?: string | null; last_name?: string | null }
    currency_code: string
    region_id: string | undefined
    sales_channel_id: string | undefined
    items: ItemInput[]
  }
) {
  const address = {
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
    country_code: "co",
  }

  const { result: draftOrder } = await createOrdersWorkflow(container).run({
    input: {
      is_draft_order: true,
      status: OrderStatus.DRAFT,
      ...(sales_channel_id && { sales_channel_id }),
      ...(region_id && { region_id }),
      email: customer.email,
      customer_id: customer.id,
      currency_code,
      billing_address: address,
      shipping_address: address,
      items: items.map((i) => ({
        title: i.title,
        ...(i.sku && { variant_sku: i.sku }),
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      shipping_methods: [],
    } as any,
  })

  const { result: orderChange } = await beginOrderEditOrderWorkflow(container).run({
    input: { order_id: draftOrder.id },
  })

  return { draftOrder, orderChange }
}

// ────────────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────────────

export default async function seedB2bTestData({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerService = container.resolve(Modules.CUSTOMER)
  const userService = container.resolve(Modules.USER)
  const regionService = container.resolve(Modules.REGION)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const approvalService = container.resolve(APPROVAL_MODULE) as any
  const quoteService = container.resolve(QUOTE_MODULE) as any

  // ── Admin user ──────────────────────────────────────────────────────────
  // Fetch a real user so server-side message enrichment resolves their name.

  const [adminUser] = await userService.listUsers({}, { take: 1 })
  const adminId: string = adminUser?.id ?? "usr_seed_fallback"
  logger.info(
    adminUser
      ? `Using admin: ${[adminUser.first_name, adminUser.last_name].filter(Boolean).join(" ")} (${adminUser.id})`
      : "No admin user found — messages will show generic 'Admin'"
  )

  // ── Region + sales channel ──────────────────────────────────────────────

  const [region] = await regionService.listRegions({}, { take: 1 })
  const regionId: string | undefined = region?.id
  if (!regionId) logger.warn("No region found — draft orders will have no region_id")

  const salesChannels = await salesChannelService.listSalesChannels({ name: ["B2B"] })
  const b2bChannelId: string | undefined = salesChannels[0]?.id
  if (!b2bChannelId) logger.warn("B2B sales channel not found — run seed-b2b-data.ts first")

  const currency = "cop"

  // ── Customers (find-or-create) ──────────────────────────────────────────

  logger.info("Resolving test customers...")

  const CUSTOMER_DEFS = [
    { first_name: "Ana",    last_name: "García",    email: "ana.garcia@acmecorp.co",       phone: "+57 310 1234567" },
    { first_name: "Carlos", last_name: "Rodríguez", email: "carlos.rodriguez@acmecorp.co", phone: "+57 310 2345678" },
    { first_name: "María",  last_name: "López",     email: "maria.lopez@globextravel.co",  phone: "+57 310 3456789" },
    { first_name: "Juan",   last_name: "Martínez",  email: "juan.martinez@globextravel.co",phone: "+57 310 4567890" },
  ]

  const existingCustomers = await customerService.listCustomers(
    { email: { $in: CUSTOMER_DEFS.map((c) => c.email) } },
    { take: CUSTOMER_DEFS.length }
  )

  if (existingCustomers.length === CUSTOMER_DEFS.length) {
    logger.info("B2B test data already seeded. Skipping.")
    return
  }

  const existingByEmail = new Map(existingCustomers.map((c: any) => [c.email, c]))
  const toCreate = CUSTOMER_DEFS.filter((c) => !existingByEmail.has(c.email))

  const newCustomers = toCreate.length > 0
    ? await customerService.createCustomers(toCreate)
    : []

  const customers = CUSTOMER_DEFS.map(
    (def) => existingByEmail.get(def.email) ?? newCustomers.find((c: any) => c.email === def.email)
  )
  logger.info(`Customers ready: ${existingCustomers.length} existing, ${newCustomers.length} created`)

  // ── Companies ───────────────────────────────────────────────────────────

  logger.info("Creating companies...")

  const { result: companies } = await createCompaniesWorkflow(container).run({
    input: [
      {
        name: "Acme Corporation",
        email: "admin@acmecorp.co",
        phone: "+57 1 3001234",
        address: "Calle 72 # 10-34",
        city: "Bogotá",
        state: "Cundinamarca",
        zip: "110231",
        country: "CO",
        logo_url: null,
        currency_code: currency,
        spending_limit_reset_frequency: ESpendingLimitResetFrequency.MONTHLY,
      },
      {
        name: "Globex Travel",
        email: "admin@globextravel.co",
        phone: "+57 4 3002345",
        address: "El Poblado, Carrera 43A # 1-50",
        city: "Medellín",
        state: "Antioquia",
        zip: "050021",
        country: "CO",
        logo_url: null,
        currency_code: currency,
        spending_limit_reset_frequency: ESpendingLimitResetFrequency.WEEKLY,
      },
    ],
  })
  const cos = companies as any[]
  logger.info(`Created companies: ${cos.map((c) => c.name).join(", ")}`)

  // ── Employees ───────────────────────────────────────────────────────────

  logger.info("Creating employees...")

  for (const input of [
    { employeeData: { company_id: cos[0].id, customer_id: customers[0].id, spending_limit: 5_000_000, is_admin: true  }, customerId: customers[0].id },
    { employeeData: { company_id: cos[0].id, customer_id: customers[1].id, spending_limit: 2_000_000, is_admin: false }, customerId: customers[1].id },
    { employeeData: { company_id: cos[1].id, customer_id: customers[2].id, spending_limit: 10_000_000, is_admin: true  }, customerId: customers[2].id },
    { employeeData: { company_id: cos[1].id, customer_id: customers[3].id, spending_limit: 3_000_000, is_admin: false }, customerId: customers[3].id },
  ]) {
    await createEmployeesWorkflow(container).run({ input })
  }
  logger.info("Created 4 employees (2 per company)")

  // ── Approvals ───────────────────────────────────────────────────────────

  logger.info("Creating test approvals...")

  const cartId1 = "cart_test_acme_001"
  const cartId2 = "cart_test_globex_001"

  await approvalService.createApprovals([
    { cart_id: cartId1, type: "admin", status: "pending",  created_by: customers[1].id },
    { cart_id: cartId2, type: "admin", status: "approved", created_by: customers[3].id, handled_by: customers[2].id },
    { cart_id: cartId2, type: "sales_manager", status: "rejected", created_by: customers[3].id, handled_by: customers[2].id },
  ])
  await approvalService.createApprovalStatuses([
    { cart_id: cartId1, status: "pending" },
    { cart_id: cartId2, status: "rejected" },
  ])
  logger.info("Created 3 approvals and 2 approval statuses")

  // ── Draft orders + Quotes ───────────────────────────────────────────────
  // One quote per status so every UI branch can be tested.
  // All draft orders are real (created via createOrdersWorkflow).

  logger.info("Creating draft orders and quotes...")

  // ─── 1. pending_merchant — customer requested, merchant hasn't priced yet
  logger.info("  [1/6] pending_merchant quote (Ana / Acme)...")

  const { draftOrder: do1, orderChange: oc1 } = await createDraftOrderWithChange(
    container,
    {
      customer: customers[0],
      currency_code: currency,
      region_id: regionId,
      sales_channel_id: b2bChannelId,
      items: [
        { title: "Bogotá → Miami · Clase Ejecutiva", quantity: 12, unit_price: 2_500_000 },
        { title: "Hotel Marriott Miami · 3 noches",  quantity: 12, unit_price: 800_000  },
      ],
    }
  )

  const [q1] = await quoteService.createQuotes([{
    status: EQuoteStatus.PendingMerchant,
    customer_id: customers[0].id,
    draft_order_id: do1.id,
    order_change_id: oc1.id,
    cart_id: `cart_seed_acme_001`,
  }])

  await quoteService.createMessages([
    { quote_id: q1.id, text: "Necesitamos cotización para 12 ejecutivos — vuelos BOG→MIA más hotel 3 noches, primera quincena de octubre.", customer_id: customers[0].id },
    { quote_id: q1.id, text: "¿Pueden incluir traslados aeropuerto-hotel en la cotización?", customer_id: customers[0].id },
  ])

  // ─── 2. pending_customer — merchant priced, waiting on customer
  logger.info("  [2/6] pending_customer quote (María / Globex)...")

  const { draftOrder: do2, orderChange: oc2 } = await createDraftOrderWithChange(
    container,
    {
      customer: customers[2],
      currency_code: currency,
      region_id: regionId,
      sales_channel_id: b2bChannelId,
      items: [
        { title: "Hotel Medellín · Habitación Doble Deluxe · Octubre", quantity: 5, unit_price: 280_000 },
      ],
    }
  )

  const [q2] = await quoteService.createQuotes([{
    status: EQuoteStatus.PendingMerchant,
    customer_id: customers[2].id,
    draft_order_id: do2.id,
    order_change_id: oc2.id,
    cart_id: `cart_seed_globex_001`,
  }])

  await merchantSendQuoteWorkflow(container).run({ input: { quote_id: q2.id } })

  const item2Id: string | undefined = (do2 as any).items?.[0]?.id
  await quoteService.createMessages([
    { quote_id: q2.id, text: "¿Pueden ajustar los precios de alojamiento para octubre? Buscamos algo bajo COP 300 000/noche.", customer_id: customers[2].id },
    { quote_id: q2.id, text: "Revisamos disponibilidad con nuestros proveedores.", admin_id: adminId },
    { quote_id: q2.id, text: "Tenemos opciones entre COP 250 000 y COP 290 000/noche. Les comparto el ítem actualizado.", admin_id: adminId, ...(item2Id && { item_id: item2Id }) },
    { quote_id: q2.id, text: "Muchas gracias. Revisamos con el equipo y les confirmamos esta semana.", customer_id: customers[2].id },
  ])

  // ─── 3. accepted — full conversation + item chip; also tests scroll (many messages)
  logger.info("  [3/6] accepted quote (Ana / Acme)...")

  const { draftOrder: do3, orderChange: oc3 } = await createDraftOrderWithChange(
    container,
    {
      customer: customers[0],
      currency_code: currency,
      region_id: regionId,
      sales_channel_id: b2bChannelId,
      items: [
        { title: "Bogotá → Cancún · Clase Económica · Dic 20",  quantity: 15, unit_price: 1_200_000 },
        { title: "Bogotá → Cancún · Clase Ejecutiva · Dic 20",  quantity: 5,  unit_price: 3_800_000 },
      ],
    }
  )

  const [q3] = await quoteService.createQuotes([{
    status: EQuoteStatus.PendingMerchant,
    customer_id: customers[0].id,
    draft_order_id: do3.id,
    order_change_id: oc3.id,
    cart_id: `cart_seed_acme_002`,
  }])

  await merchantSendQuoteWorkflow(container).run({ input: { quote_id: q3.id } })
  await customerAcceptQuoteWorkflow(container).run({ input: { quote_id: q3.id, customer_id: customers[0].id } })

  const item3EconId: string | undefined = (do3 as any).items?.[0]?.id
  const item3ExecId: string | undefined = (do3 as any).items?.[1]?.id
  await quoteService.createMessages([
    { quote_id: q3.id, text: "Necesitamos cotización para 20 pasajeros en temporada alta — diciembre 20 al 3 de enero.", customer_id: customers[0].id },
    { quote_id: q3.id, text: "Recibido. ¿Todos en clase económica o requieren mezcla ejecutiva/económica?", admin_id: adminId },
    { quote_id: q3.id, text: "15 en económica, 5 en ejecutiva. Retorno fijo el 3 de enero. Destino Cancún.", customer_id: customers[0].id },
    { quote_id: q3.id, text: "¿Hay flexibilidad en la fecha de retorno?", admin_id: adminId },
    { quote_id: q3.id, text: "Retorno fijo el 3 de enero, sin flexibilidad.", customer_id: customers[0].id },
    { quote_id: q3.id, text: "Acá la cotización en económica con 10% de descuento por volumen.", admin_id: adminId, ...(item3EconId && { item_id: item3EconId }) },
    { quote_id: q3.id, text: "¿El descuento incluye el ítem ejecutivo también?", customer_id: customers[0].id },
    { quote_id: q3.id, text: "Sí, ejecutiva con 15% de descuento por volumen, incluye una maleta de 23 kg.", admin_id: adminId, ...(item3ExecId && { item_id: item3ExecId }) },
    { quote_id: q3.id, text: "¿Se puede incluir un seguro de viaje para todos los pasajeros?", customer_id: customers[0].id },
    { quote_id: q3.id, text: "Podemos incluirlo por COP 45 000/persona adicional. ¿Lo añadimos?", admin_id: adminId },
    { quote_id: q3.id, text: "Sí, por favor. Incluyan el seguro de viaje para todos.", customer_id: customers[0].id },
    { quote_id: q3.id, text: "Cotización actualizada con el seguro incluido en ambos ítems.", admin_id: adminId },
    { quote_id: q3.id, text: "Perfecto. Aceptamos la cotización. Procedemos con la reserva.", customer_id: customers[0].id },
  ])

  // ─── 4. customer_rejected — customer declined after merchant sent
  logger.info("  [4/6] customer_rejected quote (Carlos / Acme)...")

  const { draftOrder: do4, orderChange: oc4 } = await createDraftOrderWithChange(
    container,
    {
      customer: customers[1],
      currency_code: currency,
      region_id: regionId,
      sales_channel_id: b2bChannelId,
      items: [
        { title: "Bogotá → Cartagena · Ida y Vuelta · Grupo Corporativo", quantity: 8, unit_price: 950_000 },
      ],
    }
  )

  const [q4] = await quoteService.createQuotes([{
    status: EQuoteStatus.PendingMerchant,
    customer_id: customers[1].id,
    draft_order_id: do4.id,
    order_change_id: oc4.id,
    cart_id: `cart_seed_acme_003`,
  }])

  await merchantSendQuoteWorkflow(container).run({ input: { quote_id: q4.id } })
  await customerRejectQuoteWorkflow(container).run({ input: { quote_id: q4.id } })

  const item4Id: string | undefined = (do4 as any).items?.[0]?.id
  await quoteService.createMessages([
    { quote_id: q4.id, text: "Solicitamos descuento adicional para grupo corporativo de 8 personas.", customer_id: customers[1].id },
    { quote_id: q4.id, text: "Acá la cotización con nuestra mejor tarifa para ese período.", admin_id: adminId, ...(item4Id && { item_id: item4Id }) },
    { quote_id: q4.id, text: "El precio está por encima de nuestro presupuesto. ¿Pueden bajar un 20%?", customer_id: customers[1].id },
    { quote_id: q4.id, text: "No tenemos margen adicional para ese período. El precio enviado es nuestra tarifa mínima.", admin_id: adminId },
    { quote_id: q4.id, text: "Lamentablemente rechazamos la cotización. Buscaremos otras alternativas.", customer_id: customers[1].id },
  ])

  // ─── 5. merchant_rejected — merchant rejected the request
  logger.info("  [5/6] merchant_rejected quote (Juan / Globex)...")

  const { draftOrder: do5, orderChange: oc5 } = await createDraftOrderWithChange(
    container,
    {
      customer: customers[3],
      currency_code: currency,
      region_id: regionId,
      sales_channel_id: b2bChannelId,
      items: [
        { title: "Bogotá → Miami · Clase Ejecutiva · Dic 24", quantity: 4, unit_price: 4_200_000 },
      ],
    }
  )

  const [q5] = await quoteService.createQuotes([{
    status: EQuoteStatus.PendingMerchant,
    customer_id: customers[3].id,
    draft_order_id: do5.id,
    order_change_id: oc5.id,
    cart_id: `cart_seed_globex_002`,
  }])

  await merchantRejectQuoteWorkflow(container).run({ input: { quote_id: q5.id } })

  await quoteService.createMessages([
    { quote_id: q5.id, text: "Necesitamos tiquetes para el 24 de diciembre. Solo clase ejecutiva, 4 puestos.", customer_id: customers[3].id },
    { quote_id: q5.id, text: "No tenemos disponibilidad en clase ejecutiva para esa fecha. No podemos procesar esta solicitud.", admin_id: adminId },
  ])

  // ─── 6. pending_merchant, no messages — tests the empty-messages state
  logger.info("  [6/6] pending_merchant with no messages (María / Globex)...")

  const { draftOrder: do6, orderChange: oc6 } = await createDraftOrderWithChange(
    container,
    {
      customer: customers[2],
      currency_code: currency,
      region_id: regionId,
      sales_channel_id: b2bChannelId,
      items: [
        { title: "Medellín → Bogotá · Clase Económica · Temporal", quantity: 3, unit_price: 350_000 },
      ],
    }
  )

  await quoteService.createQuotes([{
    status: EQuoteStatus.PendingMerchant,
    customer_id: customers[2].id,
    draft_order_id: do6.id,
    order_change_id: oc6.id,
    cart_id: `cart_seed_globex_003`,
  }])

  logger.info("Created 6 quotes with real draft orders and order changes")

  logger.info("B2B test data seeded successfully.")
}

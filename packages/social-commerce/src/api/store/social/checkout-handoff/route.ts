import {
  CheckoutHandoffSchema,
  getRequestPayload,
  parseWithMedusaError,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import { checkoutHandoffWorkflow } from "../../../../workflows/index.js"

async function handleHandoff(
  req: HttpRequest,
  res: HttpResponse,
  rawPayload: Record<string, unknown>
): Promise<void> {
  try {
    const parsed = parseWithMedusaError(CheckoutHandoffSchema, rawPayload)

    const { result } = await checkoutHandoffWorkflow(req.scope).run({
      input: {
        products_param: parsed.products,
        items: parsed.items,
        coupon: parsed.coupon,
        source_platform: parsed.source_platform,
        source_post_id: parsed.source_post_id,
        live_session_id: parsed.live_session_id,
        reservation_id: parsed.reservation_id,
      },
    })

    const shouldRedirect =
      parsed.redirect === true || parsed.redirect === "true"

    if (shouldRedirect && typeof res.redirect === "function") {
      res.redirect(302, result.checkout_url)
      return
    }

    res.status(200).json({
      handoff: result,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  await handleHandoff(req, res, (req.query ?? {}) as Record<string, unknown>)
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  await handleHandoff(req, res, getRequestPayload(req))
}

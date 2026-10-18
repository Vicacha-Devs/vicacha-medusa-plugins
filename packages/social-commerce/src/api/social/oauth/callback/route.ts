import {
  getRequestPayload,
  OAuthCallbackSchema,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares"
import { accountConnectedWorkflow } from "../../../../workflows/index"

function wantsHtmlPopupResponse(req: HttpRequest): boolean {
  const popupQuery = String(req.query?.popup ?? "").toLowerCase()
  if (popupQuery === "true" || popupQuery === "1") {
    return true
  }
  const acceptHeader = req.headers?.accept
  const acceptStr = Array.isArray(acceptHeader)
    ? acceptHeader.join(",")
    : String(acceptHeader ?? "")
  return acceptStr.includes("text/html")
}

function buildOAuthSuccessPopupHtml(
  account: Awaited<
    ReturnType<ReturnType<typeof resolveSocialService>["exchangeOAuthCallback"]>
  >
): string {
  // Escape '<' as '\u003c' so untrusted strings cannot break out of <script>
  const safePayloadJson = JSON.stringify({
    type: `${account.platform}-oauth-success`,
    account,
  }).replace(/</g, "\\u003c")

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Social Account Connected</title>
  </head>
  <body>
    <p>Social account connected successfully. You may close this window.</p>
    <script>
      (function () {
        var payload = ${safePayloadJson};
        if (window.opener && typeof window.opener.postMessage === "function") {
          window.opener.postMessage(payload, window.location.origin);
        }
        window.close();
      })();
    </script>
  </body>
</html>`
}

async function handleOAuthCallback(
  req: HttpRequest,
  res: HttpResponse,
  rawPayload: unknown
): Promise<void> {
  try {
    const payload = parseWithMedusaError(OAuthCallbackSchema, rawPayload)
    const socialService = resolveSocialService(req)

    const account = await socialService.exchangeOAuthCallback({
      code: payload.code,
      state: payload.state,
      redirect_uri: payload.redirect_uri,
    })

    // Trigger accountConnectedWorkflow (best-effort)
    try {
      await accountConnectedWorkflow(req.scope).run({
        input: {
          account_id: account.id,
          platform: account.platform,
          auto_sync_media: false,
        },
      })
    } catch {
      // Do not fail OAuth callback if post-connect workflow encounters an error
    }

    if (wantsHtmlPopupResponse(req) && typeof res.send === "function") {
      if (typeof res.setHeader === "function") {
        res.setHeader("Content-Type", "text/html; charset=utf-8")
      }
      res.status(200).send?.(buildOAuthSuccessPopupHtml(account))
      return
    }

    res.status(200).json({
      account,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  await handleOAuthCallback(req, res, {
    code: req.query?.code,
    state: req.query?.state,
    redirect_uri: req.query?.redirect_uri,
  })
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  await handleOAuthCallback(req, res, getRequestPayload(req))
}



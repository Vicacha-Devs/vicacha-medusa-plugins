import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import { ODOO_MODULE } from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const format = req.query.format

  if (format === "prometheus" || req.headers.accept?.includes("text/plain")) {
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
    res.send(await odooService.getPrometheusMetrics())
    return
  }

  const [metrics, prometheus] = await Promise.all([
    odooService.getMetricsSummary(),
    odooService.getPrometheusMetrics(),
  ])

  res.json({
    metrics,
    prometheus,
  })
}

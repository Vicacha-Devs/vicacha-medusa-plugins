import { Form, KeyboundForm, SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  StatusBadge,
} from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type {
  OdooBarcodeContext,
  OdooBarcodeResolutionResult,
} from "../../modules/odoo/types"
import { PosTransactionsSection } from "./pos-transactions-section"

export interface BarcodeTabProps {
  barcodeInput: string
  onBarcodeInputChange: (value: string) => void
  barcodeContext: OdooBarcodeContext
  onToggleContext: () => void
  onContextChange?: (context: OdooBarcodeContext) => void
  isResolving: boolean
  onResolve: () => void
  barcodeResult: OdooBarcodeResolutionResult | null
  posTransactions: Array<Record<string, unknown>>
}

export const BarcodeLookupSection = ({
  barcodeInput,
  onBarcodeInputChange,
  barcodeContext,
  onToggleContext,
  onContextChange,
  isResolving,
  onResolve,
  barcodeResult,
}: Omit<BarcodeTabProps, "posTransactions">) => {
  const { t } = useTranslation()
  const rhf = useForm({
    defaultValues: {
      barcode: barcodeInput,
      context: barcodeContext,
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("barcodeTab.title")}</Heading>
        <Badge size="2xsmall" color="blue">
          {barcodeContext.toUpperCase()}
        </Badge>
      </div>

      <KeyboundForm
        onSubmit={rhf.handleSubmit(() => onResolve())}
        className="divide-y"
      >
        <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Form.Field
              control={rhf.control}
              name="barcode"
              render={() => (
                <Form.Item>
                  <Form.Label>{t("barcodeTab.barcodeLabel")}</Form.Label>
                  <Form.Control>
                    <Input
                      id="barcode-input"
                      placeholder={t("barcodeTab.barcodePlaceholder")}
                      value={barcodeInput}
                      onChange={(e) => onBarcodeInputChange(e.target.value)}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
          </div>
          <div>
            <Form.Field
              control={rhf.control}
              name="context"
              render={() => (
                <Form.Item>
                  <Form.Label>
                    {t("barcodeTab.contextButton", {
                      context: barcodeContext.toUpperCase(),
                    })}
                  </Form.Label>
                  <Form.Control>
                    <Select
                      value={barcodeContext}
                      onValueChange={(val) => {
                        if (onContextChange) {
                          onContextChange(val as OdooBarcodeContext)
                        } else {
                          onToggleContext()
                        }
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="pos">POS</Select.Item>
                        <Select.Item value="warehouse">WAREHOUSE</Select.Item>
                        <Select.Item value="receiving">RECEIVING</Select.Item>
                        <Select.Item value="stocktake">STOCKTAKE</Select.Item>
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-x-2 px-6 py-4">
          <Button
            type="button"
            size="small"
            variant="secondary"
            onClick={onToggleContext}
          >
            {t("barcodeTab.contextButton", {
              context: barcodeContext.toUpperCase(),
            })}
          </Button>
          <Button
            type="submit"
            size="small"
            variant="primary"
            isLoading={isResolving}
          >
            {t("barcodeTab.resolveButton")}
          </Button>
        </div>
      </KeyboundForm>

      {barcodeResult && (
        <>
          <SectionRow
            title={t("barcodeTab.resultHeader", {
              status: barcodeResult.found
                ? t("barcodeTab.found")
                : t("barcodeTab.notFound"),
              latencyMs: barcodeResult.latencyMs,
              source: barcodeResult.source,
            })}
            value={
              <StatusBadge color={barcodeResult.found ? "green" : "orange"}>
                {barcodeResult.found
                  ? t("barcodeTab.found")
                  : t("barcodeTab.notFound")}
              </StatusBadge>
            }
          />
          <SectionRow
            title={t("barcodeTab.barcodeLabel")}
            value={t("barcodeTab.resultDetails", {
              sku: barcodeResult.sku ?? t("barcodeTab.notAvailable"),
              title:
                barcodeResult.title ??
                barcodeResult.odooProductName ??
                t("barcodeTab.notAvailable"),
              qty: String(
                barcodeResult.availableQty ?? t("barcodeTab.notAvailable")
              ),
            })}
          />
        </>
      )}
    </Container>
  )
}

export const BarcodeTab = (props: BarcodeTabProps) => {
  return (
    <div className="flex flex-col gap-y-4">
      <BarcodeLookupSection {...props} />
      <PosTransactionsSection posTransactions={props.posTransactions} />
    </div>
  )
}

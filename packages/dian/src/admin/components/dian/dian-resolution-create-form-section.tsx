import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { dianClient } from "../../../sdk"

export interface DianResolutionCreateFormSectionProps {
  onSaved: () => void
}

export const DianResolutionCreateFormSection: React.FC<
  DianResolutionCreateFormSectionProps
> = ({ onSaved }) => {
  const { t, i18n } = useTranslation()
  const [prefix, setPrefix] = useState("FE")
  const [resolutionNumber, setResolutionNumber] = useState("18760000001")
  const [documentType, setDocumentType] = useState("01")
  const [fromNumber, setFromNumber] = useState("1")
  const [toNumber, setToNumber] = useState("100000")
  const [validFrom, setValidFrom] = useState("2025-01-01")
  const [validTo, setValidTo] = useState("2030-12-31")
  const [technicalKey, setTechnicalKey] = useState("")
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await dianClient.upsertResolution({
        resolution_number: resolutionNumber,
        prefix,
        document_type: documentType,
        from_number: Number(fromNumber),
        to_number: Number(toNumber),
        current_number: Number(fromNumber),
        valid_from: validFrom,
        valid_to: validTo,
        technical_key: technicalKey || null,
        is_active: true,
      })
      toast.success(t("dian.resolutions.toastSaved"))
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || t("dian.resolutions.toastError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-6" dir={i18n.dir()}>
      <Heading level="h2" className="mb-4">
        {t("dian.resolutions.formTitle")}
      </Heading>
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div>
          <Label>{t("dian.resolutions.docTypeLabel")}</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="01">{t("dian.documents.type01")}</Select.Item>
              <Select.Item value="20">{t("dian.documents.type20")}</Select.Item>
              <Select.Item value="91">{t("dian.documents.type91")}</Select.Item>
              <Select.Item value="92">{t("dian.documents.type92")}</Select.Item>
              <Select.Item value="03">{t("dian.documents.type03")}</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div>
          <Label>{t("dian.resolutions.prefixLabel")}</Label>
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.resolutions.resolutionNumberLabel")}</Label>
          <Input
            value={resolutionNumber}
            onChange={(e) => setResolutionNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.resolutions.fromNumberLabel")}</Label>
          <Input
            type="number"
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.resolutions.toNumberLabel")}</Label>
          <Input
            type="number"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.resolutions.technicalKeyLabel")}</Label>
          <Input
            value={technicalKey}
            onChange={(e) => setTechnicalKey(e.target.value)}
            placeholder="fc8eac422eba..."
          />
        </div>
        <div>
          <Label>{t("dian.resolutions.validFromLabel")}</Label>
          <Input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.resolutions.validToLabel")}</Label>
          <Input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" isLoading={saving}>
            {t("dian.resolutions.saveBtn")}
          </Button>
        </div>
      </form>
    </Container>
  )
}

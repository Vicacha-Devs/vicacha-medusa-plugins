import { useState } from "react"
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

export interface DianFiscalProfileFormSectionProps {
  onSaved: () => void
}

export const DianFiscalProfileFormSection: React.FC<
  DianFiscalProfileFormSectionProps
> = ({ onSaved }) => {
  const { t, i18n } = useTranslation()
  const [customerId, setCustomerId] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [organizationType, setOrganizationType] = useState("2")
  const [identificationType, setIdentificationType] = useState("13")
  const [identificationNumber, setIdentificationNumber] = useState("")
  const [registrationName, setRegistrationName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [municipalityCode, setMunicipalityCode] = useState("11001")
  const [saving, setSaving] = useState(false)

  const isLegalEntity = organizationType === "1"

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !phone.trim()) {
      toast.error(t("dian.fiscalProfiles.errEmailPhoneRequired"))
      return
    }
    if (isLegalEntity && !companyId.trim()) {
      toast.error(t("dian.fiscalProfiles.errCompanyIdRequired"))
      return
    }

    setSaving(true)
    try {
      await dianClient.upsertFiscalProfile({
        customer_id: customerId.trim(),
        company_id: isLegalEntity ? companyId.trim() : null,
        organization_type: organizationType,
        identification_type: isLegalEntity ? "31" : identificationType,
        identification_number: identificationNumber.trim(),
        registration_name: registrationName.trim(),
        tax_regime: isLegalEntity ? "48" : "49",
        email: email.trim(),
        phone: phone.trim(),
        municipality_code: municipalityCode,
      })
      toast.success(t("dian.fiscalProfiles.toastSaved"))
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || t("dian.fiscalProfiles.toastError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-6" dir={i18n.dir()}>
      <Heading level="h2" className="mb-4">
        {t("dian.fiscalProfiles.formTitle")}
      </Heading>
      <form
        onSubmit={(e) => void handleSave(e)}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div>
          <Label>{t("dian.fiscalProfiles.customerIdLabel")}</Label>
          <Input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="cus_01..."
            required
          />
        </div>
        <div>
          <Label>{t("dian.fiscalProfiles.organizationTypeLabel")}</Label>
          <Select value={organizationType} onValueChange={setOrganizationType}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="2">
                {t("dian.fiscalProfiles.orgNaturalOption")}
              </Select.Item>
              <Select.Item value="1">
                {t("dian.fiscalProfiles.orgLegalOption")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>
        {isLegalEntity ? (
          <div>
            <Label>{t("dian.fiscalProfiles.companyIdLabel")}</Label>
            <Input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="comp_01..."
              required
            />
          </div>
        ) : (
          <div>
            <Label>{t("dian.fiscalProfiles.docTypeLabel")}</Label>
            <Select
              value={identificationType}
              onValueChange={setIdentificationType}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="13">
                  {t("dian.fiscalProfiles.doc13")}
                </Select.Item>
                <Select.Item value="22">
                  {t("dian.fiscalProfiles.doc22")}
                </Select.Item>
                <Select.Item value="31">
                  {t("dian.fiscalProfiles.doc31")}
                </Select.Item>
                <Select.Item value="41">
                  {t("dian.fiscalProfiles.doc41")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
        )}
        <div>
          <Label>{t("dian.fiscalProfiles.idNumberLabel")}</Label>
          <Input
            value={identificationNumber}
            onChange={(e) => setIdentificationNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.fiscalProfiles.registrationNameLabel")}</Label>
          <Input
            value={registrationName}
            onChange={(e) => setRegistrationName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.fiscalProfiles.municipalityCodeLabel")}</Label>
          <Input
            value={municipalityCode}
            onChange={(e) => setMunicipalityCode(e.target.value)}
            placeholder="11001"
          />
        </div>
        <div>
          <Label>{t("dian.fiscalProfiles.emailLabel")}</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>{t("dian.fiscalProfiles.phoneLabel")}</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" isLoading={saving}>
            {t("dian.fiscalProfiles.saveBtn")}
          </Button>
        </div>
      </form>
    </Container>
  )
}

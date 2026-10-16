import { RouteDrawer, useRouteModal } from "@medusajs/dashboard/components"
import { Heading, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { DynamicQrTagDrawerForm } from "../../../../components"
import {
  type TagFormState,
  useBarcodeStudio,
} from "../../../../hooks/use-barcode-studio"

const CreateTagDrawerContent = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const studio = useBarcodeStudio()

  const handleSubmit = async (values: TagFormState) => {
    try {
      await studio.handleCreateTag(values)
      handleSuccess()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.tagCreateError")
      )
    }
  }

  return (
    <DynamicQrTagDrawerForm
      defaultValues={studio.tagForm}
      loading={studio.isLoading}
      onSubmit={handleSubmit}
    />
  )
}

const BarcodeTagCreateModal = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("tagsTab.createTitle")}</Heading>
      </RouteDrawer.Header>
      <CreateTagDrawerContent />
    </RouteDrawer>
  )
}

export default BarcodeTagCreateModal

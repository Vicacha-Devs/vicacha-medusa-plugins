import { useState } from "react"
import { Button, Drawer, Hint, Input, Label, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type SendQuoteDrawerProps = {
  open: boolean
  onClose: () => void
  onConfirm: (expiresAt: string | null) => void
  isPending?: boolean
}

export function SendQuoteDrawer({ open, onClose, onConfirm, isPending }: SendQuoteDrawerProps) {
  const { t } = useTranslation()
  const [expiresAt, setExpiresAt] = useState("")

  const handleConfirm = () => {
    onConfirm(expiresAt || null)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setExpiresAt("")
      onClose()
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("quotes.detail.sendQuote")}</Drawer.Title>
        </Drawer.Header>

        <Drawer.Body className="flex flex-col gap-y-4 p-6">
          <Text className="text-ui-fg-subtle">
            {t("quotes.prompts.send.description")}
          </Text>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="expires-at" size="small" weight="plus">
              {t("quotes.send.expiresAt")}
            </Label>
            <Input
              id="expires-at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <Hint>{t("quotes.send.expiresAtHint")}</Hint>
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleConfirm} isLoading={isPending}>
            {t("actions.send")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

import { Trash } from "@medusajs/icons";
import { Button, Prompt } from "@medusajs/ui";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";

interface DeletePromptProps {
  handleDelete: () => void;
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const DeletePrompt = ({
  handleDelete,
  loading,
  open,
  setOpen,
}: DeletePromptProps): JSX.Element => {
  const { t } = useTranslation();

  const handleConfirmDelete = async () => {
    handleDelete();
    setOpen(false);
  };

  return (
    <Prompt open={open} onOpenChange={setOpen}>
      <Prompt.Content className="p-4 pb-0 border-b shadow-ui-fg-shadow">
        <Prompt.Title>{t("deletePrompt.title")}</Prompt.Title>
        <Prompt.Description>
          {t("deletePrompt.description")}
        </Prompt.Description>
        <Prompt.Footer>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            isLoading={loading}
          >
            <Trash />
            {t("deletePrompt.delete")}
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t("deletePrompt.cancel")}
          </Button>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
};

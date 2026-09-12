import {
  AdminOrder,
  AdminOrderPreview,
} from "@medusajs/framework/types";
import { Button, Container, Heading, Input, toast } from "@medusajs/ui";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StackedFocusModal,
  useStackedModal,
} from "@vicacha-devs/medusa-shared-admin/admin";
import { useAddItemsToQuote } from "../../../../../../hooks/api";
import { ManageItem } from "./manage-item.tsx";
import { ManageItemsTable } from "./manage-items-table.tsx";

type ManageItemsSectionProps = {
  order: AdminOrder;
  preview: AdminOrderPreview;
  onItemChange: (itemId: string, changes: { quantity?: number; unit_price?: number }) => void;
};

export const ManageItemsSection = ({
  order,
  preview,
  onItemChange,
}: ManageItemsSectionProps) => {
  const { t } = useTranslation();
  const { setIsOpen } = useStackedModal();
  const [filterTerm, setFilterTerm] = useState("");
  const addedVariantsRef = useRef<string[]>([]);

  const { mutateAsync: addItems, isPending } = useAddItemsToQuote(preview.id);

  const onItemsSelected = async () => {
    try {
      await addItems({
        items: addedVariantsRef.current.map((i) => ({
          variant_id: i,
          quantity: 1,
        })),
      });
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsOpen("inbound-items", false);
  };

  const filteredItems = useMemo(() => {
    return preview.items.filter(
      (i) => {
        const term = filterTerm.toLowerCase()
        return (
          i.title.toLowerCase().includes(term) ||
          (i as any).product_title?.toLowerCase().includes(term)
        )
      }
    ) as any[];
  }, [preview, filterTerm]);

  const originalItemsMap = useMemo(() => {
    return new Map(order.items.map((item) => [item.id, item]));
  }, [order]);

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("fields.items")}</Heading>

        <div className="flex gap-2">
          <Input
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            placeholder={t("fields.search")}
            autoComplete="off"
            type="search"
          />

          <StackedFocusModal id="inbound-items">
            <StackedFocusModal.Trigger asChild>
              <Button variant="secondary" size="small">
                {t("actions.addItems")}
              </Button>
            </StackedFocusModal.Trigger>

            <StackedFocusModal.Content>
              <StackedFocusModal.Header />

              <ManageItemsTable
                onSelectionChange={(finalSelection) => {
                  addedVariantsRef.current = finalSelection;
                }}
              />

              <StackedFocusModal.Footer>
                <div className="flex w-full items-center justify-end gap-x-4">
                  <div className="flex items-center justify-end gap-x-2">
                    <StackedFocusModal.Close asChild>
                      <Button type="button" variant="secondary" size="small">
                        {t("actions.cancel")}
                      </Button>
                    </StackedFocusModal.Close>
                    <Button
                      key="submit-button"
                      type="submit"
                      variant="primary"
                      size="small"
                      role="button"
                      disabled={isPending}
                      onClick={async () => await onItemsSelected()}
                    >
                      {t("actions.save")}
                    </Button>
                  </div>
                </div>
              </StackedFocusModal.Footer>
            </StackedFocusModal.Content>
          </StackedFocusModal>
        </div>
      </div>

      {/* Items list */}
      <div className="flex flex-col px-4 py-2">
        {filteredItems.map((item) => (
          <ManageItem
            key={item.id}
            originalItem={originalItemsMap.get(item.id)!}
            item={item}
            orderId={order.id}
            currencyCode={order.currency_code}
            onItemChange={(changes) => onItemChange(item.id, changes)}
          />
        ))}

        {filterTerm && !filteredItems.length && (
          <div
            style={{
              background:
                "repeating-linear-gradient(-45deg, rgb(212, 212, 216, 0.15), rgb(212, 212, 216,.15) 10px, transparent 10px, transparent 20px)",
            }}
            className="bg-ui-bg-field my-2 block h-[56px] w-full rounded-lg border border-dashed"
          />
        )}
      </div>
    </Container>
  );
};

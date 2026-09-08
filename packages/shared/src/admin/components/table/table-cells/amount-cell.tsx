import { clx } from "@medusajs/ui";
import type { JSX } from "react";

import { PlaceholderCell } from "./placeholder-cell";
import { formatCurrency } from "../../../lib";

type AmountCellProps = {
  currencyCode: string;
  amount?: number | null;
  originalAmount?: number | null;
  align?: "left" | "right";
  className?: string;
};

export const AmountCell = ({
  currencyCode,
  amount,
  originalAmount,
  align = "left",
  className,
}: AmountCellProps): JSX.Element => {
  if (typeof amount === "undefined" || amount === null || !currencyCode) {
    return <PlaceholderCell />;
  }

  const formatted = formatCurrency(amount, currencyCode);
  const originalAmountPresent = typeof originalAmount === "number";
  const originalAmountDiffers = originalAmount !== amount;
  const shouldShowAmountDiff = originalAmountPresent && originalAmountDiffers;

  return (
    <div
      className={clx(
        "flex h-full w-full items-center overflow-hidden",
        {
          "flex-col": shouldShowAmountDiff,
          "justify-start text-left": align === "left",
          "justify-end text-right": align === "right",
        },
        className
      )}
    >
      {shouldShowAmountDiff ? (
        <>
          <span className="truncate line-through text-xs">
            {formatCurrency(originalAmount!, currencyCode)}
          </span>
          <span className="truncate text-blue-400 txt-small">{formatted}</span>
        </>
      ) : (
        <>
          <span className="truncate">{formatted}</span>
        </>
      )}
    </div>
  );
};

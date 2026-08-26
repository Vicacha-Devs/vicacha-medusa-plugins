import { HttpTypes } from "@medusajs/framework/types";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";

import { Thumbnail } from "../../common";

type ProductCellProps = {
  product: HttpTypes.AdminProduct;
};

export const ProductCell = ({ product }: ProductCellProps): JSX.Element => {
  return (
    <div className="flex h-full w-full items-center gap-x-3 overflow-hidden">
      <div className="w-fit flex-shrink-0">
        <Thumbnail src={product.thumbnail} />
      </div>
      <span className="truncate">{product.title}</span>
    </div>
  );
};

export const ProductHeader = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.product")}</span>
    </div>
  );
};

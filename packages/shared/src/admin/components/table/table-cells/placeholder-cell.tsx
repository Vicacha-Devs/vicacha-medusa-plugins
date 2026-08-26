import type { JSX } from "react";
export const PlaceholderCell = (): JSX.Element => {
  return (
    <div className="flex h-full w-full items-center">
      <span className="text-ui-fg-muted">-</span>
    </div>
  );
};

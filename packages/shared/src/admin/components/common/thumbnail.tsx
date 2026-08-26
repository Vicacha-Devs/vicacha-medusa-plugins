import { Photo } from "@medusajs/icons";
import type { JSX } from "react";

type ThumbnailProps = {
  src?: string | null;
  alt?: string;
};

export const Thumbnail = ({ src, alt }: ThumbnailProps): JSX.Element => {
  return (
    <div className="bg-ui-bg-component flex h-8 w-6 items-center justify-center overflow-hidden rounded-[4px]">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <Photo className="text-ui-fg-subtle" />
      )}
    </div>
  );
};

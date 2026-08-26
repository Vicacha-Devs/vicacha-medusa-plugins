import { Input } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

interface DataTableSearchProps {
  /**
   * Prefix used to namespace the query param (matches the table prefix).
   */
  prefix?: string;
  /**
   * Whether the input should be focused on mount.
   */
  autofocus?: boolean;
  /**
   * Placeholder text for the search input.
   */
  placeholder?: string;
}

export const DataTableSearch = ({
  prefix,
  autofocus = false,
  placeholder = "Search",
}: DataTableSearchProps): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryKey = prefix ? `${prefix}_q` : "q";
  const offsetKey = prefix ? `${prefix}_offset` : "offset";

  const urlValue = searchParams.get(queryKey) ?? "";
  const [value, setValue] = useState(urlValue);

  // Keep the input in sync when the URL changes externally (e.g. back/forward).
  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  // Debounce writes to the URL so we don't refetch on every keystroke.
  useEffect(() => {
    if (value === urlValue) {
      return;
    }

    const timeout = setTimeout(() => {
      setSearchParams(
        (prev: URLSearchParams) => {
          const next = new URLSearchParams(prev);

          if (value) {
            next.set(queryKey, value);
          } else {
            next.delete(queryKey);
          }

          // Reset pagination whenever the search term changes.
          next.delete(offsetKey);

          return next;
        },
        { replace: true }
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [value, urlValue, queryKey, offsetKey, setSearchParams]);

  return (
    <Input
      type="search"
      size="small"
      autoFocus={autofocus}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
    />
  );
};

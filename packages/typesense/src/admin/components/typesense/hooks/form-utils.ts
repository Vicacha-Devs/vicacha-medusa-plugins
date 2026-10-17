import type React from "react"

export type FormEventOrValues<T> = React.FormEvent | T

export function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Handlers accept either a form submit event or an explicit values object.
 * Prevents the default submit and returns the values object (if any).
 */
export function unwrapFormValues<T extends object>(
  eOrValues?: FormEventOrValues<T>
): T | undefined {
  if (eOrValues && "preventDefault" in eOrValues) {
    eOrValues.preventDefault()
    return undefined
  }
  return eOrValues as T | undefined
}

export function parseCurationIncludes(
  raw: string
): Array<{ id: string; position: number }> {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, idx) => {
      const [idPart, posPart] = entry.split(":").map((p) => p.trim())
      const parsedPos = Number(posPart)
      return {
        id: idPart,
        position:
          Number.isFinite(parsedPos) && parsedPos > 0 ? parsedPos : idx + 1,
      }
    })
    .filter((item) => Boolean(item.id))
}

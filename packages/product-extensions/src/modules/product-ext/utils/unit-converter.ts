import { MedusaError } from "@medusajs/framework/utils"
import type { UnitCode, UnitFamily } from "../types"

interface UnitDescriptor {
  code: UnitCode
  family: UnitFamily
  label: string
  toSI: (val: number) => number
  fromSI: (si: number) => number
}

const UNIT_REGISTRY: Record<UnitCode, UnitDescriptor> = {
  // Length (SI base: meter "m")
  mm: {
    code: "mm",
    family: "length",
    label: "mm",
    toSI: (v) => v * 0.001,
    fromSI: (s) => s / 0.001,
  },
  cm: {
    code: "cm",
    family: "length",
    label: "cm",
    toSI: (v) => v * 0.01,
    fromSI: (s) => s / 0.01,
  },
  m: {
    code: "m",
    family: "length",
    label: "m",
    toSI: (v) => v,
    fromSI: (s) => s,
  },
  in: {
    code: "in",
    family: "length",
    label: "in",
    toSI: (v) => v * 0.0254,
    fromSI: (s) => s / 0.0254,
  },
  ft: {
    code: "ft",
    family: "length",
    label: "ft",
    toSI: (v) => v * 0.3048,
    fromSI: (s) => s / 0.3048,
  },

  // Mass (SI base: kilogram "kg")
  mg: {
    code: "mg",
    family: "mass",
    label: "mg",
    toSI: (v) => v * 0.000001,
    fromSI: (s) => s / 0.000001,
  },
  g: {
    code: "g",
    family: "mass",
    label: "g",
    toSI: (v) => v * 0.001,
    fromSI: (s) => s / 0.001,
  },
  kg: {
    code: "kg",
    family: "mass",
    label: "kg",
    toSI: (v) => v,
    fromSI: (s) => s,
  },
  oz: {
    code: "oz",
    family: "mass",
    label: "oz",
    toSI: (v) => v * 0.028349523125,
    fromSI: (s) => s / 0.028349523125,
  },
  lb: {
    code: "lb",
    family: "mass",
    label: "lb",
    toSI: (v) => v * 0.45359237,
    fromSI: (s) => s / 0.45359237,
  },

  // Volume (SI base: liter "l")
  ml: {
    code: "ml",
    family: "volume",
    label: "mL",
    toSI: (v) => v * 0.001,
    fromSI: (s) => s / 0.001,
  },
  l: {
    code: "l",
    family: "volume",
    label: "L",
    toSI: (v) => v,
    fromSI: (s) => s,
  },
  fl_oz: {
    code: "fl_oz",
    family: "volume",
    label: "fl oz",
    toSI: (v) => v * 0.0295735295625,
    fromSI: (s) => s / 0.0295735295625,
  },
  gal: {
    code: "gal",
    family: "volume",
    label: "gal",
    toSI: (v) => v * 3.785411784,
    fromSI: (s) => s / 3.785411784,
  },

  // Area (SI base: square meter "m2")
  cm2: {
    code: "cm2",
    family: "area",
    label: "cm²",
    toSI: (v) => v * 0.0001,
    fromSI: (s) => s / 0.0001,
  },
  m2: {
    code: "m2",
    family: "area",
    label: "m²",
    toSI: (v) => v,
    fromSI: (s) => s,
  },
  sq_in: {
    code: "sq_in",
    family: "area",
    label: "in²",
    toSI: (v) => v * 0.00064516,
    fromSI: (s) => s / 0.00064516,
  },
  sq_ft: {
    code: "sq_ft",
    family: "area",
    label: "ft²",
    toSI: (v) => v * 0.09290304,
    fromSI: (s) => s / 0.09290304,
  },

  // Temperature (SI base: Kelvin "k")
  c: {
    code: "c",
    family: "temperature",
    label: "°C",
    toSI: (v) => v + 273.15,
    fromSI: (s) => s - 273.15,
  },
  f: {
    code: "f",
    family: "temperature",
    label: "°F",
    toSI: (v) => (v - 32) * (5 / 9) + 273.15,
    fromSI: (s) => (s - 273.15) * (9 / 5) + 32,
  },
  k: {
    code: "k",
    family: "temperature",
    label: "K",
    toSI: (v) => v,
    fromSI: (s) => s,
  },

  // Power (SI base: Watt "w")
  w: {
    code: "w",
    family: "power",
    label: "W",
    toSI: (v) => v,
    fromSI: (s) => s,
  },
  kw: {
    code: "kw",
    family: "power",
    label: "kW",
    toSI: (v) => v * 1000,
    fromSI: (s) => s / 1000,
  },
  hp: {
    code: "hp",
    family: "power",
    label: "hp",
    toSI: (v) => v * 745.699872,
    fromSI: (s) => s / 745.699872,
  },
}

export function getUnitsByFamily(family: UnitFamily): UnitCode[] {
  return (Object.values(UNIT_REGISTRY) as UnitDescriptor[])
    .filter((u) => u.family === family)
    .map((u) => u.code)
}

export function getUnitFamily(unit: UnitCode): UnitFamily {
  const descriptor = UNIT_REGISTRY[unit]
  if (!descriptor) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported unit code: "${unit}"`
    )
  }
  return descriptor.family
}

export function normalizeToSI(
  value: number,
  unit: UnitCode,
  expectedFamily?: UnitFamily | null
): number {
  if (!Number.isFinite(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Numeric unit value must be a finite number"
    )
  }
  const descriptor = UNIT_REGISTRY[unit]
  if (!descriptor) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported unit code: "${unit}"`
    )
  }
  if (expectedFamily && descriptor.family !== expectedFamily) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unit "${unit}" belongs to family "${descriptor.family}", expected "${expectedFamily}"`
    )
  }
  const normalized = descriptor.toSI(value)
  return Number(normalized.toFixed(9))
}

export function convertUnit(
  value: number,
  fromUnit: UnitCode,
  toUnit: UnitCode
): number {
  const fromDesc = UNIT_REGISTRY[fromUnit]
  const toDesc = UNIT_REGISTRY[toUnit]
  if (!fromDesc || !toDesc) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported unit conversion: "${fromUnit}" -> "${toUnit}"`
    )
  }
  if (fromDesc.family !== toDesc.family) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Cannot convert between different unit families ("${fromDesc.family}" and "${toDesc.family}")`
    )
  }
  const si = fromDesc.toSI(value)
  return Number(toDesc.fromSI(si).toFixed(6))
}

export function formatUnitDisplay(value: number, unit?: UnitCode | null): string {
  if (!unit) {
    return String(value)
  }
  const descriptor = UNIT_REGISTRY[unit]
  return descriptor ? `${value} ${descriptor.label}` : `${value} ${unit}`
}

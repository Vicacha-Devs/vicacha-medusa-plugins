export interface DaneDepartment {
  code: string
  name: string
}

export interface DaneMunicipality {
  code: string
  name: string
  department_code: string
  department_name: string
  default_postal_code: string
}

export const DANE_DEPARTMENTS: readonly DaneDepartment[] = [
  { code: "05", name: "Antioquia" },
  { code: "08", name: "Atlántico" },
  { code: "11", name: "Bogotá, D.C." },
  { code: "13", name: "Bolívar" },
  { code: "15", name: "Boyacá" },
  { code: "17", name: "Caldas" },
  { code: "18", name: "Caquetá" },
  { code: "19", name: "Cauca" },
  { code: "20", name: "Cesar" },
  { code: "23", name: "Córdoba" },
  { code: "25", name: "Cundinamarca" },
  { code: "27", name: "Chocó" },
  { code: "41", name: "Huila" },
  { code: "44", name: "La Guajira" },
  { code: "47", name: "Magdalena" },
  { code: "50", name: "Meta" },
  { code: "52", name: "Nariño" },
  { code: "54", name: "Norte de Santander" },
  { code: "63", name: "Quindío" },
  { code: "66", name: "Risaralda" },
  { code: "68", name: "Santander" },
  { code: "70", name: "Sucre" },
  { code: "73", name: "Tolima" },
  { code: "76", name: "Valle del Cauca" },
  { code: "81", name: "Arauca" },
  { code: "85", name: "Casanare" },
  { code: "86", name: "Putumayo" },
  { code: "88", name: "Archipiélago de San Andrés, Providencia y Santa Catalina" },
  { code: "91", name: "Amazonas" },
  { code: "94", name: "Guainía" },
  { code: "95", name: "Guaviare" },
  { code: "97", name: "Vaupés" },
  { code: "99", name: "Vichada" },
] as const

export const DANE_MUNICIPALITIES: readonly DaneMunicipality[] = [
  {
    code: "11001",
    name: "Bogotá, D.C.",
    department_code: "11",
    department_name: "Bogotá, D.C.",
    default_postal_code: "110111",
  },
  {
    code: "05001",
    name: "Medellín",
    department_code: "05",
    department_name: "Antioquia",
    default_postal_code: "050001",
  },
  {
    code: "05266",
    name: "Envigado",
    department_code: "05",
    department_name: "Antioquia",
    default_postal_code: "055420",
  },
  {
    code: "05360",
    name: "Itagüí",
    department_code: "05",
    department_name: "Antioquia",
    default_postal_code: "055410",
  },
  {
    code: "05088",
    name: "Bello",
    department_code: "05",
    department_name: "Antioquia",
    default_postal_code: "051050",
  },
  {
    code: "05615",
    name: "Rionegro",
    department_code: "05",
    department_name: "Antioquia",
    default_postal_code: "054040",
  },
  {
    code: "76001",
    name: "Cali",
    department_code: "76",
    department_name: "Valle del Cauca",
    default_postal_code: "760001",
  },
  {
    code: "76520",
    name: "Palmira",
    department_code: "76",
    department_name: "Valle del Cauca",
    default_postal_code: "763531",
  },
  {
    code: "08001",
    name: "Barranquilla",
    department_code: "08",
    department_name: "Atlántico",
    default_postal_code: "080001",
  },
  {
    code: "13001",
    name: "Cartagena de Indias",
    department_code: "13",
    department_name: "Bolívar",
    default_postal_code: "130001",
  },
  {
    code: "68001",
    name: "Bucaramanga",
    department_code: "68",
    department_name: "Santander",
    default_postal_code: "680001",
  },
  {
    code: "68276",
    name: "Floridablanca",
    department_code: "68",
    department_name: "Santander",
    default_postal_code: "681001",
  },
  {
    code: "66001",
    name: "Pereira",
    department_code: "66",
    department_name: "Risaralda",
    default_postal_code: "660001",
  },
  {
    code: "17001",
    name: "Manizales",
    department_code: "17",
    department_name: "Caldas",
    default_postal_code: "170001",
  },
  {
    code: "63001",
    name: "Armenia",
    department_code: "63",
    department_name: "Quindío",
    default_postal_code: "630001",
  },
  {
    code: "73001",
    name: "Ibagué",
    department_code: "73",
    department_name: "Tolima",
    default_postal_code: "730001",
  },
  {
    code: "47001",
    name: "Santa Marta",
    department_code: "47",
    department_name: "Magdalena",
    default_postal_code: "470001",
  },
  {
    code: "54001",
    name: "Cúcuta",
    department_code: "54",
    department_name: "Norte de Santander",
    default_postal_code: "540001",
  },
  {
    code: "50001",
    name: "Villavicencio",
    department_code: "50",
    department_name: "Meta",
    default_postal_code: "500001",
  },
  {
    code: "52001",
    name: "Pasto",
    department_code: "52",
    department_name: "Nariño",
    default_postal_code: "520001",
  },
  {
    code: "23001",
    name: "Montería",
    department_code: "23",
    department_name: "Córdoba",
    default_postal_code: "230001",
  },
  {
    code: "20001",
    name: "Valledupar",
    department_code: "20",
    department_name: "Cesar",
    default_postal_code: "200001",
  },
  {
    code: "41001",
    name: "Neiva",
    department_code: "41",
    department_name: "Huila",
    default_postal_code: "410001",
  },
  {
    code: "19001",
    name: "Popayán",
    department_code: "19",
    department_name: "Cauca",
    default_postal_code: "190001",
  },
  {
    code: "15001",
    name: "Tunja",
    department_code: "15",
    department_name: "Boyacá",
    default_postal_code: "150001",
  },
  {
    code: "25175",
    name: "Chía",
    department_code: "25",
    department_name: "Cundinamarca",
    default_postal_code: "250001",
  },
  {
    code: "25754",
    name: "Soacha",
    department_code: "25",
    department_name: "Cundinamarca",
    default_postal_code: "250051",
  },
  {
    code: "85001",
    name: "Yopal",
    department_code: "85",
    department_name: "Casanare",
    default_postal_code: "850001",
  },
] as const

function normalizeSearchToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

/**
 * Resolves a DANE DIVIPOLA municipality by 5-digit code or city name,
 * falling back to Bogotá D.C. (`11001`) if not matched.
 */
export function resolveDaneMunicipality(
  codeOrCity?: string | null,
  departmentHint?: string | null
): DaneMunicipality {
  const query = String(codeOrCity ?? "").trim()
  if (query.length > 0) {
    const byCode = DANE_MUNICIPALITIES.find((m) => m.code === query)
    if (byCode) {
      return byCode
    }

    const normalizedQuery = normalizeSearchToken(query)
    const byName = DANE_MUNICIPALITIES.find((m) => {
      const normName = normalizeSearchToken(m.name)
      return (
        normName === normalizedQuery ||
        normName.includes(normalizedQuery) ||
        normalizedQuery.includes(normName)
      )
    })
    if (byName) {
      return byName
    }
  }

  if (departmentHint) {
    const normDep = normalizeSearchToken(departmentHint)
    const byDep = DANE_MUNICIPALITIES.find(
      (m) =>
        m.department_code === departmentHint.trim() ||
        normalizeSearchToken(m.department_name).includes(normDep)
    )
    if (byDep) {
      return byDep
    }
  }

  return DANE_MUNICIPALITIES[0]
}

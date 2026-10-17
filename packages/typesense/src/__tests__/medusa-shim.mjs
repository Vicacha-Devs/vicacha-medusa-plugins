const chainableField = () => {
  const field = {
    primaryKey: () => field,
    searchable: () => field,
    nullable: () => field,
    default: () => field,
  }
  return field
}

export const model = {
  define(name, schema) {
    return {
      name,
      schema,
      indexes() {
        return this
      },
    }
  },
  id: chainableField,
  text: chainableField,
  number: chainableField,
  boolean: chainableField,
  json: chainableField,
  dateTime: chainableField,
  enum: chainableField,
}

export function MedusaService(models = {}) {
  return class BaseMedusaService {
    constructor() {
      this.__stores = {}
      let counter = 1
      for (const key of Object.keys(models)) {
        const plural = key.endsWith("s")
          ? key
          : key.endsWith("y")
            ? `${key.slice(0, -1)}ies`
            : `${key}s`
        this.__stores[plural] = []

        if (typeof this[`list${plural}`] !== "function") {
          this[`list${plural}`] = async (filter = {}) => {
            const rows = this.__stores[plural]
            return rows.filter((row) =>
              Object.entries(filter).every(([k, v]) =>
                v === undefined ? true : row[k] === v
              )
            )
          }
        }
        if (typeof this[`create${plural}`] !== "function") {
          this[`create${plural}`] = async (data) => {
            const items = Array.isArray(data) ? data : [data]
            const created = items.map((item) => {
              const record = {
                id: item.id ?? `${key.toLowerCase()}_${counter++}`,
                created_at: new Date(),
                updated_at: new Date(),
                ...item,
              }
              this.__stores[plural].push(record)
              return record
            })
            return Array.isArray(data) ? created : created[0]
          }
        }
        if (typeof this[`update${plural}`] !== "function") {
          this[`update${plural}`] = async (data) => {
            const rows = this.__stores[plural]
            const idx = rows.findIndex((r) => r.id === data.id)
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...data, updated_at: new Date() }
              return rows[idx]
            }
            return data
          }
        }
        if (typeof this[`delete${plural}`] !== "function") {
          this[`delete${plural}`] = async (ids) => {
            const idList = Array.isArray(ids) ? ids : [ids]
            this.__stores[plural] = this.__stores[plural].filter(
              (r) => !idList.includes(r.id)
            )
          }
        }
      }
    }
  }
}

export class AbstractSearchProviderService {
  constructor() {}
}

export class MedusaError extends Error {
  static Types = {
    DB_ERROR: "database_error",
    DUPLICATE_ERROR: "duplicate_error",
    INVALID_ARGUMENT: "invalid_argument",
    INVALID_DATA: "invalid_data",
    UNAUTHORIZED: "unauthorized",
    NOT_FOUND: "not_found",
    NOT_ALLOWED: "not_allowed",
    UNEXPECTED_STATE: "unexpected_state",
    CONFLICT: "conflict",
  }

  constructor(type, message, code) {
    super(message)
    this.type = type
    this.code = code
    this.name = "MedusaError"
  }
}

export function Module(name, config) {
  return { name, ...config }
}

export function ModuleProvider(name, config) {
  return { name, ...config }
}

export const Modules = {
  PRODUCT: "product",
  INDEX: "index",
  SEARCH: "search",
}

export const ContainerRegistrationKeys = {
  QUERY: "query",
  LOGGER: "logger",
}

const makeSearchFieldBuilder = (type) => {
  const meta = {
    type,
    array: false,
    searchable: false,
    weight: 1,
    sortable: false,
    filterable: false,
    facetable: false,
  }
  const builder = {
    __meta: meta,
    array() {
      meta.array = true
      return builder
    },
    searchable(opts = {}) {
      meta.searchable = true
      if (opts.weight !== undefined) meta.weight = opts.weight
      return builder
    },
    sortable() {
      meta.sortable = true
      return builder
    },
    filterable() {
      meta.filterable = true
      return builder
    },
    facetable(opts = {}) {
      meta.facetable = opts || true
      return builder
    },
  }
  return builder
}

export const search = {
  define(fieldsObj) {
    const out = { ...fieldsObj }
    Object.defineProperty(out, "toFields", {
      enumerable: false,
      value: () =>
        Object.entries(fieldsObj).map(([name, f]) => ({
          name,
          ...(f?.__meta || { type: "text" }),
        })),
    })
    return out
  },
  text: () => makeSearchFieldBuilder("text"),
  keyword: () => makeSearchFieldBuilder("keyword"),
  boolean: () => makeSearchFieldBuilder("boolean"),
  integer: () => makeSearchFieldBuilder("integer"),
  float: () => makeSearchFieldBuilder("float"),
  date: () => makeSearchFieldBuilder("date"),
  geo: () => makeSearchFieldBuilder("geo"),
  object: () => makeSearchFieldBuilder("object"),
  vector: () => makeSearchFieldBuilder("vector"),
}

export function defineSearchIndex(config) {
  return config
}

function makeZodSchema(baseOpts = {}) {
  const opts = {
    kind: baseOpts.kind || "any",
    shape: baseOpts.shape || null,
    coerceNumber: Boolean(baseOpts.coerceNumber),
    regex: baseOpts.regex || null,
    defaultValue: baseOpts.defaultValue,
    hasDefault: Boolean(baseOpts.hasDefault),
    isOptional: Boolean(baseOpts.isOptional),
    isNullable: Boolean(baseOpts.isNullable),
    transformFn: baseOpts.transformFn || null,
  }

  const schema = {
    min: () => schema,
    max: () => schema,
    int: () => schema,
    url: () => schema,
    optional() {
      opts.isOptional = true
      return schema
    },
    nullable() {
      opts.isNullable = true
      return schema
    },
    regex(re) {
      opts.regex = re
      return schema
    },
    default(val) {
      opts.defaultValue = val
      opts.hasDefault = true
      opts.isOptional = true
      return schema
    },
    transform(fn) {
      opts.transformFn = fn
      return schema
    },
    safeParse(input) {
      let val = input
      if (val === undefined && opts.hasDefault) {
        val = opts.defaultValue
      }
      if (val === undefined && opts.isOptional) {
        if (opts.transformFn) {
          val = opts.transformFn(val)
        }
        return { success: true, data: val }
      }
      if (val === null && opts.isNullable) {
        return { success: true, data: null }
      }
      if (opts.coerceNumber && val !== undefined) {
        val = Number(val)
        if (Number.isNaN(val)) {
          return {
            success: false,
            error: { flatten: () => ({ fieldErrors: {} }) },
          }
        }
      }
      if (opts.regex && typeof val === "string" && !opts.regex.test(val)) {
        return {
          success: false,
          error: { flatten: () => ({ fieldErrors: {} }) },
        }
      }
      if (opts.kind === "object" && opts.shape) {
        if (!val || typeof val !== "object") {
          return {
            success: false,
            error: { flatten: () => ({ fieldErrors: {} }) },
          }
        }
        const out = { ...val }
        for (const [k, fieldSchema] of Object.entries(opts.shape)) {
          if (fieldSchema && typeof fieldSchema.safeParse === "function") {
            const sub = fieldSchema.safeParse(val[k])
            if (!sub.success) {
              return {
                success: false,
                error: { flatten: () => ({ fieldErrors: { [k]: ["Invalid"] } }) },
              }
            }
            if (sub.data !== undefined) {
              out[k] = sub.data
            }
          }
        }
        val = out
      }
      if (opts.transformFn) {
        val = opts.transformFn(val)
      }
      return { success: true, data: val }
    },
    parse(input) {
      const res = schema.safeParse(input)
      if (!res.success) throw new Error("Zod validation error")
      return res.data
    },
  }
  return schema
}

export const z = {
  object: (shape) => makeZodSchema({ kind: "object", shape }),
  string: () => makeZodSchema({ kind: "string" }),
  number: () => makeZodSchema({ kind: "number" }),
  boolean: () => makeZodSchema({ kind: "boolean" }),
  enum: () => makeZodSchema({ kind: "enum" }),
  array: () => makeZodSchema({ kind: "array" }),
  record: () => makeZodSchema({ kind: "record" }),
  unknown: () => makeZodSchema({ kind: "unknown" }),
  union: () => makeZodSchema({ kind: "union" }),
  coerce: {
    number: () => makeZodSchema({ kind: "number", coerceNumber: true }),
  },
}

export class Client {
  constructor() {}
}

export default {
  Client,
}

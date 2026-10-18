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

export const Modules = {
  PRODUCT: "product",
  FILE: "file",
  INVENTORY: "inventory",
}

export function defineLink(left, right) {
  return { left, right }
}

export function MedusaService(models = {}) {
  return class BaseMedusaService {
    constructor() {
      this.__stores = {}
      let counter = 1
      for (const key of Object.keys(models)) {
        const plural = key.endsWith("y")
          ? `${key.slice(0, -1)}ies`
          : `${key}s`
        this.__stores[plural] = []

        if (typeof this[`list${plural}`] !== "function") {
          this[`list${plural}`] = async (filter = {}) => {
            const rows = this.__stores[plural]
            return rows.filter((row) =>
              Object.entries(filter).every(([k, v]) =>
                v === undefined
                  ? true
                  : Array.isArray(v)
                    ? v.includes(row[k])
                    : row[k] === v
              )
            )
          }
        }
        if (typeof this[`create${plural}`] !== "function") {
          this[`create${plural}`] = async (data) => {
            const record = {
              id: data.id ?? `${key.toLowerCase()}_${counter++}`,
              created_at: new Date(),
              updated_at: new Date(),
              ...data,
            }
            this.__stores[plural].push(record)
            return record
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
            const idSet = new Set(Array.isArray(ids) ? ids : [ids])
            this.__stores[plural] = this.__stores[plural].filter(
              (r) => !idSet.has(r.id)
            )
          }
        }
      }
    }
  }
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
  return {
    name,
    linkable: {
      productExtension: { serviceName: name, entity: "ProductExtension" },
      variantExtension: { serviceName: name, entity: "VariantExtension" },
    },
    ...config,
  }
}

export class StepResponse {
  constructor(output, compensateInput) {
    this.output = output
    this.compensateInput = compensateInput
  }
}

export class WorkflowResponse {
  constructor(output) {
    this.output = output
  }
}

export function createStep(name, invokeFn, compensateFn) {
  const stepFn = (input) => ({
    __stepName: name,
    input,
    invokeFn,
    compensateFn,
  })
  stepFn.__stepName = name
  stepFn.invoke = invokeFn
  stepFn.compensate = compensateFn
  return stepFn
}

export function createWorkflow(name, composerFn) {
  const wf = (container) => ({
    async run({ input } = {}) {
      const composed = composerFn(input)
      const stepDescriptor =
        composed instanceof WorkflowResponse ? composed.output : composed
      if (stepDescriptor && typeof stepDescriptor.invokeFn === "function") {
        const stepRes = await stepDescriptor.invokeFn(stepDescriptor.input, {
          container,
        })
        const result =
          stepRes instanceof StepResponse ? stepRes.output : stepRes
        return {
          result,
          compensate: async () => {
            if (typeof stepDescriptor.compensateFn === "function") {
              await stepDescriptor.compensateFn(stepRes?.compensateInput, {
                container,
              })
            }
          },
        }
      }
      return { result: stepDescriptor }
    },
  })
  wf.getName = () => name
  return wf
}

export class Migration {
  constructor() {
    this.queries = []
  }

  addSql(sql) {
    this.queries.push(sql)
  }
}


const createZodChain = (shape = {}) => {
  const schema = {
    shape,
    min: () => schema,
    max: () => schema,
    int: () => schema,
    regex: () => schema,
    or: () => schema,
    positive: () => schema,
    nonnegative: () => schema,
    email: () => schema,
    url: () => schema,
    optional: () => schema,
    nullable: () => schema,
    default: () => schema,
    partial: () => createZodChain(shape),
    omit: () => createZodChain(shape),
    passthrough: () => schema,
    parse: (val) => val,
    safeParse: (val) => ({ success: true, data: val }),
  }
  return schema
}

export const z = {
  object: (shape) => createZodChain(shape),
  string: () => createZodChain(),
  number: () => createZodChain(),
  boolean: () => createZodChain(),
  enum: (values) => createZodChain({ values }),
  array: (item) => createZodChain({ item }),
  record: (key, val) => createZodChain({ key, val }),
  unknown: () => createZodChain(),
  union: (items) => createZodChain({ items }),
}

export function defineMiddlewares(config) {
  return config
}

export function validateAndTransformBody(schema) {
  return schema
}

export function defineRouteConfig(config) {
  return config
}

export function defineWidgetConfig(config) {
  return config
}

export const useState = (init) => [
  typeof init === "function" ? init() : init,
  () => {},
]
export const useEffect = () => {}
export const useCallback = (fn) => fn
export const useRef = (init) => ({ current: init })
export const createElement = (type, props, ...children) => ({
  type,
  props: { ...props, children },
})
export const jsx = createElement
export const jsxs = createElement
export const Fragment = "Fragment"

export const useTranslation = () => ({
  t: (key) => key,
  i18n: {
    language: "en",
    resolvedLanguage: "en",
    changeLanguage: async () => {},
    dir: () => "ltr",
  },
  ready: true,
})

export default {
  linkable: {
    product: { serviceName: "product", entity: "Product" },
    productVariant: { serviceName: "product", entity: "ProductVariant" },
  },
  useState,
  useEffect,
  useCallback,
  useRef,
  createElement,
  Fragment,
  useTranslation,
}


export const zodResolver = () => () => ({ values: {}, errors: {} })
export const useForm = (opts = {}) => ({
  register: (name) => ({ name }),
  handleSubmit: (fn) => (e) => fn(opts.defaultValues ?? {}, e),
  reset: () => {},
  setValue: () => {},
  watch: () => opts.defaultValues ?? {},
  formState: { errors: {}, isDirty: false, isSubmitting: false },
})

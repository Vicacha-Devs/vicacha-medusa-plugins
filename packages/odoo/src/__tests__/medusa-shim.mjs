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
      for (const key of Object.keys(models)) {
        const plural = `${key}s`
        if (typeof this[`list${plural}`] !== "function") {
          this[`list${plural}`] = async () => []
        }
        if (typeof this[`create${plural}`] !== "function") {
          this[`create${plural}`] = async (data) => data
        }
        if (typeof this[`update${plural}`] !== "function") {
          this[`update${plural}`] = async (data) => data
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
  return { name, ...config }
}

export const ContainerRegistrationKeys = {
  QUERY: "query",
  LOGGER: "logger",
}

export const Modules = {
  PRODUCT: "product",
  INVENTORY: "inventory",
  ORDER: "order",
  CUSTOMER: "customer",
}

export const ProductStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
}

const createZodChain = (shape = {}) => {
  const schema = {
    shape,
    min: () => schema,
    max: () => schema,
    int: () => schema,
    positive: () => schema,
    nonnegative: () => schema,
    email: () => schema,
    url: () => schema,
    optional: () => schema,
    nullable: () => schema,
    default: () => schema,
    partial: () => createZodChain(shape),
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

const uiStub = (name) => (props) => createElement(name, props)
export const ArrowPath = uiStub("ArrowPath")
export const BuildingStorefront = uiStub("BuildingStorefront")
export const CheckCircle = uiStub("CheckCircle")
export const DocumentText = uiStub("DocumentText")
export const Tag = uiStub("Tag")
export const Badge = uiStub("Badge")
export const StatusBadge = uiStub("StatusBadge")
export const Button = uiStub("Button")
export const Container = uiStub("Container")
export const Heading = uiStub("Heading")
export const Input = uiStub("Input")
export const Label = uiStub("Label")
export const Skeleton = uiStub("Skeleton")
export const Switch = uiStub("Switch")
export const Text = uiStub("Text")
export const Toaster = uiStub("Toaster")
export const clx = (...classes) => classes.filter(Boolean).join(" ")
export const toast = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
}
export const Table = Object.assign(uiStub("Table"), {
  Header: uiStub("Table.Header"),
  Body: uiStub("Table.Body"),
  Row: uiStub("Table.Row"),
  HeaderCell: uiStub("Table.HeaderCell"),
  Cell: uiStub("Table.Cell"),
})
export const Tabs = Object.assign(uiStub("Tabs"), {
  List: uiStub("Tabs.List"),
  Trigger: uiStub("Tabs.Trigger"),
  Content: uiStub("Tabs.Content"),
})
export const Select = Object.assign(uiStub("Select"), {
  Trigger: uiStub("Select.Trigger"),
  Value: uiStub("Select.Value"),
  Content: uiStub("Select.Content"),
  Item: uiStub("Select.Item"),
})
export const CORE_LAYOUT_IDS = {
  SINGLE_COLUMN: "single_column",
  TWO_COLUMN: "two_column",
}
export const LayoutComposer = Object.assign(uiStub("LayoutComposer"), {
  Entry: uiStub("LayoutComposer.Entry"),
})
export const SectionRow = uiStub("SectionRow")
export const KeyboundForm = uiStub("KeyboundForm")
export const Form = Object.assign(uiStub("Form"), {
  Field: uiStub("Form.Field"),
  Item: uiStub("Form.Item"),
  Label: uiStub("Form.Label"),
  Control: uiStub("Form.Control"),
  ErrorMessage: uiStub("Form.ErrorMessage"),
  Hint: uiStub("Form.Hint"),
})
export const useNavigate = () => () => {}
export const useParams = () => ({})

export default {
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
  control: {},
  register: (name) => ({ name }),
  handleSubmit: (fn) => (e) => fn(opts.defaultValues ?? {}, e),
  reset: () => {},
  setValue: () => {},
  watch: () => opts.defaultValues ?? {},
  formState: { errors: {}, isDirty: false, isSubmitting: false },
})

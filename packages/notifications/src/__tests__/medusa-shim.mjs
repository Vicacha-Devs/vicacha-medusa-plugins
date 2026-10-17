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
  ORDER: "order",
  CUSTOMER: "customer",
  NOTIFICATION: "notification",
}

export class AbstractNotificationProviderService {
  static identifier = "abstract-notification"
}

export function ModuleProvider(moduleName, config) {
  return { moduleName, ...config }
}

export function MedusaService(models = {}) {
  return class BaseMedusaService {
    constructor() {}
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

export const CORE_LAYOUT_IDS = {
  SINGLE_COLUMN: "single_column",
  TWO_COLUMN: "two_column",
}

export function defineRouteConfig(config) {
  return config
}

export function defineWidgetConfig(config) {
  return config
}

import type {
  ContextType,
  NotificationAttachment,
  NotificationChannel,
  NotificationsPluginOptions,
  RenderedNotificationPayload,
  RenderTemplateInput,
  TemplateBlockNode,
  SupportedLocale,
  TemplateMode,
} from "../types"

export type RenderTemplateByIdParams = {
  template_id: string
  context_type?: ContextType
  data?: Record<string, any>
  locale?: string | null
  subject?: string | null
  variable_map_override?: Record<string, string> | null
  telegram_thread_id?: number | null
  attachments?: NotificationAttachment[]
  append_sms_consent_footer?: boolean
}

/**
 * Delegates to an external service's `render` callback for `external_*` templates
 * that were not loaded as block templates. Returns `null` when none produces output.
 */
export async function renderWithExternalService(
  options: NotificationsPluginOptions,
  params: { template_id: string; subject?: string | null },
  contextData: Record<string, any>,
  locale: SupportedLocale,
  translations: Record<string, any>
): Promise<RenderedNotificationPayload | null> {
  const extServices = options.extend?.services || []
  for (const svc of extServices) {
    if (typeof svc.render !== "function") continue
    const res = await svc.render({
      templateId: params.template_id,
      context: contextData,
      locale,
      translations,
      subject: params.subject,
    })
    if (res && res.text) {
      return {
        channel: (svc.channel || "email") as NotificationChannel,
        template_id: params.template_id,
        template_name: params.template_id,
        locale,
        text: res.text,
        ...res,
      }
    }
  }
  return null
}

/**
 * Assembles the `renderNotificationTemplate` input from a resolved template and call params.
 */
export function buildRenderInput(args: {
  template: Record<string, any>
  blocks: TemplateBlockNode[]
  params: RenderTemplateByIdParams
  options: NotificationsPluginOptions
  locale: SupportedLocale
  translations: Record<string, any>
  contextData: Record<string, any>
}): RenderTemplateInput {
  const { template, blocks, params, options, locale, translations, contextData } =
    args
  const mergedVariableMap = {
    ...(template.variable_map || {}),
    ...(params.variable_map_override || {}),
  }

  const effectiveSubject =
    params.subject ??
    template.subject ??
    (translations.headerTitle || translations.general?.headerTitle
      ? "{{translations.headerTitle}}"
      : undefined)

  return {
    template_id: template.id,
    template_name: template.name,
    channel: template.channel as NotificationChannel,
    mode: (template.mode || "blocks") as TemplateMode,
    locale: params.locale || template.locale || locale,
    subject: effectiveSubject,
    raw_content: template.raw_content,
    blocks,
    variable_map: mergedVariableMap,
    meta_template_name: template.meta_template_name,
    meta_language_code: template.meta_language_code || locale,
    styles: template.styles,
    data: contextData,
    translations,
    pluginOptions: options,
    attachments: params.attachments,
    telegram_thread_id: params.telegram_thread_id,
    append_sms_consent_footer: params.append_sms_consent_footer,
  }
}

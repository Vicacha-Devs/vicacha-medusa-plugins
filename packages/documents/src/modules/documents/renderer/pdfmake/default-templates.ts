import {
  DocumentType,
  TemplateSectionsConfig,
  TemplateStylesConfig,
} from "../../types"

export const DEFAULT_TEMPLATE_STYLES: TemplateStylesConfig = {
  primary_color: "#18181b",
  secondary_color: "#71717a",
  accent_color: "#2563eb",
  text_color: "#18181b",
  background_color: "#ffffff",
  font_family: "Roboto",
  font_size: 10,
  header_alignment: "left",
  logo_max_width: 120,
  logo_max_height: 48,
  border_radius: 4,
  margin_top: 36,
  margin_right: 36,
  margin_bottom: 36,
  margin_left: 36,
}

export const DEFAULT_TEMPLATE_SECTIONS: TemplateSectionsConfig = {
  show_logo: true,
  show_company_info: true,
  show_company_tax_id: true,
  show_billing_address: true,
  show_shipping_address: true,
  show_b2b_fields: true,
  show_sku: true,
  show_discount_column: false,
  show_tax_column: true,
  show_shipping_line: true,
  show_payment_method: true,
  show_notes: true,
  show_bank_details: true,
  show_footer: true,
  show_signature_block: false,
  show_barcode: false,
}

export const DEFAULT_HANDLEBARS_TEMPLATES: Record<DocumentType, string> = {
  invoice: `
<div>
  <table style="width: 100%; margin-bottom: 16px;">
    <tr>
      <td style="width: 55%;">
        {{#if sections.show_company_info}}
          <h2 style="color: {{styles.primary_color}}; margin: 0 0 4px 0;">{{settings.company_name}}</h2>
          <p style="color: {{styles.secondary_color}}; font-size: 9px; margin: 0;">{{settings.company_address}}</p>
          {{#if settings.company_tax_id}}
            <p style="color: {{styles.secondary_color}}; font-size: 9px; margin: 2px 0;">{{t.tax_id}}: {{settings.company_tax_id}}</p>
          {{/if}}
        {{/if}}
      </td>
      <td style="width: 45%; text-align: right;">
        <h1 style="color: {{styles.primary_color}}; margin: 0 0 6px 0;">{{t.invoice_title}}</h1>
        <p style="font-size: 9px; margin: 2px 0;"><strong>{{t.invoice_number}}:</strong> {{document_number}}</p>
        <p style="font-size: 9px; margin: 2px 0;"><strong>{{t.order_number}}:</strong> #{{order.display_id}}</p>
        <p style="font-size: 9px; margin: 2px 0;"><strong>{{t.issue_date}}:</strong> {{formatted_issue_date}}</p>
      </td>
    </tr>
  </table>

  <table style="width: 100%; margin-bottom: 16px;">
    <tr>
      <td style="width: 50%;">
        <p style="font-size: 8px; color: {{styles.secondary_color}}; text-transform: uppercase;"><strong>{{t.bill_to}}</strong></p>
        {{#each billing_lines}}
          <p style="font-size: 9px; margin: 1px 0;">{{this}}</p>
        {{/each}}
        {{#if b2b.is_b2b}}
          {{#if b2b.tax_id}}<p style="font-size: 8px; margin: 2px 0;">{{t.tax_id}}: {{b2b.tax_id}}</p>{{/if}}
          {{#if b2b.po_number}}<p style="font-size: 8px; margin: 2px 0;">{{t.po_number}}: {{b2b.po_number}}</p>{{/if}}
        {{/if}}
      </td>
      <td style="width: 50%;">
        {{#if sections.show_shipping_address}}
          <p style="font-size: 8px; color: {{styles.secondary_color}}; text-transform: uppercase;"><strong>{{t.ship_to}}</strong></p>
          {{#each shipping_lines}}
            <p style="font-size: 9px; margin: 1px 0;">{{this}}</p>
          {{/each}}
        {{/if}}
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
    <thead>
      <tr style="background-color: #f4f4f5;">
        <th style="text-align: left; padding: 6px; font-size: 8px;">{{t.item_description}}</th>
        <th style="text-align: left; padding: 6px; font-size: 8px;">{{t.sku}}</th>
        <th style="text-align: right; padding: 6px; font-size: 8px;">{{t.quantity}}</th>
        <th style="text-align: right; padding: 6px; font-size: 8px;">{{t.unit_price}}</th>
        <th style="text-align: right; padding: 6px; font-size: 8px;">{{t.total}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each formatted_items}}
        <tr>
          <td style="padding: 6px; font-size: 9px;">{{this.title}}</td>
          <td style="padding: 6px; font-size: 8px; color: #71717a;">{{this.sku}}</td>
          <td style="padding: 6px; font-size: 9px; text-align: right;">{{this.quantity}}</td>
          <td style="padding: 6px; font-size: 9px; text-align: right;">{{this.unit_price_formatted}}</td>
          <td style="padding: 6px; font-size: 9px; text-align: right;">{{this.total_formatted}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>

  <table style="width: 100%; margin-top: 12px;">
    <tr>
      <td style="width: 60%;">
        {{#if settings.notes}}
          <p style="font-size: 8px; color: {{styles.secondary_color}};"><strong>{{t.notes}}</strong></p>
          <p style="font-size: 9px;">{{settings.notes}}</p>
        {{/if}}
      </td>
      <td style="width: 40%; text-align: right;">
        <p style="font-size: 9px; margin: 2px 0;">{{t.subtotal}}: <strong>{{formatted_totals.subtotal}}</strong></p>
        <p style="font-size: 9px; margin: 2px 0;">{{t.shipping_total}}: <strong>{{formatted_totals.shipping_total}}</strong></p>
        <p style="font-size: 9px; margin: 2px 0;">{{t.tax_total}}: <strong>{{formatted_totals.tax_total}}</strong></p>
        <h3 style="color: {{styles.primary_color}}; margin: 6px 0 0 0;">{{t.grand_total}}: {{formatted_totals.total}}</h3>
      </td>
    </tr>
  </table>
</div>
`,
  packing_slip: `
<div>
  <h1 style="color: {{styles.primary_color}}; margin: 0 0 4px 0;">{{t.packing_slip_title}} — {{document_number}}</h1>
  <p style="font-size: 9px; margin: 0 0 12px 0;">{{t.order_number}}: #{{order.display_id}} • {{t.issue_date}}: {{formatted_issue_date}}</p>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: #f4f4f5;">
        <th style="text-align: left; padding: 6px; font-size: 8px;">{{t.item_description}}</th>
        <th style="text-align: left; padding: 6px; font-size: 8px;">{{t.sku}}</th>
        <th style="text-align: right; padding: 6px; font-size: 8px;">{{t.quantity}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each formatted_items}}
        <tr>
          <td style="padding: 6px; font-size: 9px;">{{this.title}}</td>
          <td style="padding: 6px; font-size: 9px;">{{this.sku}}</td>
          <td style="padding: 6px; font-size: 9px; text-align: right;"><strong>{{this.quantity}}</strong></td>
        </tr>
      {{/each}}
    </tbody>
  </table>
</div>
`,
  credit_note: `
<div>
  <h1 style="color: #b91c1c; margin: 0 0 4px 0;">{{t.credit_note_title}} — {{document_number}}</h1>
  <p style="font-size: 9px; margin: 0 0 8px 0;">{{t.reference_invoice}}: {{related_document.document_number}} • {{t.order_number}}: #{{order.display_id}}</p>
  {{#if refund.reason}}
    <p style="font-size: 9px; color: #b91c1c; margin: 0 0 12px 0;"><strong>{{t.refund_reason}}:</strong> {{refund.reason}}</p>
  {{/if}}
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: #fef2f2;">
        <th style="text-align: left; padding: 6px; font-size: 8px;">{{t.item_description}}</th>
        <th style="text-align: right; padding: 6px; font-size: 8px;">{{t.quantity}}</th>
        <th style="text-align: right; padding: 6px; font-size: 8px;">{{t.total}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each formatted_items}}
        <tr>
          <td style="padding: 6px; font-size: 9px;">{{this.title}}</td>
          <td style="padding: 6px; font-size: 9px; text-align: right;">{{this.quantity}}</td>
          <td style="padding: 6px; font-size: 9px; text-align: right; color: #b91c1c;">{{this.total_formatted}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>
  <h3 style="text-align: right; color: #b91c1c; margin-top: 12px;">{{t.refund_total}}: {{formatted_totals.total}}</h3>
</div>
`,
  receipt: `
<div style="text-align: center;">
  <h3 style="margin: 0 0 2px 0;">{{settings.company_name}}</h3>
  <p style="font-size: 8px; margin: 0 0 6px 0;">{{settings.company_address}}</p>
  <p style="font-size: 8px; margin: 2px 0;">{{t.receipt_number}}: {{document_number}}</p>
  <p style="font-size: 8px; margin: 2px 0;">{{t.order_number}}: #{{order.display_id}}</p>
  <hr />
  <table style="width: 100%;">
    <tbody>
      {{#each formatted_items}}
        <tr>
          <td style="text-align: left; font-size: 8px;">{{this.quantity}}x {{this.title}}</td>
          <td style="text-align: right; font-size: 8px;">{{this.total_formatted}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>
  <hr />
  <p style="font-size: 9px;"><strong>{{t.grand_total}}: {{formatted_totals.total}}</strong></p>
  <p style="font-size: 7px;">{{t.thank_you}}</p>
</div>
`,
}

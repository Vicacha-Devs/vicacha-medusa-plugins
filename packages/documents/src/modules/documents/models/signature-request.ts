import { model } from "@medusajs/framework/utils"
import { SIGNATURE_STATUSES } from "../types"

export const SignatureRequest = model
  .define("mpd_signature_request", {
    id: model.id().primaryKey(),
    document_id: model.text(),
    order_id: model.text(),
    docuseal_submission_id: model.number(),
    docuseal_submitter_id: model.number().nullable(),
    signer_email: model.text(),
    signer_name: model.text().nullable(),
    embed_src: model.text().nullable(),
    status: model.enum([...SIGNATURE_STATUSES]).default("pending"),
    signed_file_id: model.text().nullable(),
    signed_file_url: model.text().nullable(),
    sent_at: model.dateTime().nullable(),
    opened_at: model.dateTime().nullable(),
    completed_at: model.dateTime().nullable(),
    declined_at: model.dateTime().nullable(),
    decline_reason: model.text().nullable(),
    audit_log_url: model.text().nullable(),
    raw_webhook_payload: model.json().nullable(),
  })
  .indexes([
    {
      on: ["document_id"],
      name: "IDX_mpd_sig_req_document_id",
    },
    {
      on: ["order_id"],
      name: "IDX_mpd_sig_req_order_id",
    },
    {
      on: ["docuseal_submission_id"],
      name: "IDX_mpd_sig_req_submission_id",
    },
  ])

export default SignatureRequest

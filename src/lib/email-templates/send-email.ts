import * as React from 'react'
import { render } from '@react-email/render'
import { sendResendEmail } from '../resend.server'
import { TEMPLATES } from './registry'

// Server-only: sends through Resend (RESEND_API_KEY). Never import from client components.

const SITE_NAME = "GlobeSIM"

/**
 * Domain of the From address: explicit option, else the shop's sender domain (app_settings.email_settings,
 * the one verified in Resend), else EMAIL_FROM_DOMAIN. Customer mail is gated on that setting in email.server.ts.
 */
export async function resolveSenderDomain(explicit?: string): Promise<string> {
  if (explicit) return explicit
  const { loadEmailSettings } = await import('../email.server')
  const fromSettings = (await loadEmailSettings()).sender_domain
  const domain = fromSettings || process.env['EMAIL_FROM_DOMAIN'] || ''
  if (!domain) throw Object.assign(new Error('No sender domain configured'), { code: 'sender_domain_missing' })
  return domain
}

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string
  replyTo?: string
  /** Local part of the From address (e.g. "bestellung"); defaults to noreply. */
  fromLocal?: string
  /** Overrides the sender domain (see resolveSenderDomain). */
  fromDomain?: string
}

/**
 * Renders a registered template and sends it through Resend. Retries with the
 * same idempotencyKey never deliver twice. Failures throw an EmailSendError
 * (.code and .status for branching); the shape of a suppressed recipient is kept
 * for callers, Resend reports suppressions asynchronously.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  await sendResendEmail({
    from: { name: SITE_NAME, address: `${options.fromLocal || 'noreply'}@${await resolveSenderDomain(options.fromDomain)}` },
    to: recipient,
    subject,
    html,
    text,
    idempotencyKey: options.idempotencyKey || crypto.randomUUID(),
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  })

  return { sent: true }
}

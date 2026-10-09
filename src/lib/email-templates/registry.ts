import type { ComponentType } from 'react'
import { template as orderConfirmation } from './order-confirmation'
import { template as orderReady } from './order-ready'
import { template as orderProblem } from './order-problem'
import { template as usageAlert } from './usage-alert'
import { template as refundNotice } from './refund-notice'
import { template as adminTest } from './admin-test'
import { template as adminRefundRequest } from './admin-refund-request'
import { template as adminNewOrder } from './admin-new-order'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/** Template registry — maps template names to their React Email components. */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-confirmation': orderConfirmation,
  'order-ready': orderReady,
  'order-problem': orderProblem,
  'usage-alert': usageAlert,
  'refund-notice': refundNotice,
  'admin-test': adminTest,
  'admin-refund-request': adminRefundRequest,
  'admin-new-order': adminNewOrder,
}

import { api } from '@/lib/api-client'
import type { Payment, PayoutRecord, ReceiptData } from '@/lib/types'
import type { ApiList, ApiItem } from '@/lib/types'

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentListParams {
  page?: number
  perPage?: number
  method?: Payment['method']
  status?: Payment['status']
  dateFrom?: string
  dateTo?: string
}

export interface InitiatePaymentData {
  bookingId?: number
  fleetBookingId?: number
  amount: number
  currency: string
  method: string
  provider: string
  customerPhone?: string
}

export interface InitiatePaymentResult {
  payment: Payment
  result: {
    transactionId: string
    status: string
    redirectUrl?: string
    clientSecret?: string
  }
}

export interface CashPaymentData {
  bookingId: number
  amount: number
  currency: string
  notes?: string
}

export const paymentsApi = {
  list: (params?: PaymentListParams) =>
    api.get<ApiList<Payment>>('/payments', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  get: (id: number) => api.get<ApiItem<Payment>>(`/payments/${id}`),

  initiate: (data: InitiatePaymentData) =>
    api.post<{ success: true; data: InitiatePaymentResult }>('/payments/initiate', data),

  status: (id: number) =>
    api.get<{ success: true; data: { status: string; payment: Payment } }>(`/payments/${id}/status`),

  refund: (id: number, amount?: number) =>
    api.post<ApiItem<Payment>>(`/payments/${id}/refund`, { amount }),

  cash: (data: CashPaymentData) => api.post<ApiItem<Payment>>('/payments/cash', data),

  receipt: (id: number) => api.get<ApiItem<ReceiptData>>(`/payments/${id}/receipt`),
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

export interface PayoutListParams {
  page?: number
  perPage?: number
  status?: PayoutRecord['status']
}

export const payoutsApi = {
  list: (params?: PayoutListParams) =>
    api.get<ApiList<PayoutRecord>>('/payouts', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  get: (id: number) => api.get<ApiItem<PayoutRecord>>(`/payouts/${id}`),

  create: (data: Record<string, unknown>) => api.post<ApiItem<PayoutRecord>>('/payouts', data),
}

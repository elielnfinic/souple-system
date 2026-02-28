import { api } from '@/lib/api-client'
import type { RequestOptions } from '@/lib/api-client'
import type { Vehicle, SeatLayout, SeatClass, ApiList, ApiItem } from '@/lib/types'

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export interface VehicleListParams {
  page?: number
  perPage?: number
  type?: string
  verificationStatus?: string
  visibility?: string
  search?: string
  organizationId?: number
}

export interface CreateVehicleData {
  type: Vehicle['type']
  brand: string
  model: string
  year?: number
  color: string
  plateNumber: string
  totalSeats: number
  visibility?: Vehicle['visibility']
  isAvailableForRental?: boolean
  features?: string[]
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {}

export interface VerifyVehicleData {
  status: 'verified' | 'rejected'
  note?: string
}

export const vehiclesApi = {
  list: (params?: VehicleListParams) =>
    api.get<ApiList<Vehicle>>('/vehicles', {
      params: params as RequestOptions['params'],
    }),

  get: (id: number) =>
    api.get<ApiItem<Vehicle>>(`/vehicles/${id}`),

  create: (data: CreateVehicleData) =>
    api.post<ApiItem<Vehicle>>('/vehicles', data),

  update: (id: number, data: UpdateVehicleData) =>
    api.put<ApiItem<Vehicle>>(`/vehicles/${id}`, data),

  delete: (id: number) =>
    api.delete<{ success: true }>(`/vehicles/${id}`),

  verify: (id: number, data: VerifyVehicleData) =>
    api.patch<ApiItem<Vehicle>>(`/vehicles/${id}/verify`, data),
}

// ─── Seat Layouts ─────────────────────────────────────────────────────────────

export interface CreateSeatLayoutData {
  name: string
  rows: number
  columns: number
  layoutData: {
    seats: Array<{
      id: string
      row: number
      col: number
      type: string
      class?: string | null
      bookable: boolean
      label?: string
      price_multiplier?: number
      features?: string[]
    }>
  }
  isDefault?: boolean
}

export interface UpdateSeatLayoutData extends Partial<CreateSeatLayoutData> {}

export const seatLayoutsApi = {
  list: (vehicleId: number) =>
    api.get<ApiList<SeatLayout>>(`/vehicles/${vehicleId}/seat-layouts`),

  create: (vehicleId: number, data: CreateSeatLayoutData) =>
    api.post<ApiItem<SeatLayout>>(`/vehicles/${vehicleId}/seat-layouts`, data),

  update: (vehicleId: number, id: number, data: UpdateSeatLayoutData) =>
    api.put<ApiItem<SeatLayout>>(`/vehicles/${vehicleId}/seat-layouts/${id}`, data),

  setDefault: (vehicleId: number, id: number) =>
    api.patch<ApiItem<SeatLayout>>(`/vehicles/${vehicleId}/seat-layouts/${id}/default`, {}),

  delete: (vehicleId: number, id: number) =>
    api.delete<{ success: true }>(`/vehicles/${vehicleId}/seat-layouts/${id}`),
}

// ─── Seat Classes ─────────────────────────────────────────────────────────────

export const seatClassesApi = {
  list: () =>
    api.get<ApiList<SeatClass>>('/seat-classes'),
}

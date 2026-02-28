import { DateTime } from 'luxon'
import Vehicle from '#models/vehicle'
import type { VehicleType, VehicleVisibility, VehicleVerificationStatus, VehiclePhoto } from '#models/vehicle'

export interface CreateVehicleData {
  type: VehicleType
  brand: string
  model: string
  year?: number
  color: string
  plateNumber: string
  chassisNumber?: string
  totalSeats: number
  visibility?: VehicleVisibility
  isAvailableForRental?: boolean
  features?: string[]
  insuranceExpiry?: Date | DateTime
  technicalVisitExpiry?: Date | DateTime
}

export interface UpdateVehicleData {
  type?: VehicleType
  brand?: string
  model?: string
  year?: number
  color?: string
  plateNumber?: string
  chassisNumber?: string
  totalSeats?: number
  visibility?: VehicleVisibility
  isAvailableForRental?: boolean
  features?: string[]
  insuranceExpiry?: Date | DateTime
  technicalVisitExpiry?: Date | DateTime
}

function toDateTime(value: Date | DateTime | undefined | null): DateTime | null {
  if (!value) return null
  if (value instanceof Date) return DateTime.fromJSDate(value).toUTC()
  return value
}

export interface VehicleFilters {
  type?: VehicleType
  status?: VehicleVerificationStatus
  visibility?: VehicleVisibility
  search?: string
  page?: number
  perPage?: number
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  lastPage: number
}

export interface PaginatedVehicles {
  data: Vehicle[]
  meta: PaginationMeta
}

export class VehicleService {
  /**
   * Create a new vehicle, associating it with a user and optionally an org.
   */
  async create(data: CreateVehicleData, userId: number, orgId?: number): Promise<Vehicle> {
    const vehicle = await Vehicle.create({
      ownerUserId: userId,
      organizationId: orgId ?? null,
      type: data.type,
      brand: data.brand,
      model: data.model,
      year: data.year ?? null,
      color: data.color,
      plateNumber: data.plateNumber,
      chassisNumber: data.chassisNumber ?? null,
      totalSeats: data.totalSeats,
      visibility: data.visibility ?? 'public',
      isAvailableForRental: data.isAvailableForRental ?? false,
      verificationStatus: 'pending',
      isActive: true,
      rating: null,
      totalTrips: 0,
      features: data.features ?? null,
      photos: null,
      insuranceExpiry: toDateTime(data.insuranceExpiry),
      technicalVisitExpiry: toDateTime(data.technicalVisitExpiry),
    })

    return vehicle
  }

  /**
   * Update a vehicle's mutable fields.
   */
  async update(vehicleId: number, data: UpdateVehicleData): Promise<Vehicle> {
    const vehicle = await Vehicle.findOrFail(vehicleId)

    if (data.type !== undefined) vehicle.type = data.type
    if (data.brand !== undefined) vehicle.brand = data.brand
    if (data.model !== undefined) vehicle.model = data.model
    if (data.year !== undefined) vehicle.year = data.year
    if (data.color !== undefined) vehicle.color = data.color
    if (data.plateNumber !== undefined) vehicle.plateNumber = data.plateNumber
    if (data.chassisNumber !== undefined) vehicle.chassisNumber = data.chassisNumber
    if (data.totalSeats !== undefined) vehicle.totalSeats = data.totalSeats
    if (data.visibility !== undefined) vehicle.visibility = data.visibility
    if (data.isAvailableForRental !== undefined) vehicle.isAvailableForRental = data.isAvailableForRental
    if (data.features !== undefined) vehicle.features = data.features
    if (data.insuranceExpiry !== undefined) vehicle.insuranceExpiry = toDateTime(data.insuranceExpiry)
    if (data.technicalVisitExpiry !== undefined) vehicle.technicalVisitExpiry = toDateTime(data.technicalVisitExpiry)

    await vehicle.save()
    return vehicle
  }

  /**
   * Update a vehicle's verification status (super_admin action).
   */
  async verify(vehicleId: number, status: 'verified' | 'rejected', _notes?: string): Promise<void> {
    const vehicle = await Vehicle.findOrFail(vehicleId)
    vehicle.verificationStatus = status
    await vehicle.save()
  }

  /**
   * List vehicles scoped to an organization with optional filters.
   */
  async listByOrg(orgId: number, filters: VehicleFilters = {}): Promise<PaginatedVehicles> {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 20, 100)

    const query = Vehicle.query()
      .where('organization_id', orgId)
      .where('is_active', true)

    if (filters.type) query.where('type', filters.type)
    if (filters.status) query.where('verification_status', filters.status)
    if (filters.visibility) query.where('visibility', filters.visibility)
    if (filters.search) {
      query.where((q) => {
        q.where('brand', 'like', `%${filters.search}%`)
          .orWhere('model', 'like', `%${filters.search}%`)
          .orWhere('plate_number', 'like', `%${filters.search}%`)
      })
    }

    const paginated = await query.orderBy('created_at', 'desc').paginate(page, perPage)
    const json = paginated.toJSON()

    return {
      data: json.data,
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    }
  }

  /**
   * List public, verified vehicles for the public listing endpoint.
   */
  async listPublic(filters: VehicleFilters = {}): Promise<PaginatedVehicles> {
    const page = filters.page ?? 1
    const perPage = Math.min(filters.perPage ?? 20, 100)

    const query = Vehicle.query()
      .where('is_active', true)
      .where('visibility', 'public')
      .where('verification_status', 'verified')

    if (filters.type) query.where('type', filters.type)
    if (filters.search) {
      query.where((q) => {
        q.where('brand', 'like', `%${filters.search}%`)
          .orWhere('model', 'like', `%${filters.search}%`)
      })
    }

    const paginated = await query.orderBy('rating', 'desc').paginate(page, perPage)
    const json = paginated.toJSON()

    return {
      data: json.data,
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    }
  }

  /**
   * Soft-delete a vehicle by setting is_active = false.
   */
  async softDelete(vehicleId: number): Promise<void> {
    const vehicle = await Vehicle.findOrFail(vehicleId)
    vehicle.isActive = false
    await vehicle.save()
  }

  /**
   * Append a photo entry to the vehicle's photos JSON array.
   */
  async uploadPhoto(
    vehicleId: number,
    fileInfo: { url: string; key: string; isPrimary: boolean }
  ): Promise<void> {
    const vehicle = await Vehicle.findOrFail(vehicleId)
    const photos = vehicle.photos ?? []

    // If this photo is primary, demote all others
    if (fileInfo.isPrimary) {
      for (const photo of photos) {
        photo.isPrimary = false
      }
    }

    photos.push({
      url: fileInfo.url,
      key: fileInfo.key,
      isPrimary: fileInfo.isPrimary,
    })

    vehicle.photos = photos
    await vehicle.save()
  }

  /**
   * Remove a photo from the vehicle's photos JSON array by key.
   */
  async deletePhoto(vehicleId: number, key: string): Promise<void> {
    const vehicle = await Vehicle.findOrFail(vehicleId)
    const photos = (vehicle.photos ?? []).filter((p: VehiclePhoto) => p.key !== key)
    vehicle.photos = photos.length > 0 ? photos : null
    await vehicle.save()
  }
}

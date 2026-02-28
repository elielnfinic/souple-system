import Vehicle from '#models/vehicle'

export interface VehicleListFilters {
  orgId?: number
  ownerId?: number
  visibility?: string
  verificationStatus?: string
  type?: string
  page?: number
  limit?: number
}

export class VehicleService {
  async list(filters: VehicleListFilters) {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 20, 100)

    let query = Vehicle.query().where('is_active', true)

    if (filters.orgId) query = query.where('organization_id', filters.orgId)
    if (filters.ownerId) query = query.where('owner_user_id', filters.ownerId)
    if (filters.visibility) query = query.where('visibility', filters.visibility)
    if (filters.verificationStatus)
      query = query.where('verification_status', filters.verificationStatus)
    if (filters.type) query = query.where('type', filters.type)

    return query.orderBy('created_at', 'desc').paginate(page, limit)
  }

  async findOrFail(id: number) {
    return Vehicle.query().where('id', id).where('is_active', true).firstOrFail()
  }

  async create(data: any, ownerUserId: number, orgId?: number): Promise<Vehicle> {
    return Vehicle.create({
      ...data,
      ownerUserId,
      organizationId: orgId ?? null,
      verificationStatus: 'pending',
      isActive: true,
      rating: 5.0,
      totalTrips: 0,
    })
  }

  async update(vehicleId: number, data: any): Promise<Vehicle> {
    const vehicle = await this.findOrFail(vehicleId)
    vehicle.merge(data)
    await vehicle.save()
    return vehicle
  }

  async verify(
    vehicleId: number,
    status: 'verified' | 'rejected',
    notes?: string
  ): Promise<Vehicle> {
    const vehicle = await Vehicle.findOrFail(vehicleId)
    vehicle.verificationStatus = status
    await vehicle.save()
    // notes can be used for audit logging in a future iteration (Skill 07)
    if (notes) {
      console.info(`[Vehicle verify] id=${vehicleId} status=${status} notes=${notes}`)
    }
    return vehicle
  }

  async softDelete(vehicleId: number): Promise<void> {
    const vehicle = await this.findOrFail(vehicleId)
    vehicle.isActive = false
    await vehicle.save()
  }
}

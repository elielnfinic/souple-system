import SeatLayout from '#models/seat_layout'

export class SeatLayoutService {
  async listByVehicle(vehicleId: number) {
    return SeatLayout.query().where('vehicle_id', vehicleId).orderBy('is_default', 'desc')
  }

  async findOrFail(vehicleId: number, layoutId: number) {
    return SeatLayout.query()
      .where('id', layoutId)
      .where('vehicle_id', vehicleId)
      .firstOrFail()
  }

  async create(vehicleId: number, data: any): Promise<SeatLayout> {
    return SeatLayout.create({
      ...data,
      vehicleId,
    })
  }

  async update(layoutId: number, data: any): Promise<SeatLayout> {
    const layout = await SeatLayout.findOrFail(layoutId)
    layout.merge(data)
    await layout.save()
    return layout
  }

  async setDefault(vehicleId: number, layoutId: number): Promise<void> {
    await SeatLayout.query().where('vehicle_id', vehicleId).update({ is_default: false })
    await SeatLayout.query()
      .where('id', layoutId)
      .where('vehicle_id', vehicleId)
      .update({ is_default: true })
  }

  async delete(layoutId: number): Promise<void> {
    const layout = await SeatLayout.findOrFail(layoutId)
    await layout.delete()
  }
}

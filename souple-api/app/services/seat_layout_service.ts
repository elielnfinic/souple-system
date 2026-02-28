import SeatLayout from '#models/seat_layout'
import type { LayoutData, SeatDefinition } from '#models/seat_layout'

export interface CreateSeatLayoutData {
  name: string
  rows: number
  columns: number
  layoutData: LayoutData
  isDefault?: boolean
}

export interface UpdateSeatLayoutData {
  name?: string
  rows?: number
  columns?: number
  layoutData?: LayoutData
  isDefault?: boolean
}

export interface LayoutValidationResult {
  valid: boolean
  errors: string[]
}

export class SeatLayoutService {
  /**
   * Create a new seat layout for a vehicle.
   * If isDefault is true, any previously default layout is demoted first.
   */
  async create(vehicleId: number, data: CreateSeatLayoutData): Promise<SeatLayout> {
    if (data.isDefault) {
      await this.unsetAllDefaults(vehicleId)
    }

    // If this is the first layout for the vehicle, make it default automatically
    const existingCount = await SeatLayout.query()
      .where('vehicle_id', vehicleId)
      .where('is_active', true)
      .count('* as total')

    const isFirstLayout = Number((existingCount[0] as any).$extras.total) === 0

    const layout = await SeatLayout.create({
      vehicleId,
      name: data.name,
      rows: data.rows,
      columns: data.columns,
      layoutData: data.layoutData,
      isDefault: data.isDefault ?? isFirstLayout,
      isActive: true,
    })

    return layout
  }

  /**
   * Update an existing seat layout's fields.
   */
  async update(layoutId: number, data: UpdateSeatLayoutData): Promise<SeatLayout> {
    const layout = await SeatLayout.findOrFail(layoutId)

    if (data.isDefault === true) {
      await this.unsetAllDefaults(layout.vehicleId)
    }

    if (data.name !== undefined) layout.name = data.name
    if (data.rows !== undefined) layout.rows = data.rows
    if (data.columns !== undefined) layout.columns = data.columns
    if (data.layoutData !== undefined) layout.layoutData = data.layoutData
    if (data.isDefault !== undefined) layout.isDefault = data.isDefault

    await layout.save()
    return layout
  }

  /**
   * Set one layout as default for the vehicle (unsets all others).
   */
  async setDefault(vehicleId: number, layoutId: number): Promise<void> {
    // Verify the layout belongs to the vehicle
    await SeatLayout.query()
      .where('id', layoutId)
      .where('vehicle_id', vehicleId)
      .where('is_active', true)
      .firstOrFail()

    await this.unsetAllDefaults(vehicleId)

    const layout = await SeatLayout.findOrFail(layoutId)
    layout.isDefault = true
    await layout.save()
  }

  /**
   * List all active seat layouts for a vehicle.
   */
  async list(vehicleId: number): Promise<SeatLayout[]> {
    return SeatLayout.query()
      .where('vehicle_id', vehicleId)
      .where('is_active', true)
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'asc')
  }

  /**
   * Get a single seat layout by ID.
   */
  async get(layoutId: number): Promise<SeatLayout> {
    return SeatLayout.findOrFail(layoutId)
  }

  /**
   * Soft-delete a layout by setting is_active = false.
   * If the deleted layout was default, promote the next available layout.
   */
  async delete(layoutId: number): Promise<void> {
    const layout = await SeatLayout.findOrFail(layoutId)
    const wasDefault = layout.isDefault

    layout.isActive = false
    layout.isDefault = false
    await layout.save()

    // Auto-promote another layout if the deleted one was default
    if (wasDefault) {
      const next = await SeatLayout.query()
        .where('vehicle_id', layout.vehicleId)
        .where('is_active', true)
        .orderBy('created_at', 'asc')
        .first()

      if (next) {
        next.isDefault = true
        await next.save()
      }
    }
  }

  /**
   * Validate layout data for correctness.
   * Rules:
   *   - Must have at least one driver seat
   *   - Bookable seat count must be >= 1 (sanity check)
   *   - Seat IDs must be unique
   *   - Row/col values must be within bounds
   */
  validateLayout(
    layoutData: LayoutData,
    rows: number,
    columns: number
  ): LayoutValidationResult {
    const errors: string[] = []
    const seats: SeatDefinition[] = layoutData.seats ?? []

    if (seats.length === 0) {
      errors.push('Layout must contain at least one seat definition')
      return { valid: false, errors }
    }

    const driverSeats = seats.filter((s) => s.type === 'driver')
    if (driverSeats.length === 0) {
      errors.push('Layout must contain at least one driver seat')
    }

    const bookableSeats = seats.filter((s) => s.bookable)
    if (bookableSeats.length === 0) {
      errors.push('Layout must contain at least one bookable seat')
    }

    const ids = seats.map((s) => s.id)
    const uniqueIds = new Set(ids)
    if (uniqueIds.size !== ids.length) {
      errors.push('All seat IDs must be unique within the layout')
    }

    for (const seat of seats) {
      if (seat.row < 0 || seat.row >= rows) {
        errors.push(`Seat "${seat.id}" has row ${seat.row} which is out of bounds (0-${rows - 1})`)
      }
      if (seat.col < 0 || seat.col >= columns) {
        errors.push(
          `Seat "${seat.id}" has column ${seat.col} which is out of bounds (0-${columns - 1})`
        )
      }
    }

    // Check for duplicate (row, col) positions
    const positions = seats.map((s) => `${s.row}:${s.col}`)
    const uniquePositions = new Set(positions)
    if (uniquePositions.size !== positions.length) {
      errors.push('Multiple seats occupy the same row/column position')
    }

    return { valid: errors.length === 0, errors }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async unsetAllDefaults(vehicleId: number): Promise<void> {
    await SeatLayout.query()
      .where('vehicle_id', vehicleId)
      .where('is_default', true)
      .update({ is_default: false })
  }
}

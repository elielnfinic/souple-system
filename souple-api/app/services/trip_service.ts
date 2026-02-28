import db from '@adonisjs/lucid/services/db'
import Trip from '#models/trip'
import TripStop from '#models/trip_stop'
import TripSeat from '#models/trip_seat'
import Route from '#models/route'
import Vehicle from '#models/vehicle'
import { DateTime } from 'luxon'

export interface CreateTripData {
  organizationId?: number
  vehicleId: number
  routeId: number
  driverUserId?: number
  departureAt: string
  basePriceCdf: number
  basePriceUsd?: number
  notes?: string
}

export class TripService {
  async create(data: CreateTripData): Promise<Trip> {
    const trip = await Trip.create({
      organizationId: data.organizationId ?? null,
      vehicleId: data.vehicleId,
      routeId: data.routeId,
      driverUserId: data.driverUserId ?? null,
      departureAt: DateTime.fromISO(data.departureAt),
      status: 'scheduled',
      basePriceCdf: data.basePriceCdf,
      basePriceUsd: data.basePriceUsd ?? null,
      notes: data.notes ?? null,
    })

    await this.materializeStops(trip)
    await this.materializeSeats(trip)

    await trip.load('stops', (q) => q.preload('city').orderBy('stop_order'))
    await trip.load('seats')
    return trip
  }

  async materializeStops(trip: Trip): Promise<void> {
    const route = await Route.query()
      .where('id', trip.routeId)
      .preload('stops', (q) => q.orderBy('stop_order'))
      .firstOrFail()

    const departure = trip.departureAt
    const stopData = route.stops.map((stop) => {
      const scheduledDeparture = this.#calculateScheduledTime(stop, route, departure)

      return {
        tripId: trip.id,
        cityId: stop.cityId,
        stopOrder: stop.stopOrder,
        distanceFromStartKm: stop.distanceFromStartKm,
        durationFromStartMin: null as number | null,
        scheduledArrivalAt: scheduledDeparture,
        scheduledDepartureAt: scheduledDeparture,
      }
    })

    await TripStop.createMany(stopData)
  }

  async materializeSeats(trip: Trip): Promise<void> {
    const vehicle = await Vehicle.query()
      .where('id', trip.vehicleId)
      .preload('seatLayouts', (q) => q.where('is_default', true).where('is_active', true))
      .firstOrFail()

    const layout = vehicle.seatLayouts[0]
    if (!layout?.layoutData?.seats) return

    const bookableSeats = layout.layoutData.seats.filter((s) => s.bookable)
    if (bookableSeats.length === 0) return

    await TripSeat.createMany(
      bookableSeats.map((s) => ({
        tripId: trip.id,
        seatId: s.id,
        seatLabel: s.label ?? null,
        seatClass: s.class ?? null,
        seatRow: s.row,
        seatCol: s.col,
        isBookable: true,
        priceMultiplier: s.priceMultiplier ?? 1.0,
      }))
    )
  }

  async search(params: {
    fromCityId: number
    toCityId: number
    departureDate: string
    passengers?: number
    page?: number
  }): Promise<any> {
    const page = params.page ?? 1
    const limit = 20

    // Find trips that have both from and to stops in correct order, on the given date
    const tripIds = await db
      .from('trip_stops as from_stop')
      .join('trip_stops as to_stop', 'from_stop.trip_id', 'to_stop.trip_id')
      .join('trips', 'trips.id', 'from_stop.trip_id')
      .where('from_stop.city_id', params.fromCityId)
      .where('to_stop.city_id', params.toCityId)
      .whereRaw('from_stop.stop_order < to_stop.stop_order')
      .whereRaw('DATE(trips.departure_at) = ?', [params.departureDate])
      .whereIn('trips.status', ['scheduled', 'boarding'])
      .select('trips.id as trip_id')
      .orderBy('trips.departure_at')

    const ids = tripIds.map((r: { trip_id: number }) => r.trip_id)

    if (ids.length === 0) {
      return { data: [], meta: { page, perPage: limit, total: 0, lastPage: 0 } }
    }

    const paginated = await Trip.query()
      .whereIn('id', ids)
      .preload('route', (q) => q.preload('fromCity').preload('toCity'))
      .preload('vehicle')
      .preload('stops', (q) => q.preload('city').orderBy('stop_order'))
      .orderBy('departure_at')
      .paginate(page, limit)

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

  async findOrFail(id: number): Promise<Trip> {
    return Trip.query()
      .where('id', id)
      .preload('route', (q) => q.preload('fromCity').preload('toCity'))
      .preload('vehicle')
      .preload('stops', (q) => q.preload('city').orderBy('stop_order'))
      .preload('seats')
      .firstOrFail()
  }

  async list(params: { orgId?: number; page?: number; limit?: number }): Promise<any> {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 20, 100)

    let query = Trip.query()
      .preload('route', (q) => q.preload('fromCity').preload('toCity'))
      .preload('vehicle')
      .preload('stops', (q) => q.preload('city').orderBy('stop_order'))
      .orderBy('departure_at', 'desc')

    if (params.orgId) query = query.where('organization_id', params.orgId)

    const paginated = await query.paginate(page, limit)
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

  async updateStatus(tripId: number, status: string): Promise<Trip> {
    const trip = await Trip.findOrFail(tripId)
    trip.status = status as Trip['status']
    await trip.save()
    return trip
  }

  async getDriverManifest(tripId: number): Promise<any> {
    const trip = await Trip.query()
      .where('id', tripId)
      .preload('stops', (q) => q.preload('city').orderBy('stop_order'))
      .firstOrFail()

    const { default: Booking } = await import('#models/booking')
    const bookings = await Booking.query()
      .where('trip_id', tripId)
      .whereIn('status', ['confirmed', 'boarded', 'pending'])
      .preload('seats')
      .preload('boardingStop', (q) => q.preload('city'))
      .preload('alightingStop', (q) => q.preload('city'))
      .orderBy('boarding_stop_order')

    const manifest = trip.stops.map((stop) => ({
      stop: stop.serialize(),
      boarding: bookings
        .filter((b) => b.boardingStopOrder === stop.stopOrder)
        .map((b) => b.serialize()),
      alighting: bookings
        .filter((b) => b.alightingStopOrder === stop.stopOrder)
        .map((b) => b.serialize()),
    }))

    return {
      trip: trip.serialize(),
      stops: manifest,
      totalPassengers: bookings.length,
    }
  }

  #calculateScheduledTime(
    stop: { stopOrder: number; distanceFromStartKm: number | null },
    route: { estimatedDurationMin: number | null; distanceKm: number | null },
    departure: DateTime
  ): DateTime | null {
    if (stop.stopOrder === 0) return departure
    if (
      stop.distanceFromStartKm !== null &&
      route.estimatedDurationMin !== null &&
      route.distanceKm !== null &&
      route.distanceKm > 0
    ) {
      const minutes = Math.round((stop.distanceFromStartKm / route.distanceKm) * route.estimatedDurationMin)
      return departure.plus({ minutes })
    }
    return null
  }
}

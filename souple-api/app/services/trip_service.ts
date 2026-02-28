import { DateTime } from 'luxon'
import Trip from '#models/trip'
import TripStop from '#models/trip_stop'
import TripSeat from '#models/trip_seat'
import RouteStop from '#models/route_stop'
import SeatLayout from '#models/seat_layout'
import Booking from '#models/booking'
import Route from '#models/route'
import { PriceService } from '#services/price_service'
import { SeatAvailabilityService } from '#services/seat_availability_service'

export interface CreateTripData {
  organizationId?: number
  vehicleId: number
  driverUserId: number
  routeId: number
  seatLayoutId: number
  departureAt: DateTime
  estimatedArrivalAt?: DateTime
  notes?: string
  allowIntermediateBoarding?: boolean
  isRecurring?: boolean
  recurrenceRule?: string
}

export interface TripSearchFilters {
  fromCityId: number
  toCityId: number
  date: string   // YYYY-MM-DD
  seatCount?: number
  page?: number
  perPage?: number
}

export interface TripSearchResult {
  tripId: number
  vehicleId: number
  routeId: number
  boardingStopId: number
  boardingStopOrder: number
  boardingStopName: string
  alightingStopId: number
  alightingStopOrder: number
  alightingStopName: string
  boardingTime: string | null
  alightingTime: string | null
  durationMin: number | null
  availableSeats: number
  priceEconomy: number
  currency: string
  status: string
  departureAt: string
  organizationId: number | null
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  lastPage: number
}

export interface PaginatedTripSearchResult {
  data: TripSearchResult[]
  meta: PaginationMeta
}

export interface StopManifest {
  stop: TripStop
  boarding: Booking[]
  alighting: Booking[]
  onboard: Booking[]
}

const priceService = new PriceService()
const availabilityService = new SeatAvailabilityService()

export class TripService {
  /**
   * Create a trip and materialize trip_stops and trip_seats from the route and seat layout.
   */
  async create(data: CreateTripData): Promise<Trip> {
    // 1. Create trip record with placeholder total_seats (updated after seat materialization)
    const trip = await Trip.create({
      organizationId: data.organizationId ?? null,
      vehicleId: data.vehicleId,
      driverUserId: data.driverUserId,
      routeId: data.routeId,
      seatLayoutId: data.seatLayoutId,
      departureAt: data.departureAt,
      estimatedArrivalAt: data.estimatedArrivalAt ?? null,
      actualDepartureAt: null,
      actualArrivalAt: null,
      totalSeats: 0,
      status: 'scheduled',
      notes: data.notes ?? null,
      isRecurring: data.isRecurring ?? false,
      recurrenceRule: data.recurrenceRule ?? null,
      allowIntermediateBoarding: data.allowIntermediateBoarding ?? true,
    })

    // 2. Load route_stops ordered by stop_order
    const routeStops = await RouteStop.query()
      .where('route_id', data.routeId)
      .preload('city')
      .orderBy('stop_order', 'asc')

    // Load route for total distance/duration estimation
    const route = await Route.findOrFail(data.routeId)
    const totalDistanceKm = route.distanceKm ?? 0
    const totalDurationMin = route.estimatedDurationMin ?? 0

    // 3. Materialize trip_stops
    const tripStopsData = routeStops.map((rs) => {
      let scheduledArrivalAt: DateTime | null = null
      let scheduledDepartureAt: DateTime | null = null

      const distanceFraction =
        totalDistanceKm > 0 ? (rs.distanceFromStartKm ?? 0) / totalDistanceKm : 0
      const cumulativeMin = Math.round(distanceFraction * totalDurationMin)

      // First stop: no arrival, departs at trip departure_at
      if (rs.stopOrder === 0) {
        scheduledArrivalAt = null
        scheduledDepartureAt = data.departureAt
      } else {
        scheduledArrivalAt = data.departureAt.plus({ minutes: cumulativeMin })
        // Last stop: no departure
        const isLastStop = rs.stopOrder === routeStops[routeStops.length - 1].stopOrder
        scheduledDepartureAt = isLastStop ? null : data.departureAt.plus({ minutes: cumulativeMin })
      }

      return {
        tripId: trip.id,
        cityId: rs.cityId,
        stopOrder: rs.stopOrder,
        stopName: null as string | null,
        scheduledArrivalAt,
        scheduledDepartureAt,
        actualArrivalAt: null as DateTime | null,
        actualDepartureAt: null as DateTime | null,
        distanceFromStartKm: rs.distanceFromStartKm ?? 0,
        boardingEnabled: true,
        alightingEnabled: true,
      }
    })

    await TripStop.createMany(tripStopsData)

    // 4. Load seat layout and filter bookable seats
    const seatLayout = await SeatLayout.findOrFail(data.seatLayoutId)
    const bookableSeats = (seatLayout.layoutData?.seats ?? []).filter(
      (s) => s.bookable && s.type === 'seat'
    )

    const lastStopOrder = routeStops.length > 0 ? routeStops[routeStops.length - 1].stopOrder : 0

    // 5. Create trip_seats for each bookable seat
    const tripSeatsData: Array<{
      tripId: number
      seatIdentifier: string
      seatClass: string
      fullTripPrice: number
      currency: string
      isBlocked: boolean
      features: string[] | null
    }> = []

    for (const seat of bookableSeats) {
      let fullTripPrice = 0
      let currency = 'CDF'

      try {
        const priceResult = await priceService.calculateSegmentPrice({
          tripId: trip.id,
          routeId: data.routeId,
          boardingStopOrder: 0,
          alightingStopOrder: lastStopOrder,
          seatClass: seat.class ?? 'economy',
          date: data.departureAt,
          orgId: data.organizationId,
          vehicleId: data.vehicleId,
        })
        fullTripPrice = priceResult.finalPrice
        currency = priceResult.currency
      } catch {
        // Price calculation failed — leave as 0
      }

      tripSeatsData.push({
        tripId: trip.id,
        seatIdentifier: seat.id,
        seatClass: seat.class ?? 'economy',
        fullTripPrice,
        currency,
        isBlocked: false,
        features: seat.features.length > 0 ? seat.features : null,
      })
    }

    if (tripSeatsData.length > 0) {
      await TripSeat.createMany(tripSeatsData)
    }

    // 6. Update total_seats
    trip.totalSeats = bookableSeats.length
    await trip.save()

    return trip
  }

  /**
   * Search trips that serve a given city pair (supports intermediate stop matching).
   *
   * A trip from Kinshasa→Lubumbashi will be returned when searching Kikwit→Mbuji-Mayi
   * if both cities are intermediate stops with boarding/alighting enabled.
   */
  async search(filters: TripSearchFilters): Promise<PaginatedTripSearchResult> {
    const { fromCityId, toCityId, date, seatCount = 1, page = 1, perPage = 20 } = filters
    const limit = Math.min(perPage, 100)
    const offset = (page - 1) * limit

    // Build date range: the entire requested date (UTC day boundaries)
    const dayStart = `${date} 00:00:00`
    const dayEnd = `${date} 23:59:59`

    const import_db = await import('@adonisjs/lucid/services/db')
    const db = import_db.default

    const countResult = await db.rawQuery(
      `
      SELECT COUNT(DISTINCT t.id) AS total
      FROM trips t
      JOIN trip_stops ts_board
        ON ts_board.trip_id = t.id
        AND ts_board.city_id = ?
        AND ts_board.boarding_enabled = true
      JOIN trip_stops ts_alight
        ON ts_alight.trip_id = t.id
        AND ts_alight.city_id = ?
        AND ts_alight.alighting_enabled = true
      WHERE ts_board.stop_order < ts_alight.stop_order
        AND t.status IN ('scheduled', 'boarding')
        AND t.departure_at >= ?
        AND t.departure_at <= ?
      `,
      [fromCityId, toCityId, dayStart, dayEnd]
    )

    const total = parseInt((countResult[0] as any[])[0]?.total ?? '0', 10)

    const rows = await db.rawQuery(
      `
      SELECT
        t.id AS trip_id,
        t.vehicle_id,
        t.route_id,
        t.organization_id,
        t.status,
        t.departure_at,
        ts_board.id AS boarding_stop_id,
        ts_board.stop_order AS boarding_stop_order,
        ts_board.scheduled_departure_at AS boarding_time,
        ts_alight.id AS alighting_stop_id,
        ts_alight.stop_order AS alighting_stop_order,
        ts_alight.scheduled_arrival_at AS alighting_time,
        cb.name AS boarding_city_name,
        ca.name AS alighting_city_name,
        TIMESTAMPDIFF(MINUTE, ts_board.scheduled_departure_at, ts_alight.scheduled_arrival_at) AS duration_min
      FROM trips t
      JOIN trip_stops ts_board
        ON ts_board.trip_id = t.id
        AND ts_board.city_id = ?
        AND ts_board.boarding_enabled = true
      JOIN trip_stops ts_alight
        ON ts_alight.trip_id = t.id
        AND ts_alight.city_id = ?
        AND ts_alight.alighting_enabled = true
      JOIN cities cb ON cb.id = ts_board.city_id
      JOIN cities ca ON ca.id = ts_alight.city_id
      WHERE ts_board.stop_order < ts_alight.stop_order
        AND t.status IN ('scheduled', 'boarding')
        AND t.departure_at >= ?
        AND t.departure_at <= ?
      ORDER BY ts_board.scheduled_departure_at ASC
      LIMIT ? OFFSET ?
      `,
      [fromCityId, toCityId, dayStart, dayEnd, limit, offset]
    )

    const rawRows = rows[0] as any[]

    const results: TripSearchResult[] = []

    for (const row of rawRows) {
      // Count available seats for this specific segment
      const availableSeats = await availabilityService.getAvailableSeats(
        row.trip_id,
        row.boarding_stop_order,
        row.alighting_stop_order
      )

      if (availableSeats.length < seatCount) {
        continue // Skip trips with insufficient available seats
      }

      // Get price for economy class
      let priceEconomy = 0
      let currency = 'CDF'
      try {
        const priceResult = await priceService.calculateSegmentPrice({
          tripId: row.trip_id,
          routeId: row.route_id,
          boardingStopOrder: row.boarding_stop_order,
          alightingStopOrder: row.alighting_stop_order,
          seatClass: 'economy',
          date: DateTime.fromSQL(row.departure_at, { zone: 'utc' }),
          orgId: row.organization_id ?? undefined,
          vehicleId: row.vehicle_id,
        })
        priceEconomy = priceResult.finalPrice
        currency = priceResult.currency
      } catch {
        // Leave as 0
      }

      results.push({
        tripId: row.trip_id,
        vehicleId: row.vehicle_id,
        routeId: row.route_id,
        organizationId: row.organization_id,
        status: row.status,
        departureAt: row.departure_at,
        boardingStopId: row.boarding_stop_id,
        boardingStopOrder: row.boarding_stop_order,
        boardingStopName: row.boarding_city_name,
        alightingStopId: row.alighting_stop_id,
        alightingStopOrder: row.alighting_stop_order,
        alightingStopName: row.alighting_city_name,
        boardingTime: row.boarding_time,
        alightingTime: row.alighting_time,
        durationMin: row.duration_min,
        availableSeats: availableSeats.length,
        priceEconomy,
        currency,
      })
    }

    const lastPage = Math.ceil(total / limit)

    return {
      data: results,
      meta: {
        page,
        perPage: limit,
        total,
        lastPage,
      },
    }
  }

  /**
   * Get the passenger manifest for a specific stop.
   * Returns which passengers board, alight, and continue through at this stop.
   */
  async getStopPassengerManifest(tripId: number, stopId: number): Promise<StopManifest> {
    const stop = await TripStop.findOrFail(stopId)

    if (stop.tripId !== tripId) {
      throw new Error('Stop does not belong to this trip')
    }

    const activeBookings = await Booking.query()
      .where('trip_id', tripId)
      .whereNotIn('status', ['cancelled', 'refunded'])
      .preload('bookingSeats', (q) => q.preload('tripSeat'))

    const boarding = activeBookings.filter((b) => b.boardingStopOrder === stop.stopOrder)
    const alighting = activeBookings.filter((b) => b.alightingStopOrder === stop.stopOrder)
    const onboard = activeBookings.filter(
      (b) =>
        b.boardingStopOrder < stop.stopOrder &&
        b.alightingStopOrder > stop.stopOrder
    )

    return { stop, boarding, alighting, onboard }
  }

  /**
   * Update trip status.
   */
  async updateStatus(tripId: number, status: Trip['status']): Promise<Trip> {
    const trip = await Trip.findOrFail(tripId)
    const oldStatus = trip.status

    trip.status = status

    if (status === 'in_progress' && !trip.actualDepartureAt) {
      trip.actualDepartureAt = DateTime.utc()
    }

    if (status === 'completed' && !trip.actualArrivalAt) {
      trip.actualArrivalAt = DateTime.utc()
    }

    await trip.save()

    return trip
  }

  /**
   * Mark actual arrival at a specific stop.
   */
  async arriveAtStop(tripId: number, stopId: number): Promise<TripStop> {
    const stop = await TripStop.findOrFail(stopId)

    if (stop.tripId !== tripId) {
      throw new Error('Stop does not belong to this trip')
    }

    stop.actualArrivalAt = DateTime.utc()
    await stop.save()

    return stop
  }

  /**
   * Mark actual departure from a specific stop.
   */
  async departFromStop(tripId: number, stopId: number): Promise<TripStop> {
    const stop = await TripStop.findOrFail(stopId)

    if (stop.tripId !== tripId) {
      throw new Error('Stop does not belong to this trip')
    }

    stop.actualDepartureAt = DateTime.utc()
    await stop.save()

    return stop
  }
}

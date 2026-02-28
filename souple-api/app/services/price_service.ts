import { DateTime } from 'luxon'
import PriceRule from '#models/price_rule'
import TripStop from '#models/trip_stop'
import SeatClass from '#models/seat_class'

export interface PriceParams {
  tripId: number
  routeId: number
  boardingStopOrder: number
  alightingStopOrder: number
  seatClass: string
  date: DateTime
  orgId?: number
  vehicleId?: number
}

export interface PriceResult {
  basePrice: number
  finalPrice: number
  currency: string
  segmentCount: number
  breakdown: string
}

export interface PriceMatrix {
  stops: string[]
  matrix: (number | null)[][]
}

export class PriceService {
  /**
   * Calculate price for a specific boarding → alighting segment.
   *
   * Priority lookup order:
   * 1. Exact stop pair + org + vehicle + seat class
   * 2. Exact stop pair + org + seat class
   * 3. Exact stop pair + org
   * 4. Full route rule (from_stop_order IS NULL), prorated by segment count
   * 5. Per-segment mode: per_segment_price × num_segments
   * 6. Per-km mode: per_km_price × segment_distance_km
   */
  async calculateSegmentPrice(params: PriceParams): Promise<PriceResult> {
    const {
      tripId,
      routeId,
      boardingStopOrder,
      alightingStopOrder,
      seatClass,
      date,
      orgId,
      vehicleId,
    } = params

    const segmentCount = alightingStopOrder - boardingStopOrder

    // Load trip stops to get distance info
    const tripStops = await TripStop.query()
      .where('trip_id', tripId)
      .orderBy('stop_order', 'asc')

    const totalStops = tripStops.length
    const totalSegments = totalStops > 1 ? totalStops - 1 : 1

    const boardingStop = tripStops.find((s) => s.stopOrder === boardingStopOrder)
    const alightingStop = tripStops.find((s) => s.stopOrder === alightingStopOrder)
    const segmentDistanceKm =
      boardingStop && alightingStop
        ? alightingStop.distanceFromStartKm - boardingStop.distanceFromStartKm
        : 0

    // Look up seat class multiplier
    const seatClassRecord = await SeatClass.query().where('slug', seatClass).first()
    const classMultiplier = seatClassRecord?.defaultMultiplier ?? 1.0

    // Build a base query for active price rules matching this route and date range
    const baseQuery = () =>
      PriceRule.query()
        .where('route_id', routeId)
        .where('is_active', true)
        .where('effective_from', '<=', date.toISODate()!)
        .where((q) => {
          q.whereNull('effective_until').orWhere('effective_until', '>=', date.toISODate()!)
        })

    // ── 1. Exact stop pair + org + vehicle + seat class ──────────────────────
    if (orgId && vehicleId && seatClassRecord) {
      const rule = await baseQuery()
        .where('from_stop_order', boardingStopOrder)
        .where('to_stop_order', alightingStopOrder)
        .where('organization_id', orgId)
        .where('vehicle_id', vehicleId)
        .where('seat_class_id', seatClassRecord.id)
        .orderBy('effective_from', 'desc')
        .first()

      if (rule) {
        return this.applyMultipliers(rule, segmentCount, segmentDistanceKm, classMultiplier, 'exact+org+vehicle+class')
      }
    }

    // ── 2. Exact stop pair + org + seat class ────────────────────────────────
    if (orgId && seatClassRecord) {
      const rule = await baseQuery()
        .where('from_stop_order', boardingStopOrder)
        .where('to_stop_order', alightingStopOrder)
        .where('organization_id', orgId)
        .whereNull('vehicle_id')
        .where('seat_class_id', seatClassRecord.id)
        .orderBy('effective_from', 'desc')
        .first()

      if (rule) {
        return this.applyMultipliers(rule, segmentCount, segmentDistanceKm, classMultiplier, 'exact+org+class')
      }
    }

    // ── 3. Exact stop pair + org ─────────────────────────────────────────────
    if (orgId) {
      const rule = await baseQuery()
        .where('from_stop_order', boardingStopOrder)
        .where('to_stop_order', alightingStopOrder)
        .where('organization_id', orgId)
        .whereNull('vehicle_id')
        .whereNull('seat_class_id')
        .orderBy('effective_from', 'desc')
        .first()

      if (rule) {
        return this.applyMultipliers(rule, segmentCount, segmentDistanceKm, classMultiplier, 'exact+org')
      }
    }

    // ── 4. Full route rule (from_stop_order IS NULL), prorated ───────────────
    const fullRouteRule = await baseQuery()
      .whereNull('from_stop_order')
      .whereNull('to_stop_order')
      .orderBy('effective_from', 'desc')
      .first()

    if (fullRouteRule) {
      if (fullRouteRule.priceMode === 'per_segment') {
        const perSeg = fullRouteRule.perSegmentPrice ?? fullRouteRule.basePrice / totalSegments
        const base = perSeg * segmentCount
        const final = Math.round(base * classMultiplier)
        const peakAdjusted = fullRouteRule.isPeak ? Math.round(final * fullRouteRule.peakMultiplier) : final
        return {
          basePrice: base,
          finalPrice: peakAdjusted,
          currency: fullRouteRule.currency,
          segmentCount,
          breakdown: `full-route/per_segment: ${perSeg} × ${segmentCount} segments × class:${classMultiplier}`,
        }
      }

      if (fullRouteRule.priceMode === 'per_km') {
        const perKm = fullRouteRule.perKmPrice ?? 0
        const base = perKm * segmentDistanceKm
        const final = Math.round(base * classMultiplier)
        const peakAdjusted = fullRouteRule.isPeak ? Math.round(final * fullRouteRule.peakMultiplier) : final
        return {
          basePrice: base,
          finalPrice: peakAdjusted,
          currency: fullRouteRule.currency,
          segmentCount,
          breakdown: `full-route/per_km: ${perKm} × ${segmentDistanceKm}km × class:${classMultiplier}`,
        }
      }

      // Fixed full-route price — prorate by segment count
      const prorate = totalSegments > 0 ? segmentCount / totalSegments : 1
      const base = fullRouteRule.basePrice * prorate
      const final = Math.round(base * classMultiplier)
      const peakAdjusted = fullRouteRule.isPeak ? Math.round(final * fullRouteRule.peakMultiplier) : final
      return {
        basePrice: base,
        finalPrice: peakAdjusted,
        currency: fullRouteRule.currency,
        segmentCount,
        breakdown: `full-route/fixed prorated: ${fullRouteRule.basePrice} × ${prorate.toFixed(3)} × class:${classMultiplier}`,
      }
    }

    // ── 5. Any rule with per_segment mode for this route ─────────────────────
    const perSegmentRule = await baseQuery()
      .where('price_mode', 'per_segment')
      .orderBy('effective_from', 'desc')
      .first()

    if (perSegmentRule && perSegmentRule.perSegmentPrice !== null) {
      const base = perSegmentRule.perSegmentPrice * segmentCount
      const final = Math.round(base * classMultiplier)
      const peakAdjusted = perSegmentRule.isPeak ? Math.round(final * perSegmentRule.peakMultiplier) : final
      return {
        basePrice: base,
        finalPrice: peakAdjusted,
        currency: perSegmentRule.currency,
        segmentCount,
        breakdown: `per_segment: ${perSegmentRule.perSegmentPrice} × ${segmentCount} segments`,
      }
    }

    // ── 6. Any rule with per_km mode for this route ──────────────────────────
    const perKmRule = await baseQuery()
      .where('price_mode', 'per_km')
      .orderBy('effective_from', 'desc')
      .first()

    if (perKmRule && perKmRule.perKmPrice !== null) {
      const base = perKmRule.perKmPrice * segmentDistanceKm
      const final = Math.round(base * classMultiplier)
      const peakAdjusted = perKmRule.isPeak ? Math.round(final * perKmRule.peakMultiplier) : final
      return {
        basePrice: base,
        finalPrice: peakAdjusted,
        currency: perKmRule.currency,
        segmentCount,
        breakdown: `per_km: ${perKmRule.perKmPrice} × ${segmentDistanceKm}km`,
      }
    }

    // ── Fallback: zero price (no rule configured) ────────────────────────────
    return {
      basePrice: 0,
      finalPrice: 0,
      currency: 'CDF',
      segmentCount,
      breakdown: 'no price rule found',
    }
  }

  /**
   * Apply class multiplier and peak multiplier to a price rule and return a PriceResult.
   */
  private applyMultipliers(
    rule: PriceRule,
    segmentCount: number,
    segmentDistanceKm: number,
    classMultiplier: number,
    breakdownLabel: string
  ): PriceResult {
    let basePrice: number

    if (rule.priceMode === 'per_segment' && rule.perSegmentPrice !== null) {
      basePrice = rule.perSegmentPrice * segmentCount
    } else if (rule.priceMode === 'per_km' && rule.perKmPrice !== null) {
      basePrice = rule.perKmPrice * segmentDistanceKm
    } else {
      basePrice = rule.basePrice
    }

    const withClass = Math.round(basePrice * classMultiplier)
    const finalPrice = rule.isPeak ? Math.round(withClass * rule.peakMultiplier) : withClass

    return {
      basePrice,
      finalPrice,
      currency: rule.currency,
      segmentCount,
      breakdown: `${breakdownLabel}: base=${basePrice} × class=${classMultiplier}${rule.isPeak ? ` × peak=${rule.peakMultiplier}` : ''}`,
    }
  }

  /**
   * Generate price matrix for all possible stop pairs on a trip.
   * matrix[i][j] = price for boarding at stop i, alighting at stop j (i < j).
   */
  async getPriceMatrix(tripId: number, seatClass: string): Promise<PriceMatrix> {
    const tripStops = await TripStop.query()
      .where('trip_id', tripId)
      .preload('city')
      .orderBy('stop_order', 'asc')

    if (tripStops.length === 0) {
      return { stops: [], matrix: [] }
    }

    // We need the routeId — load from trip
    const { default: Trip } = await import('#models/trip')
    const trip = await Trip.findOrFail(tripId)

    const stopNames = tripStops.map((s) => s.city?.name ?? `Stop ${s.stopOrder}`)
    const n = tripStops.length

    // Initialize NxN matrix with null
    const matrix: (number | null)[][] = Array.from({ length: n }, () =>
      Array(n).fill(null)
    )

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const priceResult = await this.calculateSegmentPrice({
          tripId,
          routeId: trip.routeId,
          boardingStopOrder: tripStops[i].stopOrder,
          alightingStopOrder: tripStops[j].stopOrder,
          seatClass,
          date: DateTime.utc(),
          orgId: trip.organizationId ?? undefined,
          vehicleId: trip.vehicleId,
        })
        matrix[i][j] = priceResult.finalPrice
      }
    }

    return { stops: stopNames, matrix }
  }
}

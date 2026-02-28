import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import EmergencyContact from '#models/emergency_contact'
import Incident from '#models/incident'
import TripShare from '#models/trip_share'
import Booking from '#models/booking'
import type User from '#models/user'

export default class SafetyController {
  /**
   * GET /api/v1/safety/emergency-contacts
   */
  async emergencyContacts({ auth, response }: HttpContext) {
    const user = auth.user! as User
    const contacts = await EmergencyContact.query()
      .where('user_id', user.id)
      .orderBy('is_primary', 'desc')
      .orderBy('created_at', 'asc')

    return response.ok({ success: true, data: contacts })
  }

  /**
   * POST /api/v1/safety/emergency-contacts
   */
  async storeEmergencyContact({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const contact = await EmergencyContact.create({
      userId: user.id,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship ?? null,
      isPrimary: body.isPrimary ?? false,
    })

    return response.created({ success: true, data: contact })
  }

  /**
   * DELETE /api/v1/safety/emergency-contacts/:id
   */
  async removeEmergencyContact({ params, auth, response }: HttpContext) {
    const user = auth.user! as User
    const contact = await EmergencyContact.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    await contact.delete()
    return response.ok({ success: true, message: 'Contact removed' })
  }

  /**
   * POST /api/v1/safety/incidents
   */
  async reportIncident({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const incident = await Incident.create({
      reporterUserId: user.id,
      tripId: body.tripId ?? null,
      type: body.type,
      description: body.description,
      locationLat: body.locationLat ?? null,
      locationLng: body.locationLng ?? null,
      photos: body.photos ?? null,
      status: 'reported',
    })

    return response.created({ success: true, data: incident })
  }

  /**
   * POST /api/v1/safety/trip-shares
   */
  async createTripShare({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const booking = await Booking.query()
      .where('id', body.bookingId)
      .where('user_id', user.id)
      .firstOrFail()

    const shareToken = randomBytes(32).toString('hex')

    const tripShare = await TripShare.create({
      bookingId: booking.id,
      shareToken,
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    return response.created({ success: true, data: tripShare })
  }

  /**
   * GET /api/v1/safety/shared/:token — public
   */
  async getSharedTrip({ params, response }: HttpContext) {
    const share = await TripShare.query()
      .where('share_token', params.token)
      .preload('booking')
      .firstOrFail()

    if (share.expiresAt < DateTime.now()) {
      return response.gone({ success: false, message: 'Share link has expired' })
    }

    return response.ok({ success: true, data: share })
  }
}

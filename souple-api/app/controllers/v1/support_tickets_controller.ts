import type { HttpContext } from '@adonisjs/core/http'
import SupportTicket from '#models/support_ticket'
import TicketMessage from '#models/ticket_message'
import { generateReference } from '#utils/generate_reference'
import type User from '#models/user'

export default class SupportTicketsController {
  /**
   * GET /api/v1/support-tickets
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const paginated = await SupportTicket.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

    const json = paginated.toJSON()
    return response.ok({
      success: true,
      data: json.data,
      meta: {
        page: json.meta.currentPage,
        perPage: json.meta.perPage,
        total: json.meta.total,
        lastPage: json.meta.lastPage,
      },
    })
  }

  /**
   * POST /api/v1/support-tickets
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const ticket = await SupportTicket.create({
      reference: generateReference('TKT'),
      userId: user.id,
      organizationId: body.organizationId ?? null,
      bookingId: body.bookingId ?? null,
      category: body.category ?? 'other',
      priority: body.priority ?? 'normal',
      status: 'open',
      title: body.title,
    })

    if (body.message) {
      await TicketMessage.create({
        ticketId: ticket.id,
        senderUserId: user.id,
        isInternalNote: false,
        content: body.message,
        attachments: null,
      })
    }

    return response.created({ success: true, data: ticket })
  }

  /**
   * GET /api/v1/support-tickets/:id
   */
  async show({ params, auth, response }: HttpContext) {
    const user = auth.user! as User
    const ticket = await SupportTicket.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .preload('messages')
      .firstOrFail()

    return response.ok({ success: true, data: ticket })
  }

  /**
   * POST /api/v1/support-tickets/:id/messages
   */
  async addMessage({ params, auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const ticket = await SupportTicket.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    const message = await TicketMessage.create({
      ticketId: ticket.id,
      senderUserId: user.id,
      isInternalNote: body.isInternalNote ?? false,
      content: body.content,
      attachments: body.attachments ?? null,
    })

    return response.created({ success: true, data: message })
  }

  /**
   * PUT /api/v1/support-tickets/:id/status
   */
  async updateStatus({ params, request, response }: HttpContext) {
    const body = request.body() as Record<string, any>
    const ticket = await SupportTicket.findOrFail(params.id)

    ticket.status = body.status
    if (body.status === 'resolved') {
      ticket.resolvedAt = (await import('luxon')).DateTime.now()
    }
    await ticket.save()

    return response.ok({ success: true, data: ticket })
  }

  /**
   * PUT /api/v1/support-tickets/:id/rate
   */
  async rate({ params, auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const ticket = await SupportTicket.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    ticket.satisfactionRating = body.rating
    await ticket.save()

    return response.ok({ success: true, data: ticket })
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import Subscription from '#models/subscription'
import Invoice from '#models/invoice'

export default class SubscriptionsController {
  /**
   * GET /api/v1/subscriptions/current
   */
  async show({ request, response }: HttpContext) {
    const orgId = request.input('organization_id')

    const subscription = await Subscription.query()
      .where('organization_id', orgId)
      .firstOrFail()

    return response.ok({ success: true, data: subscription })
  }

  /**
   * POST /api/v1/subscriptions/upgrade
   */
  async upgrade({ request, response }: HttpContext) {
    const body = request.body() as Record<string, any>

    let subscription = await Subscription.query()
      .where('organization_id', body.organization_id)
      .first()

    if (!subscription) {
      subscription = await Subscription.create({
        organizationId: body.organization_id,
        tier: body.tier,
        status: 'active',
        billingCycle: body.billing_cycle ?? 'monthly',
      })
    } else {
      subscription.merge({ tier: body.tier, billingCycle: body.billing_cycle ?? subscription.billingCycle })
      await subscription.save()
    }

    return response.ok({ success: true, data: subscription })
  }

  /**
   * GET /api/v1/invoices
   */
  async listInvoices({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))
    const orgId = request.input('organization_id')

    const query = Invoice.query()
      .where('organization_id', orgId)
      .orderBy('created_at', 'desc')

    const paginated = await query.paginate(page, perPage)
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
}

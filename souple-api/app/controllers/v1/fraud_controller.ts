import type { HttpContext } from '@adonisjs/core/http'
import RiskScore from '#models/risk_score'
import BlockedEntity from '#models/blocked_entity'
import type User from '#models/user'

export default class FraudController {
  /**
   * GET /api/v1/fraud/risk/:userId
   */
  async getUserRisk({ params, response }: HttpContext) {
    const riskScore = await RiskScore.query()
      .where('user_id', params.userId)
      .preload('user')
      .first()

    if (!riskScore) {
      return response.ok({
        success: true,
        data: { userId: Number(params.userId), score: 0, level: 'low', reasons: [] },
      })
    }

    return response.ok({ success: true, data: riskScore })
  }

  /**
   * GET /api/v1/fraud/blocked-entities
   */
  async listBlocked({ request, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const paginated = await BlockedEntity.query()
      .where('is_active', true)
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
   * POST /api/v1/fraud/blocked-entities
   */
  async blockEntity({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const entity = await BlockedEntity.create({
      entityType: body.entityType,
      entityValue: body.entityValue,
      reason: body.reason,
      blockedByUserId: user.id,
      expiresAt: body.expiresAt ? (await import('luxon')).DateTime.fromISO(body.expiresAt) : null,
      isActive: true,
    })

    return response.created({ success: true, data: entity })
  }

  /**
   * DELETE /api/v1/fraud/blocked-entities/:id
   */
  async unblock({ params, response }: HttpContext) {
    const entity = await BlockedEntity.findOrFail(params.id)
    entity.isActive = false
    await entity.save()

    return response.ok({ success: true, message: 'Entity unblocked' })
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import Agent from '#models/agent'
import AgentAgreement from '#models/agent_agreement'
import AgentCommission from '#models/agent_commission'
import type User from '#models/user'

export default class AgentsController {
  /**
   * POST /api/v1/agents/register
   */
  async register({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const existing = await Agent.query().where('user_id', user.id).first()
    if (existing) {
      return response.conflict({ success: false, message: 'Already registered as agent' })
    }

    const agent = await Agent.create({
      userId: user.id,
      kycStatus: 'pending',
      businessName: body.businessName ?? null,
      payoutMethod: body.payoutMethod ?? null,
      payoutNumber: body.payoutNumber ?? null,
      balanceCdf: 0,
      totalEarnedCdf: 0,
      totalPaidOutCdf: 0,
      isActive: true,
    })

    return response.created({ success: true, data: agent })
  }

  /**
   * GET /api/v1/agents/me
   */
  async show({ auth, response }: HttpContext) {
    const user = auth.user! as User
    const agent = await Agent.query().where('user_id', user.id).preload('user').firstOrFail()
    return response.ok({ success: true, data: agent })
  }

  /**
   * GET /api/v1/agents/me/earnings
   */
  async earnings({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    const agent = await Agent.query().where('user_id', user.id).firstOrFail()

    const paginated = await AgentCommission.query()
      .where('agent_id', agent.id)
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
   * GET /api/v1/agents/me/agreements
   */
  async agreements({ auth, response }: HttpContext) {
    const user = auth.user! as User
    const agent = await Agent.query().where('user_id', user.id).firstOrFail()

    const agreements = await AgentAgreement.query()
      .where('agent_id', agent.id)
      .preload('organization')
      .orderBy('created_at', 'desc')

    return response.ok({ success: true, data: agreements })
  }
}

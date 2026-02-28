import type { HttpContext } from '@adonisjs/core/http'
import CorporateAccount from '#models/corporate_account'
import CorporateMember from '#models/corporate_member'
import type User from '#models/user'

export default class CorporateController {
  /**
   * POST /api/v1/corporate/register
   */
  async register({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const account = await CorporateAccount.create({
      organizationId: body.organizationId ?? null,
      name: body.name,
      registrationNumber: body.registrationNumber ?? null,
      billingEmail: body.billingEmail,
      creditLimitCdf: 0,
      currentBalanceCdf: 0,
      status: 'pending',
      monthlyBudgetCdf: body.monthlyBudgetCdf ?? null,
      approvedAt: null,
    })

    await CorporateMember.create({
      corporateAccountId: account.id,
      userId: user.id,
      role: 'admin',
      monthlyLimitCdf: null,
      isActive: true,
    })

    return response.created({ success: true, data: account })
  }

  /**
   * GET /api/v1/corporate/me
   */
  async show({ auth, response }: HttpContext) {
    const user = auth.user! as User

    const membership = await CorporateMember.query()
      .where('user_id', user.id)
      .where('is_active', true)
      .firstOrFail()

    const account = await CorporateAccount.query()
      .where('id', membership.corporateAccountId)
      .preload('organization')
      .firstOrFail()

    return response.ok({ success: true, data: account })
  }

  /**
   * GET /api/v1/corporate/me/members
   */
  async listMembers({ auth, response }: HttpContext) {
    const user = auth.user! as User

    const membership = await CorporateMember.query()
      .where('user_id', user.id)
      .where('is_active', true)
      .firstOrFail()

    const members = await CorporateMember.query()
      .where('corporate_account_id', membership.corporateAccountId)
      .preload('user')
      .orderBy('created_at', 'asc')

    return response.ok({ success: true, data: members })
  }

  /**
   * POST /api/v1/corporate/me/members
   */
  async addMember({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const myMembership = await CorporateMember.query()
      .where('user_id', user.id)
      .where('is_active', true)
      .firstOrFail()

    const member = await CorporateMember.create({
      corporateAccountId: myMembership.corporateAccountId,
      userId: body.userId,
      role: body.role ?? 'traveler',
      monthlyLimitCdf: body.monthlyLimitCdf ?? null,
      isActive: true,
    })

    return response.created({ success: true, data: member })
  }

  /**
   * DELETE /api/v1/corporate/me/members/:userId
   */
  async removeMember({ params, auth, response }: HttpContext) {
    const user = auth.user! as User

    const myMembership = await CorporateMember.query()
      .where('user_id', user.id)
      .where('is_active', true)
      .firstOrFail()

    const member = await CorporateMember.query()
      .where('corporate_account_id', myMembership.corporateAccountId)
      .where('user_id', params.userId)
      .firstOrFail()

    member.isActive = false
    await member.save()

    return response.ok({ success: true, message: 'Member removed' })
  }
}

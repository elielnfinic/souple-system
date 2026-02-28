import type { HttpContext } from '@adonisjs/core/http'
import ApiKey from '#models/api_key'
import type User from '#models/user'
import { createHash, randomBytes } from 'node:crypto'

export default class ApiKeysController {
  /**
   * GET /api/v1/api-keys
   */
  async index({ request, response }: HttpContext) {
    const orgId = request.input('organization_id')

    const keys = await ApiKey.query()
      .where('organization_id', orgId)
      .orderBy('created_at', 'desc')

    return response.ok({ success: true, data: keys })
  }

  /**
   * POST /api/v1/api-keys
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const plainKey = `sk_${randomBytes(32).toString('hex')}`
    const keyHash = createHash('sha256').update(plainKey).digest('hex')
    const keyPrefix = plainKey.substring(0, 8)

    const apiKey = await ApiKey.create({
      organizationId: body.organization_id,
      name: body.name,
      keyHash,
      keyPrefix,
      scopes: body.scopes ?? [],
      rateLimitPerMinute: body.rate_limit_per_minute ?? 60,
      expiresAt: body.expires_at ?? null,
      isActive: true,
      createdByUserId: user.id,
    })

    return response.created({
      success: true,
      data: {
        ...apiKey.serialize(),
        key: plainKey, // Return plain key only once
      },
    })
  }

  /**
   * DELETE /api/v1/api-keys/:id
   */
  async destroy({ params, response }: HttpContext) {
    const apiKey = await ApiKey.findOrFail(params.id)
    apiKey.isActive = false
    await apiKey.save()

    return response.ok({ success: true, data: { message: 'API key revoked' } })
  }
}

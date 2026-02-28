import type { HttpContext } from '@adonisjs/core/http'
import CannedResponse from '#models/canned_response'
import { cannedResponseValidator } from '#validators/messaging_validator'

export default class CannedResponsesController {
  async index({ request }: HttpContext) {
    const orgId = request.header('X-Organization-Id')
    const responses = await CannedResponse.query()
      .where('is_active', true)
      .where(q => q.whereNull('organization_id').orWhere('organization_id', orgId ? Number(orgId) : 0))
      .orderBy('sort_order', 'asc')
    return { success: true, data: responses }
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(cannedResponseValidator)
    const orgId = request.header('X-Organization-Id')
    const cr = await CannedResponse.create({
      organizationId: orgId ? Number(orgId) : null,
      category: data.category,
      text: data.text as Record<string, string>,
      sortOrder: data.sort_order ?? 0,
      isActive: data.is_active ?? true,
    })
    return { success: true, data: cr }
  }

  async update({ params, request }: HttpContext) {
    const cr = await CannedResponse.findOrFail(params.id)
    const data = await request.validateUsing(cannedResponseValidator)
    cr.merge({ category: data.category, text: data.text as Record<string, string>, sortOrder: data.sort_order ?? cr.sortOrder })
    await cr.save()
    return { success: true, data: cr }
  }

  async destroy({ params, response }: HttpContext) {
    const cr = await CannedResponse.findOrFail(params.id)
    await cr.delete()
    return response.noContent()
  }
}

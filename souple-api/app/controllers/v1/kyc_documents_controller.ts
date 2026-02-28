import type { HttpContext } from '@adonisjs/core/http'
import KycDocument from '#models/kyc_document'
import type User from '#models/user'
import { DateTime } from 'luxon'

export default class KycDocumentsController {
  /**
   * GET /api/v1/kyc-documents
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))

    // Admins can filter by user_id; regular users only see their own
    const userId = request.input('user_id', user.id)

    const query = KycDocument.query()
      .where('user_id', userId)
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

  /**
   * POST /api/v1/kyc-documents
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user! as User
    const body = request.body() as Record<string, any>

    const doc = await KycDocument.create({
      ...body,
      userId: user.id,
      status: 'pending',
    })

    return response.created({ success: true, data: doc })
  }

  /**
   * GET /api/v1/kyc-documents/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user! as User
    const doc = await KycDocument.findOrFail(params.id)

    if (doc.userId !== user.id) {
      return response.forbidden({ success: false, message: 'Access denied' })
    }

    return response.ok({ success: true, data: doc })
  }

  /**
   * PUT /api/v1/kyc-documents/:id/verify
   */
  async verify({ auth, params, request, response }: HttpContext) {
    const user = auth.user! as User
    const doc = await KycDocument.findOrFail(params.id)
    const { status, rejection_reason } = request.body() as { status: 'approved' | 'rejected'; rejection_reason?: string }

    doc.merge({
      status,
      verifiedByUserId: user.id,
      verifiedAt: DateTime.now(),
      rejectionReason: rejection_reason ?? null,
    })
    await doc.save()

    return response.ok({ success: true, data: doc })
  }

  /**
   * GET /api/v1/kyc/status
   */
  async userKycStatus({ auth, response }: HttpContext) {
    const user = auth.user! as User

    const docs = await KycDocument.query()
      .where('user_id', user.id)
      .where('status', 'approved')

    let level: 'none' | 'basic' | 'full' = 'none'

    if (docs.length >= 2) {
      level = 'full'
    } else if (docs.length === 1) {
      level = 'basic'
    }

    return response.ok({
      success: true,
      data: {
        level,
        approvedDocuments: docs.length,
        documents: docs,
      },
    })
  }
}

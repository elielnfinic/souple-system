import type { HttpContext } from '@adonisjs/core/http'
import FaqArticle from '#models/faq_article'

export default class FaqController {
  /**
   * GET /api/v1/faq
   */
  async index({ response }: HttpContext) {
    const articles = await FaqArticle.query()
      .where('is_published', true)
      .orderBy('category', 'asc')
      .orderBy('sort_order', 'asc')

    return response.ok({ success: true, data: articles })
  }

  /**
   * GET /api/v1/faq/:id
   */
  async show({ params, response }: HttpContext) {
    const article = await FaqArticle.query()
      .where('id', params.id)
      .where('is_published', true)
      .firstOrFail()

    return response.ok({ success: true, data: article })
  }
}

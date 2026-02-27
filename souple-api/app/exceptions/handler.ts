import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { HttpError } from '@adonisjs/core/types/http'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as lucidErrors } from '@adonisjs/lucid'
import { errors as vineErrors } from '@vinejs/vine'
import { ERROR_CODES } from '@souple/shared/constants'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors with the
   * complete error stack trace.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are only rendered when the status code matches a pattern.
   * The 4xx.edge file will be rendered for 404, 422, and so on.
   */
  protected renderStatusPages = app.inProduction

  async handle(error: HttpError, ctx: HttpContext) {
    // ─── VineJS Validation errors ──────────────────────────────────────────
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return ctx.response.unprocessableEntity({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION,
          message: 'Validation failed',
          details: error.messages.map((m: { field: string; message: string; rule: string }) => ({
            field: m.field,
            message: m.message,
            rule: m.rule,
          })),
        },
      })
    }

    // ─── Auth errors ───────────────────────────────────────────────────────
    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      return ctx.response.unauthorized({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required. Please provide a valid access token.',
        },
      })
    }

    if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
      return ctx.response.unauthorized({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid credentials',
        },
      })
    }

    // ─── Lucid not found ──────────────────────────────────────────────────
    if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
      return ctx.response.notFound({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Resource not found',
        },
      })
    }

    // ─── Rate limit ───────────────────────────────────────────────────────
    if ((error as any).status === 429) {
      return ctx.response.tooManyRequests({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT,
          message: 'Too many requests. Please slow down.',
        },
      })
    }

    // ─── 404 ──────────────────────────────────────────────────────────────
    if ((error as any).status === 404) {
      return ctx.response.notFound({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Route not found',
        },
      })
    }

    // ─── Generic server error ─────────────────────────────────────────────
    const status = (error as any).status ?? 500

    // Don't expose internals in production
    const message =
      app.inProduction && status >= 500
        ? 'An unexpected error occurred. Please try again.'
        : error.message

    return ctx.response.status(status).json({
      success: false,
      error: {
        code: status >= 500 ? ERROR_CODES.SERVER_ERROR : 'E_HTTP_ERROR',
        message,
        ...(this.debug && status >= 500 ? { stack: error.stack } : {}),
      },
    })
  }

  async report(error: HttpError, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}

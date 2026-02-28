/**
 * EmailService — Skill 01 extension
 *
 * Renders Pug email templates with locale-specific i18n strings
 * and sends them via the configured SMTP mailer.
 *
 * Template data contract:
 *   { subject, locale, i18n, frontendUrl, ...templateSpecific }
 */

import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import pug from 'pug'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '../../resources/emails')
const FROM_ADDRESS = env.get('SMTP_USERNAME', 'no-reply@souple.app')
const FROM_NAME = env.get('MAIL_FROM_NAME', 'Souple')
const FRONTEND_URL = env.get('FRONTEND_URL', 'https://souple.app')

// ─── i18n strings ────────────────────────────────────────────────────────────

const translations = {
  fr: {
    automated_email: 'Cet e-mail a été envoyé automatiquement. Merci de ne pas y répondre.',
    otp_login: {
      subject: 'Votre code de connexion Souple',
      title: 'Votre code de connexion',
      greeting: 'Bonjour,',
      body: 'Utilisez le code suivant pour vous connecter à votre compte Souple. Il est valable 5 minutes.',
      expiry: 'Expire dans 5 minutes',
      ignore: 'Si vous n\'avez pas demandé ce code, vous pouvez ignorer cet e-mail en toute sécurité.',
    },
    otp_register: {
      subject: 'Vérifiez votre adresse e-mail',
      title: 'Confirmez votre inscription',
      greeting: 'Bienvenue sur Souple !',
      body: 'Entrez le code suivant pour vérifier votre adresse e-mail et activer votre compte.',
      expiry: 'Expire dans 5 minutes',
      ignore: 'Si vous n\'avez pas créé de compte, vous pouvez ignorer cet e-mail.',
    },
    otp_password_reset: {
      subject: 'Réinitialisation de votre mot de passe',
      title: 'Code de réinitialisation',
      greeting: 'Bonjour,',
      body: 'Vous avez demandé à réinitialiser votre mot de passe. Utilisez ce code dans les 5 prochaines minutes.',
      expiry: 'Expire dans 5 minutes',
      ignore: 'Si vous n\'avez pas demandé de réinitialisation, ignorez cet e-mail. Votre mot de passe reste inchangé.',
    },
    welcome: {
      subject: 'Bienvenue sur Souple 🎉',
      title: 'Bienvenue sur Souple !',
      greeting: 'Votre compte a été créé avec succès.',
      body: 'Souple est votre plateforme de transport intercité. Réservez des voyages, gérez votre flotte et plus encore — depuis n\'importe où.',
      cta: 'Accéder à mon compte',
      help: 'Des questions ? Contactez-nous à support@souple.app',
    },
  },
  en: {
    automated_email: 'This email was sent automatically. Please do not reply.',
    otp_login: {
      subject: 'Your Souple sign-in code',
      title: 'Your sign-in code',
      greeting: 'Hello,',
      body: 'Use the code below to sign in to your Souple account. It expires in 5 minutes.',
      expiry: 'Expires in 5 minutes',
      ignore: 'If you didn\'t request this code, you can safely ignore this email.',
    },
    otp_register: {
      subject: 'Verify your email address',
      title: 'Confirm your registration',
      greeting: 'Welcome to Souple!',
      body: 'Enter the code below to verify your email address and activate your account.',
      expiry: 'Expires in 5 minutes',
      ignore: 'If you didn\'t create an account, you can ignore this email.',
    },
    otp_password_reset: {
      subject: 'Reset your password',
      title: 'Password reset code',
      greeting: 'Hello,',
      body: 'You requested to reset your password. Use this code within the next 5 minutes.',
      expiry: 'Expires in 5 minutes',
      ignore: 'If you didn\'t request a password reset, ignore this email. Your password remains unchanged.',
    },
    welcome: {
      subject: 'Welcome to Souple 🎉',
      title: 'Welcome to Souple!',
      greeting: 'Your account has been created successfully.',
      body: 'Souple is your intercity transportation platform. Book trips, manage your fleet, and more — from anywhere.',
      cta: 'Go to my account',
      help: 'Questions? Contact us at support@souple.app',
    },
  },
}

type SupportedLocale = keyof typeof translations

function getT(locale: string) {
  return translations[(locale as SupportedLocale)] ?? translations['fr']
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

function render(template: string, data: Record<string, unknown>): string {
  return pug.renderFile(join(TEMPLATES_DIR, `${template}.pug`), {
    ...data,
    frontendUrl: FRONTEND_URL,
    cache: process.env.NODE_ENV === 'production',
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class EmailService {
  /**
   * Send an OTP code for login / register / password_reset.
   */
  static async sendOtp(
    to: string,
    code: string,
    purpose: 'login' | 'register' | 'password_reset',
    locale: string = 'fr'
  ): Promise<void> {
    const t = getT(locale)
    const strings = t[`otp_${purpose}` as keyof typeof t] as typeof t.otp_login

    const template = purpose === 'password_reset' ? 'password_reset' : 'otp'
    const html = render(template, {
      subject: strings.subject,
      locale,
      code,
      i18n: { ...strings, automated_email: t.automated_email },
    })

    await mail.send((message) => {
      message
        .from(`${FROM_NAME} <${FROM_ADDRESS}>`)
        .to(to)
        .subject(strings.subject)
        .html(html)
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EmailService] OTP sent to ${to}: ${code}`)
    }
  }

  /**
   * Send a welcome email after successful registration.
   */
  static async sendWelcome(
    to: string,
    firstName: string,
    locale: string = 'fr'
  ): Promise<void> {
    const t = getT(locale)
    const strings = t.welcome

    const html = render('welcome', {
      subject: strings.subject,
      locale,
      ctaUrl: FRONTEND_URL,
      i18n: {
        ...strings,
        greeting: `${strings.greeting.replace('Votre compte', `${firstName}, votre compte`).replace('Your account', `${firstName}, your account`)}`,
        automated_email: t.automated_email,
      },
    })

    await mail.send((message) => {
      message
        .from(`${FROM_NAME} <${FROM_ADDRESS}>`)
        .to(to)
        .subject(strings.subject)
        .html(html)
    })
  }
}

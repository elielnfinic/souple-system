import { DateTime } from 'luxon'
import UssdSession from '#models/ussd_session'

export class UssdService {
  async handleRequest(sessionId: string, phone: string, text: string): Promise<string> {
    let session = await UssdSession.query()
      .where('session_id', sessionId)
      .where('is_active', true)
      .first()

    if (!session) {
      session = await UssdSession.create({
        sessionId,
        phone,
        step: 'start',
        data: {},
        language: 'fr',
        isActive: true,
        expiresAt: DateTime.now().plus({ minutes: 10 }),
      })
    }

    if (session.expiresAt < DateTime.now()) {
      session.isActive = false
      await session.save()
      return 'END Session expirée. Veuillez recommencer.'
    }

    const inputs = text ? text.split('*') : []
    const latestInput = inputs[inputs.length - 1] ?? ''

    const { step, data, response } = this.processStep(session.step, latestInput, session.data ?? {}, session.language)

    session.step = step
    session.data = data
    session.expiresAt = DateTime.now().plus({ minutes: 10 })

    if (step === 'done') {
      session.isActive = false
    }

    await session.save()
    return response
  }

  private processStep(
    currentStep: string,
    input: string,
    data: Record<string, any>,
    lang: string
  ): { step: string; data: Record<string, any>; response: string } {
    switch (currentStep) {
      case 'start':
        return {
          step: 'language',
          data,
          response: 'CON Bienvenue / Welcome\n1. Français\n2. English\n3. Lingala\n4. Swahili',
        }

      case 'language': {
        const langMap: Record<string, 'fr' | 'en' | 'ln' | 'sw'> = {
          '1': 'fr',
          '2': 'en',
          '3': 'ln',
          '4': 'sw',
        }
        const selectedLang = langMap[input] ?? 'fr'
        return {
          step: 'origin',
          data: { ...data, language: selectedLang },
          response: this.getMenuForStep('origin', data, selectedLang),
        }
      }

      case 'origin':
        return {
          step: 'destination',
          data: { ...data, origin: input },
          response: this.getMenuForStep('destination', data, lang),
        }

      case 'destination':
        return {
          step: 'date',
          data: { ...data, destination: input },
          response: this.getMenuForStep('date', data, lang),
        }

      case 'date':
        return {
          step: 'trip_select',
          data: { ...data, date: input },
          response: this.getMenuForStep('trip_select', data, lang),
        }

      case 'trip_select':
        return {
          step: 'seat_count',
          data: { ...data, tripIndex: input },
          response: this.getMenuForStep('seat_count', data, lang),
        }

      case 'seat_count':
        return {
          step: 'confirm',
          data: { ...data, seatCount: input },
          response: this.getMenuForStep('confirm', { ...data, seatCount: input }, lang),
        }

      case 'confirm':
        if (input === '1') {
          return {
            step: 'done',
            data: { ...data, confirmed: true },
            response: `END ${lang === 'en' ? 'Booking confirmed! Check SMS for details.' : 'Réservation confirmée! Vérifiez le SMS.'}`,
          }
        }
        return {
          step: 'done',
          data: { ...data, confirmed: false },
          response: `END ${lang === 'en' ? 'Cancelled.' : 'Annulé.'}`,
        }

      default:
        return {
          step: 'start',
          data: {},
          response: 'CON Bienvenue / Welcome\n1. Français\n2. English\n3. Lingala\n4. Swahili',
        }
    }
  }

  private getMenuForStep(step: string, data: Record<string, any>, lang: string): string {
    const t = (fr: string, en: string) => (lang === 'en' ? en : fr)

    switch (step) {
      case 'origin':
        return `CON ${t('Ville de départ:', 'Origin city:')}\n${t('Entrez le nom', 'Enter name')}`
      case 'destination':
        return `CON ${t('Ville destination:', 'Destination city:')}\n${t('Entrez le nom', 'Enter name')}`
      case 'date':
        return `CON ${t('Date (JJ/MM/AAAA):', 'Date (DD/MM/YYYY):')}`
      case 'trip_select':
        return `CON ${t('Sélectionnez un trajet:', 'Select a trip:')}\n1. ${t('Premier départ', 'First departure')}\n2. ${t('Deuxième départ', 'Second departure')}`
      case 'seat_count':
        return `CON ${t('Nombre de places (1-5):', 'Number of seats (1-5):')}`
      case 'confirm': {
        const seats = data.seatCount ?? 1
        return `CON ${t('Confirmer:', 'Confirm:')}\n${data.origin} → ${data.destination}\n${seats} ${t('place(s)', 'seat(s)')}\n1. ${t('Confirmer', 'Confirm')}\n2. ${t('Annuler', 'Cancel')}`
      }
      default:
        return 'CON Bienvenue / Welcome\n1. Français\n2. English'
    }
  }
}

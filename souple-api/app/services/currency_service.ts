import ExchangeRate from '#models/exchange_rate'

export class CurrencyService {
  async getCurrentRate(from: string, to: string): Promise<number> {
    const rate = await ExchangeRate.query()
      .where('from_currency', from)
      .where('to_currency', to)
      .where('is_active', true)
      .orderBy('valid_from', 'desc')
      .firstOrFail()

    return rate.rate
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount
    const rate = await this.getCurrentRate(from, to)
    return amount * rate
  }

  async convertWithLock(
    amount: number,
    from: string,
    to: string
  ): Promise<{ amount: number; rate: number; lockedAt: Date }> {
    if (from === to) {
      return { amount, rate: 1, lockedAt: new Date() }
    }
    const rate = await this.getCurrentRate(from, to)
    return {
      amount: amount * rate,
      rate,
      lockedAt: new Date(),
    }
  }

  format(amount: number, currency: 'CDF' | 'USD'): string {
    if (currency === 'CDF') {
      const formatted = new Intl.NumberFormat('fr-CD').format(Math.round(amount))
      return `${formatted} FC`
    }
    return `$${amount.toFixed(2)}`
  }

  formatDual(amountCdf: number, amountUsd?: number | null): string {
    const cdfStr = this.format(amountCdf, 'CDF')
    if (amountUsd != null) {
      return `${cdfStr} (~${this.format(amountUsd, 'USD')})`
    }
    return cdfStr
  }
}

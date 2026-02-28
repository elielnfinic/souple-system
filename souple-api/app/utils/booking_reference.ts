import { randomInt } from 'node:crypto'

export function generateReference(): string {
  const year = new Date().getFullYear()
  const random = randomInt(0, 1_000_000).toString().padStart(6, '0')
  return `BK-${year}-${random}`
}

import { randomInt } from 'node:crypto'

export function generateReference(prefix: string): string {
  const year = new Date().getFullYear()
  const num = randomInt(0, 999999).toString().padStart(6, '0')
  return `${prefix}-${year}-${num}`
}
